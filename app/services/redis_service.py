import redis
import json
import os
from typing import Optional, List, Dict, Tuple
from config.settings import get_settings

settings = get_settings()


class RedisService:
    def __init__(self):
        self.client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True,
        )

    def create_session(
        self, session_id: str, patient_id: str, ttl: int = 86400
    ):
        """Create a session with metadata"""
        session_key = f"session:{session_id}"
        session_data = {
            "patient_id": patient_id,
            "created_at": str(self.client.time()[0]),
            "active": "true",
        }
        self.client.hset(session_key, mapping=session_data)
        self.client.expire(session_key, ttl)

    def session_exists(self, session_id: str) -> bool:
        """Check if session exists"""
        return self.client.exists(f"session:{session_id}") > 0

    def add_message(
        self,
        session_id: str,
        message: Dict,
        embedding: Optional[List[float]] = None,
    ):
        """Add message to session history with optional embedding"""
        messages_key = f"messages:{session_id}"

        # Store message with embedding if provided
        message_data = message.copy()
        if embedding:
            message_data["embedding"] = embedding
            print(
                f"[REDIS ADD] Storing message with embedding (dim={len(embedding)}) for session: {session_id}"
            )
        else:
            print(
                f"[REDIS ADD] Storing message WITHOUT embedding for session: {session_id}"
            )

        self.client.rpush(messages_key, json.dumps(message_data))
        self.client.expire(messages_key, 86400)  # 24 hour expiry

    def get_messages(self, session_id: str, limit: int = 50) -> List[Dict]:
        """Get recent messages from session"""
        messages_key = f"messages:{session_id}"
        messages = self.client.lrange(messages_key, -limit, -1)
        return [json.loads(msg) for msg in messages]

    def delete_session(self, session_id: str):
        """Delete session and associated data"""
        self.client.delete(f"session:{session_id}")
        self.client.delete(f"messages:{session_id}")

    def get_session_metadata(self, session_id: str) -> Optional[Dict]:
        """Get session metadata"""
        session_key = f"session:{session_id}"
        if not self.client.exists(session_key):
            return None
        return self.client.hgetall(session_key)

    def set_cache(self, key: str, value: str, ttl: int = 3600):
        """Set cache with TTL"""
        self.client.setex(key, ttl, value)

    def get_cache(self, key: str) -> Optional[str]:
        """Get cached value"""
        return self.client.get(key)

    def delete_cache(self, key: str):
        """Delete cached value"""
        self.client.delete(key)

    def search_similar_messages(
        self, session_id: str, query_embedding: List[float], top_k: int = 5
    ) -> List[Dict]:
        """Search for similar messages ONLY in the current session using cosine similarity"""
        # This ONLY gets messages from the current session_id
        # Redis key: messages:{session_id} ensures complete isolation
        messages = self.get_messages(session_id, limit=100)

        print(
            f"[REDIS VECTOR SEARCH] Searching ONLY in session: {session_id}, Total messages in THIS session: {len(messages)}"
        )

        if not messages or not query_embedding:
            print(f"[REDIS VECTOR SEARCH] No messages or no query embedding")
            return []

        # Calculate similarity scores for messages with embeddings
        scored_messages = []
        for msg in messages:
            if "embedding" in msg and msg["embedding"]:
                similarity = self._cosine_similarity(
                    query_embedding, msg["embedding"]
                )
                scored_messages.append(
                    {
                        "message": msg["message"],
                        "sender": msg["sender"],
                        "similarity": similarity,
                        "timestamp": msg.get("timestamp", ""),
                        "id": msg.get("id", ""),
                    }
                )

        print(
            f"[REDIS VECTOR SEARCH] Messages with embeddings: {len(scored_messages)}"
        )

        # Sort by similarity (highest first) and return top_k
        scored_messages.sort(key=lambda x: x["similarity"], reverse=True)
        results = scored_messages[:top_k]

        print(f"[REDIS VECTOR SEARCH] Returning top {len(results)} results")
        for i, result in enumerate(results, 1):
            print(
                f"  {i}. Similarity: {result['similarity']:.4f} - {result['message'][:50]}..."
            )

        return results

    def _cosine_similarity(
        self, vec1: List[float], vec2: List[float]
    ) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            dot_product = sum(a * b for a, b in zip(vec1, vec2))
            magnitude1 = sum(a * a for a in vec1) ** 0.5
            magnitude2 = sum(b * b for b in vec2) ** 0.5
            return (
                dot_product / (magnitude1 * magnitude2)
                if magnitude1 and magnitude2
                else 0.0
            )
        except Exception:
            return 0.0
