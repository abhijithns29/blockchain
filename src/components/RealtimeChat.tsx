import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import io, { Socket } from 'socket.io-client';

interface Message {
  _id: string;
  sender: string;
  message: string;
  messageType: string;
  timestamp: Date;
  isRead: boolean;
}

interface Chat {
  _id: string;
  landId: string;
  buyer: any;
  seller: any;
  messages: Message[];
  currentOffer?: any;
  status: string;
}

interface RealtimeChatProps {
  chatId?: string;
  landId?: string;
  recipientId?: string;
  recipientName?: string;
  onClose?: () => void;
}

const RealtimeChat: React.FC<RealtimeChatProps> = ({
  chatId,
  landId,
  recipientId,
  recipientName,
  onClose
}) => {
  const { auth } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializeSocket();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (socket && chat) {
      joinChatRoom();
    }
  }, [socket, chat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSocket = () => {
    const newSocket = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from chat server');
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message);
    });

    newSocket.on('new-message', (data) => {
      setMessages(prev => [...prev, data.message]);
    });

    newSocket.on('user-typing', (data) => {
      if (data.userId !== auth.user?.id) {
        setOtherUserTyping(data.isTyping);
      }
    });

    setSocket(newSocket);
  };

  const joinChatRoom = () => {
    if (socket && chat) {
      const chatId = chat._id;
      if (chatId) {
        socket.emit('join-chat', {
          chatId: chatId,
          userId: auth.user?.id
        });
      }
    }
  };

  const loadChat = async () => {
    try {
      setLoading(true);
      let chatData;

      if (chatId) {
        // Load existing chat
        console.log('Loading existing chat:', chatId);
        chatData = await apiService.getChat(chatId);
      } else if (landId) {
        // Start new chat - only need landId, recipientId is optional
        console.log('Starting chat for landId:', landId);
        chatData = await apiService.startChat(landId);
      }

      console.log('Chat data received:', chatData);

      if (chatData && chatData.chat) {
        console.log('Chat object structure:', chatData.chat);
        console.log('Chat ID:', chatData.chat._id);
        setChat(chatData.chat);
        setMessages(chatData.chat.messages || []);
      } else {
        setError('No chat data received');
      }
    } catch (error: any) {
      console.error('Load chat error:', error);
      setError(error.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChat();
  }, [chatId, landId, recipientId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !socket || !chat) return;

    const chatId = chat._id;
    if (!chatId) {
      setError('Chat ID is missing');
      return;
    }

    try {
      console.log('Sending message to chat:', chatId);
      socket.emit('send-message', {
        chatId: chatId,
        userId: auth.user?.id,
        message: newMessage.trim(),
        messageType: 'TEXT'
      });

      setNewMessage('');
      stopTyping();
    } catch (error: any) {
      setError(error.message || 'Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = () => {
    if (!socket || !chat) return;

    const chatId = chat._id;
    if (!chatId) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing-start', {
        chatId: chatId,
        userId: auth.user?.id
      });
    }

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      stopTyping();
    }, 1000);

    setTypingTimeout(timeout);
  };

  const stopTyping = () => {
    if (!socket || !chat) return;

    const chatId = chat._id;
    if (!chatId) return;

    setIsTyping(false);
    socket.emit('typing-stop', {
      chatId: chatId,
      userId: auth.user?.id
    });

    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getOtherUser = () => {
    if (!chat) return null;
    return auth.user?.id === chat.buyer._id ? chat.seller : chat.buyer;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadChat}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">No chat found</p>
      </div>
    );
  }

  const otherUser = getOtherUser();

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white rounded-lg border">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            {otherUser?.fullName?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{otherUser?.fullName || recipientName}</h3>
            <p className="text-sm text-gray-600">
              {otherUser?.verificationStatus === 'VERIFIED' ? 'Verified' : 'Unverified'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <Phone className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <Video className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender === auth.user?.id;
            return (
              <div
                key={message._id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicator */}
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-600 ml-2">typing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-gray-50 rounded-b-lg">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RealtimeChat;