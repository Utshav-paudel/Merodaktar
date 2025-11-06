import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PaperAirplaneIcon, MicrophoneIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import axios from "axios";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Add welcome message
    setMessages([{
      id: '1',
      text: "Hello! I'm your AI medical assistant. Please describe your symptoms or health concerns, and I'll provide preliminary guidance. Remember, this is not a replacement for professional medical advice.",
      sender: 'ai',
      timestamp: new Date()
    }]);
  }, []);

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
      const response = await fetch('/api/medical/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            message: inputMessage,
            language: 'en'  // or 'ne' for Nepali
        })
        });

      if (response.ok) {
        const data = await response.json();
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: 'ai',
          timestamp: new Date(),
          urgency: data.urgency_level
        };

        setMessages(prev => [...prev, aiMessage]);
        
        // Speak the response if voice is enabled
        if (voiceEnabled) {
          speakText(data.response);
        }
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
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      //  Start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.wav");

        try {
          setIsLoading(true);
          //  Send to ASR service
          const response = await axios.post(
            "http://localhost:8000/api/speech/transcribe",
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );

          const transcript = response.data.transcription || "Couldn't transcribe audio.";

          // Add transcription as user message
          const userMessage: Message = {
            id: Date.now().toString(),
            text: transcript,
            sender: "user",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, userMessage]);

          //  Send transcription to chat API
          const chatResponse = await fetch("/api/medical/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ message: transcript, language: "en" }),
          });

          if (chatResponse.ok) {
            const data = await chatResponse.json();
            const aiMessage: Message = {
              id: (Date.now() + 1).toString(),
              text: data.response,
              sender: "ai",
              timestamp: new Date(),
              urgency: data.urgency_level,
            };
            setMessages((prev) => [...prev, aiMessage]);

            if (voiceEnabled) speakText(data.response);
          } else {
            throw new Error("Failed to get AI response");
          }
        } catch (error) {
          console.error("Voice input error:", error);
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              text: " Sorry, I couldn't process your voice input.",
              sender: "ai",
              timestamp: new Date(),
            },
          ]);
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access error:", error);
      alert("Microphone access denied or not supported.");
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow border-b-4 border-blue-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="mr-2 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <img 
                src="/mero-daktar-logo.png" 
                alt="MeroDaktar Logo" 
                className="h-10 w-10"
              />
              <div>
                <h1 className="text-xl font-bold text-blue-600">AI Medical Chat</h1>
                <p className="text-xs text-gray-500">Powered by MeroDaktar AI</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleVoice}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition ${
                  voiceEnabled 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={voiceEnabled ? 'Voice ON - AI will speak' : 'Voice OFF'}
              >
                {voiceEnabled ? (
                  <>
                    <SpeakerWaveIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">🎙️ Voice ON</span>
                  </>
                ) : (
                  <>
                    <SpeakerXMarkIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Voice OFF</span>
                  </>
                )}
              </button>
              <div className="text-sm text-gray-500">
                {user?.full_name}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg h-[calc(100vh-200px)] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                  {message.urgency && (
                    <p className={`text-xs mt-2 ${
                      message.sender === 'user' ? 'text-blue-100' : 
                      message.urgency === 'emergency' ? 'text-red-600 font-bold' :
                      message.urgency === 'moderate' ? 'text-yellow-600 font-medium' :
                      'text-green-600'
                    }`}>
                      Urgency Level: {message.urgency.toUpperCase()}
                    </p>
                  )}
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
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <button
                onClick={handleVoiceInput}
                className={`p-2 rounded-lg transition ${
                  isRecording
                    ? "bg-red-500 text-white animate-pulse"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                title={isRecording ? "Stop Recording" : "Start Voice Input"}
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
                  title="Stop speaking"
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
              {voiceEnabled && <span className="text-green-600 font-medium">🔊 Voice mode enabled - AI responses will be spoken. </span>}
              This is not a replacement for professional medical advice. Always consult a healthcare provider.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalChat;