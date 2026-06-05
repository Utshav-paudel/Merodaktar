"""
Unified AI provider abstraction.

Routes chat completions and embeddings to the engine selected by
settings.AI_BACKEND ("gemini" | "openai" | "medgemma"). Clients are created
lazily and guarded so the app boots even when a given provider's API key is
absent (e.g. a Gemini-only deployment with no OpenAI key).

- generate_chat(messages, ...) accepts OpenAI-style messages
  ([{"role": "system"|"user"|"assistant", "content": "..."}]) so existing
  call sites need no restructuring.
- generate_embedding(text) returns a vector, or [] if embeddings are
  unavailable (semantic search then degrades gracefully).
"""

import logging
from typing import Dict, List

from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_openai_client = None
_gemini_client = None


def _backend() -> str:
    return getattr(settings, "AI_BACKEND", "openai").lower()


def _get_openai():
    """Lazily create the OpenAI client; None if no key configured."""
    global _openai_client
    if _openai_client is None and settings.OPENAI_API_KEY:
        try:
            from openai import OpenAI

            _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        except Exception as e:  # pragma: no cover - defensive
            logger.error(f"Failed to initialise OpenAI client: {e}")
            _openai_client = None
    return _openai_client


def _get_gemini():
    """Lazily create the Gemini (google-genai) client; None if no key configured."""
    global _gemini_client
    if _gemini_client is None and settings.GEMINI_API_KEY:
        try:
            from google import genai

            _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
        except Exception as e:  # pragma: no cover - defensive
            logger.error(f"Failed to initialise Gemini client: {e}")
            _gemini_client = None
    return _gemini_client


def _split_messages(messages: List[Dict]) -> tuple[str, str]:
    """Split OpenAI-style messages into (system_text, conversation_text)."""
    system = "\n\n".join(
        m["content"] for m in messages if m.get("role") == "system" and m.get("content")
    )
    convo = "\n\n".join(
        m["content"] for m in messages if m.get("role") != "system" and m.get("content")
    )
    return system, convo


def generate_chat(
    messages: List[Dict],
    temperature: float = 0.7,
    max_tokens: int = 500,
    model: str = "gpt-4o-mini",
) -> str:
    """Generate a chat completion using the configured backend.

    Gemini is used when AI_BACKEND == "gemini" (with OpenAI as a fallback only
    if a key is present). Otherwise the OpenAI path is used unchanged.
    """
    if _backend() == "gemini":
        client = _get_gemini()
        if client:
            system, convo = _split_messages(messages)
            gemini_model = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash")
            try:
                from google.genai import types

                cfg = types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                    system_instruction=system or None,
                )
                resp = client.models.generate_content(
                    model=gemini_model,
                    contents=convo or system or "Hello",
                    config=cfg,
                )
            except Exception as e:
                logger.warning(
                    f"Gemini config path failed ({e}); retrying with inline system prompt"
                )
                prompt = (f"{system}\n\n{convo}").strip() if system else convo
                resp = client.models.generate_content(
                    model=gemini_model, contents=prompt or "Hello"
                )
            text = getattr(resp, "text", None)
            if text:
                return text.strip()
            logger.warning("Gemini returned an empty response; falling back if possible")

    # OpenAI (primary backend, or fallback when Gemini is unavailable)
    client = _get_openai()
    if client:
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content

    raise RuntimeError(
        "No AI chat backend available. Set AI_BACKEND and the matching API key "
        "(GEMINI_API_KEY for gemini, OPENAI_API_KEY for openai) in app/.env."
    )


def generate_embedding(text: str) -> List[float]:
    """Return an embedding vector for text, or [] if unavailable."""
    if _backend() == "gemini":
        client = _get_gemini()
        if not client:
            return []
        try:
            try:
                resp = client.models.embed_content(
                    model="gemini-embedding-001", contents=text
                )
            except TypeError:
                resp = client.models.embed_content(
                    model="gemini-embedding-001", content=text
                )
            embeddings = getattr(resp, "embeddings", None)
            if embeddings:
                values = getattr(embeddings[0], "values", None)
                if values:
                    return list(values)
            single = getattr(resp, "embedding", None)
            if single is not None and getattr(single, "values", None):
                return list(single.values)
        except Exception as e:
            logger.warning(f"Gemini embeddings unavailable; semantic search disabled: {e}")
        return []

    client = _get_openai()
    if not client:
        return []
    try:
        resp = client.embeddings.create(model="text-embedding-3-small", input=text)
        return resp.data[0].embedding
    except Exception as e:
        logger.error(f"OpenAI embedding error: {e}")
        return []
