import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  PaperAirplaneIcon, 
  MicrophoneIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  TrashIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

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

// Helper function to convert AudioBuffer to WAV format
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

// Convert WebM to WAV
const convertWebMToWav = async (webmBlob: Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const fileReader = new FileReader();

    fileReader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Convert to WAV
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

const MedicalChatWithHistory: React.FC<MedicalChatProps> = ({ token, user, onLogout }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
        
        await loadConversations();
        return data.session_id;
      }
    } catch (error) {
      console.error('Failed to create chat session:', error);
    }
    return null;
  };

  const loadConversation = async (session_id: string) => {
    setIsLoadingHistory(true);
    try {
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
        await loadConversations();
        
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

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

  const handleVoiceInput = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
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

          // Add transcription as user message
          const userMessage: Message = {
            id: Date.now().toString(),
            text: transcript,
            sender: 'user',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, userMessage]);

          // Ensure session exists
          let currentSession = sessionId;
          if (!currentSession) {
            currentSession = await createNewChat();
          }

          // Send to chat session
          if (currentSession) {
            const chatResponse = await fetch(
              `http://localhost:8000/api/v1/chat/session/${currentSession}/message`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: transcript, sender: 'user' })
              }
            );

            if (chatResponse.ok) {
              const data = await chatResponse.json();
              if (data.ai_response) {
                const aiMessage: Message = {
                  id: data.ai_response.id,
                  text: data.ai_response.message,
                  sender: 'ai',
                  timestamp: new Date(data.ai_response.timestamp)
                };
                setMessages(prev => [...prev, aiMessage]);
                if (voiceEnabled) speakText(aiMessage.text);
              }
              
              await loadConversations();
            } else {
              throw new Error('Failed to get AI response');
            }
          }

        } catch (error) {
          console.error('Voice input error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            text: `Sorry, I couldn't process your voice input. ${errorMessage}`,
            sender: 'ai',
            timestamp: new Date()
          }]);
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
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 shadow-lg flex flex-col`}>
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-600 flex-shrink-0">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center space-x-2 bg-white text-blue-600 hover:bg-blue-50 px-4 py-3 rounded-lg font-semibold transition shadow-sm"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Conversation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No conversations yet</p>
              <p className="text-gray-400 text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv.session_id)}
                className={`group p-3 rounded-lg cursor-pointer transition relative border ${
                  conv.session_id === sessionId
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <ChatBubbleLeftRightIcon className={`h-4 w-4 flex-shrink-0 ${
                        conv.session_id === sessionId ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                      <p className={`text-sm font-medium truncate ${
                        conv.session_id === sessionId ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {conv.conversation_title || 'New Conversation'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {formatDate(conv.consultation_date)} • {conv.total_messages} message{conv.total_messages !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.session_id, e)}
                    className="opacity-0 group-hover:opacity-100 transition ml-2 text-gray-400 hover:text-red-500"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500">Patient</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 py-2 rounded-lg transition font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-lg transition"
                >
                  {sidebarOpen ? (
                    <XMarkIcon className="h-6 w-6" />
                  ) : (
                    <Bars3Icon className="h-6 w-6" />
                  )}
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-lg transition"
                >
                  <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">M</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    AI Medical Assistant
                  </h1>
                  <p className="text-xs text-gray-500">Powered by MeroDaktar</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleVoice}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition shadow-sm border ${
                    voiceEnabled 
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {voiceEnabled ? (
                    <>
                      <SpeakerWaveIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">Voice ON</span>
                    </>
                  ) : (
                    <>
                      <SpeakerXMarkIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">Voice OFF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Container */}
        {isLoadingHistory ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading conversation...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-6">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Start a New Conversation</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Chat with our AI medical assistant about your health concerns. Get preliminary guidance and recommendations.
              </p>
              <button
                onClick={createNewChat}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Start New Chat</span>
              </button>
              <p className="text-xs text-gray-500 mt-6">
                💡 This is not a replacement for professional medical advice
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-4 flex-shrink-0 bg-white">
              <div className="flex space-x-2">
                <button
                  onClick={handleVoiceInput}
                  className={`p-2 rounded-lg transition ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
                >
                  <MicrophoneIcon className="h-6 w-6" />
                </button>

                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Describe your symptoms..."
                  className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 animate-pulse"
                  >
                    <SpeakerXMarkIcon className="h-6 w-6" />
                  </button>
                )}
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="h-6 w-6" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                This is not a replacement for professional medical advice.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalChatWithHistory;
