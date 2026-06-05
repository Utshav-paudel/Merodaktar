import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  TrashIcon,
  Bars3Icon,
  XMarkIcon,
  ClipboardDocumentListIcon,
  MicrophoneIcon,
  SparklesIcon,
  StopIcon,
} from '@heroicons/react/24/outline';
import { Button, IconButton, Badge, Spinner, Avatar, EmptyState, ChatMarkdown, cn } from '../lib/ui';
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

interface Conversation {
  id: string;
  session_id: string;
  consultation_date: string;
  conversation_title?: string;
  is_active: boolean;
  total_messages: number;
}

const MedicalChatWithHistory: React.FC<MedicalChatProps> = ({ token, user, onLogout }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Symptom Interview Mode
  const [symptomInterviewMode, setSymptomInterviewMode] = useState(false);
  const [reportId, setReportId] = useState<string>('');
  const [questionNumber, setQuestionNumber] = useState<number>(0);

  // Voice Recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load user's consultations
    loadConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/chat/my-consultations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const createNewChat = async () => {
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
        setMessages([{
          id: '1',
          text: "Hello! I'm your AI medical assistant. Please describe your symptoms or health concerns, and I'll provide preliminary guidance. Remember, this is not a replacement for professional medical advice.",
          sender: 'ai',
          timestamp: new Date()
        }]);

        // Reload conversations
        await loadConversations();
      }
    } catch (error) {
      console.error('Failed to create chat session:', error);
    }
  };

  const loadConversation = async (session_id: string) => {
    setIsLoadingHistory(true);
    try {
      // Get session history
      const response = await fetch(
        `http://localhost:8000/api/v1/chat/session/${session_id}/history?limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const history = await response.json();
        const loadedMessages: Message[] = history.map((msg: any) => ({
          id: msg.id,
          text: msg.message,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp)
        }));

        setMessages(loadedMessages);
        setSessionId(session_id);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const deleteConversation = async (session_id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/chat/session/${session_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        // Reload conversations
        await loadConversations();

        // If deleted conversation was active, clear messages
        if (session_id === sessionId) {
          setMessages([]);
          setSessionId(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    if (!newState) stopSpeaking();
  };

  // Audio conversion helper functions
  const audioBufferToWav = (audioBuffer: AudioBuffer): ArrayBuffer => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = new Float32Array(audioBuffer.length * numberOfChannels);
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < audioBuffer.length; i++) {
        data[i * numberOfChannels + channel] = channelData[i];
      }
    }

    const dataLength = data.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    const volume = 0.8;
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF * volume, true);
      offset += 2;
    }

    return buffer;
  };

  const convertWebMToWav = async (webmBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();

      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const wavBuffer = audioBufferToWav(audioBuffer);
          const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
          resolve(wavBlob);
        } catch (error) {
          reject(error);
        }
      };

      fileReader.onerror = () => reject(new Error('Failed to read audio file'));
      fileReader.readAsArrayBuffer(webmBlob);
    });
  };

  // Voice Input Handler
  const handleVoiceInput = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      // Start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm;codecs=opus'
        });

        try {
          setIsLoading(true);

          // Convert WebM to WAV
          console.log('Converting WebM to WAV...');
          const wavBlob = await convertWebMToWav(webmBlob);
          console.log('Conversion complete. WAV size:', wavBlob.size);

          const formData = new FormData();
          formData.append('audio', wavBlob, 'recording.wav');

          // Send to ASR endpoint
          const asrResponse = await fetch('http://localhost:8000/api/v1/speech/transcribe', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (!asrResponse.ok) {
            const errorData = await asrResponse.json().catch(() => ({ detail: 'ASR service failed' }));
            throw new Error(errorData.detail || 'ASR service failed');
          }

          const asrData = await asrResponse.json();
          const transcript = asrData.transcription || "Couldn't transcribe audio.";

          // Set the transcription in the input field
          setInputMessage(transcript);

        } catch (error) {
          console.error('Voice input error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert(`Sorry, I couldn't process your voice input. ${errorMessage}`);
        } finally {
          setIsLoading(false);
          // Stop all tracks to release microphone
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access error:', error);
      alert('Microphone access denied or not supported.');
    }
  };

  // Symptom Interview Functions
  const startSymptomInterview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/reports/symptom-interview/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReportId(data.report_id);
        setQuestionNumber(data.question_number);
        setSymptomInterviewMode(true);

        // Add question as AI message
        const aiMessage: Message = {
          id: Date.now().toString(),
          text: `🏥 **Symptom Assessment Started** (Question ${data.question_number})\n\n${data.question}`,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages([aiMessage]);

        if (voiceEnabled) {
          speakText(data.question);
        }
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Sorry, I couldn\'t start the symptom interview. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const submitSymptomAnswer = async () => {
    if (!inputMessage.trim()) return;

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
      const response = await fetch(
        `http://localhost:8000/api/v1/reports/symptom-interview/${reportId}/answer`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ answer: inputMessage })
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.is_complete) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: '✅ **Symptom Assessment Complete!**\n\nThank you for completing the assessment. Your preliminary report has been generated and is available in your dashboard.',
            sender: 'ai',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          setSymptomInterviewMode(false);

          if (voiceEnabled) {
            speakText('Assessment complete. Your report has been generated.');
          }
        } else {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `📋 **Question ${data.question_number}**\n\n${data.question}`,
            sender: 'ai',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          setQuestionNumber(data.question_number);

          if (voiceEnabled) {
            speakText(data.question);
          }
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, there was an error processing your answer. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const exitSymptomInterview = () => {
    setSymptomInterviewMode(false);
    setReportId('');
    setQuestionNumber(0);
    setMessages([]);
  };

  const handleSendMessage = async () => {
    // If in symptom interview mode, use symptom interview logic
    if (symptomInterviewMode) {
      await submitSymptomAnswer();
      return;
    }

    // Regular chat logic
    if (!inputMessage.trim()) return;

    // Create new session if none exists
    if (!sessionId) {
      await createNewChat();
      return;
    }

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
      const response = await fetch(
        `http://localhost:8000/api/v1/chat/session/${sessionId}/message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            message: inputMessage,
            sender: 'user'
          })
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.ai_response) {
          const aiMessage: Message = {
            id: data.ai_response.id,
            text: data.ai_response.message,
            sender: 'ai',
            timestamp: new Date(data.ai_response.timestamp)
          };

          setMessages(prev => [...prev, aiMessage]);

          if (voiceEnabled) {
            speakText(aiMessage.text);
          }
        }

        // Reload conversations to update message count
        await loadConversations();
      } else if (response.status === 401) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Your session has expired. Please log in again.',
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <AppLayout
      role="patient"
      user={user}
      onLogout={onLogout}
      title="AI Consultation"
      fullBleed
      actions={
        <>
          {!symptomInterviewMode ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={startSymptomInterview}
              leftIcon={<ClipboardDocumentListIcon className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">Symptom Assessment</span>
              <span className="sm:hidden">Assess</span>
            </Button>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={exitSymptomInterview}
              leftIcon={<XMarkIcon className="h-4 w-4" />}
            >
              Exit Assessment
            </Button>
          )}
          <IconButton
            label={voiceEnabled ? 'Voice on' : 'Voice off'}
            onClick={toggleVoice}
            className={cn(
              voiceEnabled
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100'
                : ''
            )}
          >
            {voiceEnabled ? (
              <SpeakerWaveIcon className="h-5 w-5" />
            ) : (
              <SpeakerXMarkIcon className="h-5 w-5" />
            )}
          </IconButton>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* History sidebar */}
        <aside
          className={cn(
            'flex min-h-0 flex-col border-r border-slate-200 bg-slate-50 transition-all duration-300',
            sidebarOpen ? 'w-72' : 'w-0 overflow-hidden border-r-0'
          )}
        >
          <div className="flex-shrink-0 border-b border-slate-200 p-3">
            <Button
              variant="primary"
              fullWidth
              onClick={createNewChat}
              leftIcon={<PlusIcon className="h-5 w-5" />}
            >
              New Conversation
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {conversations.length === 0 ? (
              <div className="px-3 py-10 text-center">
                <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <ChatBubbleLeftRightIcon className="h-6 w-6" />
                </span>
                <p className="text-sm font-medium text-slate-600">No conversations yet</p>
                <p className="mt-1 text-xs text-slate-400">Start a new chat to begin</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const active = conv.session_id === sessionId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.session_id)}
                    className={cn(
                      'group relative cursor-pointer rounded-xl border p-3 transition',
                      active
                        ? 'border-brand-200 bg-brand-50 shadow-soft'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <ChatBubbleLeftRightIcon
                            className={cn(
                              'h-4 w-4 flex-shrink-0',
                              active ? 'text-brand-700' : 'text-slate-400'
                            )}
                          />
                          <p
                            className={cn(
                              'truncate text-sm font-medium',
                              active ? 'text-slate-900' : 'text-slate-600'
                            )}
                          >
                            {conv.conversation_title || 'New Conversation'}
                          </p>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400">
                          {formatDate(conv.consultation_date)} · {conv.total_messages} message
                          {conv.total_messages !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(conv.session_id, e)}
                        className="ml-1 rounded-lg p-1 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                        aria-label="Delete conversation"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex-shrink-0 border-t border-slate-200 p-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <Avatar name={user?.full_name} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user?.full_name || 'Patient'}
                </p>
                <p className="text-xs text-slate-400">Patient</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Chat thread */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col animate-fade-in-up">
          {/* Thread toolbar */}
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
            <IconButton
              label={sidebarOpen ? 'Hide history' : 'Show history'}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-9 w-9"
            >
              {sidebarOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
            </IconButton>
            <IconButton
              label="Back to dashboard"
              onClick={() => navigate('/dashboard')}
              className="h-9 w-9"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </IconButton>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow">
                <SparklesIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-slate-900">
                  AI Medical Assistant
                </p>
                <p className="truncate text-[11px] text-slate-400">Powered by MeroDaktar</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {symptomInterviewMode && (
                <Badge tone="sky">
                  <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
                  Assessment · Q{questionNumber}
                </Badge>
              )}
              {voiceEnabled && (
                <Badge tone="emerald">
                  <SpeakerWaveIcon className="h-3.5 w-3.5" />
                  Voice on
                </Badge>
              )}
            </div>
          </div>

          {/* Body */}
          {isLoadingHistory ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <Spinner className="mx-auto h-10 w-10 text-brand-600" />
                <p className="mt-4 text-sm font-medium text-slate-500">Loading conversation...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="w-full max-w-md">
                <EmptyState
                  icon={<ChatBubbleLeftRightIcon className="h-7 w-7" />}
                  title="Start a new conversation"
                  description="Chat with our AI medical assistant about your health concerns. Get preliminary guidance and recommendations."
                  action={
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={createNewChat}
                      leftIcon={<PlusIcon className="h-5 w-5" />}
                    >
                      Start New Chat
                    </Button>
                  }
                />
                <p className="mt-5 text-center text-xs text-slate-400">
                  💡 This is not a replacement for professional medical advice
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
              {/* Messages */}
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-6">
                {messages.map((message) => {
                  const isUser = message.sender === 'user';
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'flex animate-fade-in-up gap-3',
                        isUser ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {!isUser && (
                        <span className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow">
                          <SparklesIcon className="h-4 w-4" />
                        </span>
                      )}
                      <div
                        className={cn(
                          'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-soft',
                          isUser
                            ? 'rounded-br-sm bg-gradient-brand text-white'
                            : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700'
                        )}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{message.text}</p>
                        ) : (
                          <ChatMarkdown>{message.text}</ChatMarkdown>
                        )}
                        <p
                          className={cn(
                            'mt-1.5 text-[11px]',
                            isUser ? 'text-white/70' : 'text-slate-400'
                          )}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      {isUser && (
                        <Avatar name={user?.full_name} className="mt-0.5 h-8 w-8 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
                {isLoading && (
                  <div className="flex justify-start gap-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow">
                      <SparklesIcon className="h-4 w-4" />
                    </span>
                    <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3.5">
                      <div className="flex gap-1.5">
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

              {/* Composer */}
              <div className="sticky bottom-0 flex-shrink-0 border-t border-slate-200 bg-white px-4 py-4">
                {symptomInterviewMode && (
                  <div className="mb-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-accent-700">
                    <ClipboardDocumentListIcon className="h-4 w-4" />
                    Symptom Assessment in Progress · Question {questionNumber}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <IconButton
                    label={isRecording ? 'Stop recording' : 'Start voice input'}
                    onClick={handleVoiceInput}
                    disabled={isLoading}
                    className={cn(
                      isRecording
                        ? 'animate-pulse bg-rose-500 text-white hover:bg-rose-500'
                        : ''
                    )}
                  >
                    <MicrophoneIcon className="h-5 w-5" />
                  </IconButton>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={symptomInterviewMode ? 'Type your answer...' : 'Describe your symptoms...'}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                    disabled={isLoading}
                  />
                  {isSpeaking && (
                    <IconButton
                      label="Stop speaking"
                      onClick={stopSpeaking}
                      className="animate-pulse bg-rose-500 text-white hover:bg-rose-500"
                    >
                      <StopIcon className="h-5 w-5" />
                    </IconButton>
                  )}
                  <IconButton
                    label="Send message"
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="bg-gradient-brand text-white shadow-glow hover:brightness-110 disabled:opacity-50"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </IconButton>
                </div>
                <p className="mt-2.5 text-center text-[11px] text-slate-400">
                  This is not a replacement for professional medical advice.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

export default MedicalChatWithHistory;
