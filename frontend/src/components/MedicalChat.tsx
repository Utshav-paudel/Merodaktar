import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PaperAirplaneIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { Button, IconButton, Badge, Avatar, Spinner, ChatMarkdown, cn } from '../lib/ui';
import AppLayout from './layout/AppLayout';

interface MedicalChatProps {
  token: string;
  user: any;
  onLogout: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  urgency?: string;
}

const MedicalChat: React.FC<MedicalChatProps> = ({ token, user, onLogout }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create chat session
    createChatSession();
  }, []);

  const createChatSession = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/chat/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ language: 'en' })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.session_id);

        // Add welcome message
        setMessages([{
          id: '1',
          text: "Hello! I'm your AI medical assistant. Please describe your symptoms or health concerns, and I'll provide preliminary guidance. Remember, this is not a replacement for professional medical advice.",
          sender: 'ai',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Failed to create chat session:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const speakText = (text: string) => {
    if (!voiceEnabled) return;

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    if (!newState) {
      stopSpeaking();
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:8000/api/v1/chat/session/${sessionId}/message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            message: inputMessage,
            sender: 'user'
        })
        });

      if (response.ok) {
        const data = await response.json();

        // Use the actual AI response from the backend
        if (data.ai_response) {
          const aiMessage: Message = {
            id: data.ai_response.id,
            text: data.ai_response.message,
            sender: 'ai',
            timestamp: new Date(data.ai_response.timestamp)
          };

          setMessages(prev => [...prev, aiMessage]);

          // Speak the response if voice is enabled
          if (voiceEnabled) {
            speakText(aiMessage.text);
          }
        }
      } else if (response.status === 401) {
        // Handle authentication error
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Your session has expired. Please log in again.',
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        // Optionally redirect to login after a delay
        setTimeout(() => onLogout(), 2000);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    // Placeholder for voice input
    console.log('Voice input implementation needed');
    alert('Voice input will be implemented in the next version');
  };

  return (
    <AppLayout
      role="patient"
      user={user}
      onLogout={onLogout}
      title="AI Chat"
      fullBleed
      actions={
        <button
          onClick={toggleVoice}
          title={voiceEnabled ? 'Voice ON - AI will speak' : 'Voice OFF'}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
            voiceEnabled
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
          )}
        >
          {voiceEnabled ? (
            <>
              <SpeakerWaveIcon className="h-4 w-4" />
              <span>Voice ON</span>
            </>
          ) : (
            <>
              <SpeakerXMarkIcon className="h-4 w-4" />
              <span>Voice OFF</span>
            </>
          )}
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col animate-fade-in-up">
        {/* Intro / context bar */}
        <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow-sm">
              <SparklesIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold text-slate-900">AI Medical Assistant</h2>
                <Badge tone="brand">
                  <SparklesIcon className="h-3 w-3" />
                  Powered by MeroDaktar
                </Badge>
                {voiceEnabled && (
                  <Badge tone="emerald">
                    <SpeakerWaveIcon className="h-3 w-3" />
                    Voice mode
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                Describe your symptoms for preliminary guidance, {user?.full_name || 'there'}.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => navigate('/dashboard')}
            >
              Back to dashboard
            </Button>
          </div>
        </div>

        {/* Chat surface */}
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-10">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            {/* Messages */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {messages.map((message) => {
                const isUser = message.sender === 'user';
                return (
                  <div
                    key={message.id}
                    className={cn('flex animate-fade-in-up gap-3', isUser ? 'justify-end' : 'justify-start')}
                  >
                    {!isUser && (
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow-sm">
                        <SparklesIcon className="h-5 w-5" />
                      </span>
                    )}
                    <div
                      className={cn(
                        'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                        isUser
                          ? 'rounded-br-md bg-gradient-brand text-white'
                          : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
                      )}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      ) : (
                        <ChatMarkdown>{message.text}</ChatMarkdown>
                      )}
                      {message.urgency && (
                        <p
                          className={cn(
                            'mt-2 text-xs font-semibold uppercase tracking-wide',
                            isUser
                              ? 'text-white/80'
                              : message.urgency === 'emergency'
                                ? 'text-rose-600'
                                : message.urgency === 'moderate'
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                          )}
                        >
                          Urgency Level: {message.urgency.toUpperCase()}
                        </p>
                      )}
                      <p className={cn('mt-1.5 text-[11px]', isUser ? 'text-white/70' : 'text-slate-400')}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {isUser && (
                      <Avatar name={user?.full_name} className="mt-0.5 h-9 w-9 shrink-0" />
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex animate-fade-in justify-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow-sm">
                    <SparklesIcon className="h-5 w-5" />
                  </span>
                  <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400" />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-brand-400"
                        style={{ animationDelay: '0.15s' }}
                      />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-brand-400"
                        style={{ animationDelay: '0.3s' }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <IconButton
                  label="Voice input (coming soon)"
                  onClick={handleVoiceInput}
                  className="shrink-0"
                >
                  <MicrophoneIcon className="h-5 w-5" />
                </IconButton>
                <div className="relative flex-1">
                  <ChatBubbleLeftRightIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Describe your symptoms..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 transition placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                    disabled={isLoading}
                  />
                </div>
                {isSpeaking && (
                  <Button
                    variant="danger"
                    onClick={stopSpeaking}
                    title="Stop speaking"
                    className="shrink-0 animate-pulse px-3"
                    leftIcon={<SpeakerXMarkIcon className="h-5 w-5" />}
                  >
                    Stop
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="shrink-0 px-4"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Spinner className="h-5 w-5" />
                  ) : (
                    <PaperAirplaneIcon className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
                <ShieldCheckIcon className="h-4 w-4 shrink-0 text-slate-400" />
                {voiceEnabled && (
                  <span className="font-medium text-emerald-600">
                    Voice mode enabled - AI responses will be spoken.{' '}
                  </span>
                )}
                This is not a replacement for professional medical advice. Always consult a healthcare provider.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MedicalChat;
