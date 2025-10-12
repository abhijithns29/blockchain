import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, X, DollarSign, Check, X as XIcon } from 'lucide-react';
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
  showHeader?: boolean;
  autoFillMessage?: string | null;
  onAutoFillUsed?: () => void;
}

const RealtimeChat: React.FC<RealtimeChatProps> = ({
  chatId,
  landId,
  recipientId,
  recipientName,
  onClose,
  showHeader = true,
  autoFillMessage,
  onAutoFillUsed
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
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [currentOffer, setCurrentOffer] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle auto-fill message
  useEffect(() => {
    if (autoFillMessage && !newMessage.trim()) {
      setNewMessage(autoFillMessage);
      if (onAutoFillUsed) {
        onAutoFillUsed();
      }
    }
  }, [autoFillMessage, newMessage, onAutoFillUsed]);

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
      try {
        const currentUserId = auth.user?.id;
        const messageSenderId = typeof data.message.sender === 'string' 
          ? data.message.sender 
          : (data.message.sender as any)?.id;
        
        // If message is from current user, replace the temporary message
        if (String(messageSenderId) === String(currentUserId)) {
          setMessages(prev => {
            // Find and replace the most recent temporary message
            const filteredMessages = prev.filter(msg => msg && msg._id && !msg._id.startsWith('temp-'));
            return [...filteredMessages, data.message];
          });
        } else {
          // Add message from other users
          setMessages(prev => [...prev, data.message]);
        }

        // Update current offer if this is an offer-related message
        if (data.message.messageType === 'OFFER' && data.message.offerAmount) {
          setCurrentOffer({
            amount: data.message.offerAmount,
            offeredBy: messageSenderId,
            status: 'PENDING'
          });
        } else if (data.message.messageType === 'ACCEPTANCE') {
          setCurrentOffer((prev: any) => prev ? { ...prev, status: 'ACCEPTED' } : null);
        } else if (data.message.messageType === 'REJECTION') {
          setCurrentOffer((prev: any) => prev ? { ...prev, status: 'REJECTED' } : null);
        }
      } catch (error) {
        console.error('Error handling new message:', error);
        // Fallback: just add the message normally
        setMessages(prev => [...prev, data.message]);
      }
    });

    newSocket.on('user-typing', (data) => {
      const currentUserId = auth.user?.id;
      if (data.userId !== currentUserId) {
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
        console.log('Current offer from chat:', chatData.chat.currentOffer);
        setChat(chatData.chat);
        setMessages(chatData.chat.messages || []);
        
        // Set current offer if it exists
        if (chatData.chat.currentOffer) {
          setCurrentOffer(chatData.chat.currentOffer);
        } else {
          // Fallback: check if there's a recent offer message
          const recentOfferMessage = chatData.chat.messages
            ?.filter((msg: any) => msg.messageType === 'OFFER')
            ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
          
          if (recentOfferMessage && recentOfferMessage.offerAmount) {
            // Check if this offer hasn't been accepted or rejected yet
            const hasResponse = chatData.chat.messages?.some((msg: any) => 
              (msg.messageType === 'ACCEPTANCE' || msg.messageType === 'REJECTION') &&
              new Date(msg.timestamp).getTime() > new Date(recentOfferMessage.timestamp).getTime()
            );
            
            if (!hasResponse) {
              setCurrentOffer({
                amount: recentOfferMessage.offerAmount,
                offeredBy: recentOfferMessage.sender,
                status: 'PENDING'
              });
            }
          }
        }
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
    try {
      if (!newMessage.trim() || !socket || !chat) return;

      const chatId = chat._id;
      if (!chatId) {
        setError('Chat ID is missing');
        return;
      }

      const messageText = newMessage.trim();
      
      // Add message optimistically to UI immediately
      const optimisticMessage = {
        _id: `temp-${Date.now()}`,
        sender: auth.user?.id || '',
        message: messageText,
        messageType: 'TEXT' as const,
        timestamp: new Date(),
        isRead: false
      };
      
      setMessages(prev => {
        if (!Array.isArray(prev)) return [optimisticMessage];
        return [...prev, optimisticMessage];
      });
      setNewMessage('');
      stopTyping();
      
      console.log('Sending message to chat:', chatId);
      const messageData = {
        message: messageText,
        messageType: 'TEXT'
      };
      const response = await apiService.sendMessage(chatId, messageData);
      console.log('Message API response:', response);
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message');
    }
  };

  // Offer functions
  const sendOffer = async () => {
    try {
      // Clear any previous errors
      setError('');
      
      if (!offerAmount.trim() || !chat) {
        setError('Please enter a valid amount and ensure chat is loaded');
        return;
      }

      const amount = parseFloat(offerAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount greater than 0');
        return;
      }

      if (amount < 1000) {
        setError('Minimum offer amount is ₹1,000');
        return;
      }

      const chatId = chat._id;
      if (!chatId) {
        setError('Chat ID is missing');
        return;
      }

      // Add offer message optimistically
      const optimisticOffer = {
        _id: `temp-offer-${Date.now()}`,
        sender: auth.user?.id || '',
        message: `Offered ₹${amount.toLocaleString()}`,
        messageType: 'OFFER' as const,
        timestamp: new Date(),
        isRead: false,
        offerAmount: amount
      };

      setMessages(prev => [...prev, optimisticOffer]);
      setOfferAmount('');
      setShowOfferInput(false);

      // Send offer via API endpoint
      console.log('Sending offer via API:', { chatId, amount });
      const response = await apiService.makeOffer(chatId, amount);
      console.log('Offer API response:', response);

      // Update current offer
      setCurrentOffer({
        amount,
        offeredBy: auth.user?.id,
        status: 'PENDING'
      });

    } catch (error: any) {
      console.error('Error sending offer:', error);
      setError(error.message || 'Failed to send offer');
    }
  };

  const respondToOffer = async (action: 'ACCEPT' | 'REJECT') => {
    try {
      console.log('respondToOffer called:', { action, socket: !!socket, chat: !!chat, currentOffer: !!currentOffer });
      
      if (!chat || !currentOffer) {
        console.log('Missing chat or currentOffer');
        return;
      }

      const chatId = chat._id;
      if (!chatId) {
        setError('Chat ID is missing');
        return;
      }

      const responseMessage = action === 'ACCEPT' 
        ? `Accepted offer of ₹${currentOffer.amount.toLocaleString()}`
        : `Rejected offer of ₹${currentOffer.amount.toLocaleString()}`;

      // Add response message optimistically
      const optimisticResponse = {
        _id: `temp-response-${Date.now()}`,
        sender: auth.user?.id || '',
        message: responseMessage,
        messageType: action === 'ACCEPT' ? 'ACCEPTANCE' as const : 'REJECTION' as const,
        timestamp: new Date(),
        isRead: false
      };

      setMessages(prev => [...prev, optimisticResponse]);

      // Send response via API endpoint
      if (action === 'ACCEPT') {
        console.log('Accepting offer via API:', chatId);
        const response = await apiService.acceptOffer(chatId);
        console.log('Accept offer API response:', response);
      } else {
        // For rejection, we can use the regular message endpoint
        console.log('Rejecting offer via message API:', { chatId, responseMessage });
        const messageData = {
          message: responseMessage,
          messageType: 'REJECTION'
        };
        const response = await apiService.sendMessage(chatId, messageData);
        console.log('Reject offer API response:', response);
      }

      // Update current offer status
      setCurrentOffer((prev: any) => prev ? { ...prev, status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' } : null);

    } catch (error: any) {
      console.error('Error responding to offer:', error);
      setError(error.message || 'Failed to respond to offer');
    }
  };

  const isBuyer = () => {
    return chat && auth.user?.id === chat.buyer._id;
  };

  const isSeller = () => {
    const isUserSeller = chat && auth.user?.id === chat.seller._id;
    console.log('isSeller check:', {
      chatExists: !!chat,
      authUserId: auth.user?.id,
      sellerId: chat?.seller?._id,
      isUserSeller
    });
    return isUserSeller;
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

  // Error fallback to prevent white screen
  if (error && !messages.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-center text-sm">Error: {error}</p>
        </div>
        <button
          onClick={() => {
            setError('');
            loadChat();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Retry
        </button>
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
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header - Only show if showHeader is true */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
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
      )}

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" 
        style={{ 
          maxHeight: 'calc(100vh - 250px)', 
          minHeight: '300px',
          scrollbarWidth: 'thin'
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            // Ensure proper user ID comparison for message alignment
            const currentUserId = auth.user?.id;
            // Handle different sender formats - could be string, object with id, or object with _id
            let senderId;
            if (typeof message.sender === 'string') {
              senderId = message.sender;
            } else if (message.sender && typeof message.sender === 'object') {
              senderId = (message.sender as any)?.id || (message.sender as any)?._id || message.sender;
            } else {
              senderId = message.sender;
            }
            
            // Convert both to strings for comparison
            const currentUserIdStr = String(currentUserId);
            const senderIdStr = String(senderId);
            const isOwnMessage = currentUserIdStr === senderIdStr;
            
            return (
              <div
                key={message._id}
                className={`flex mb-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                {/* Message bubble */}
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-sm ${
                    message.messageType === 'OFFER'
                      ? isOwnMessage
                        ? 'bg-green-500 text-white rounded-br-md border-2 border-green-600'
                        : 'bg-green-100 text-green-900 rounded-bl-md border-2 border-green-300'
                      : message.messageType === 'ACCEPTANCE'
                      ? isOwnMessage
                        ? 'bg-emerald-500 text-white rounded-br-md border-2 border-emerald-600'
                        : 'bg-emerald-100 text-emerald-900 rounded-bl-md border-2 border-emerald-300'
                      : message.messageType === 'REJECTION'
                      ? isOwnMessage
                        ? 'bg-red-500 text-white rounded-br-md border-2 border-red-600'
                        : 'bg-red-100 text-red-900 rounded-bl-md border-2 border-red-300'
                      : isOwnMessage
                      ? 'bg-blue-500 text-white rounded-br-md border-2 border-blue-600'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md border-2 border-gray-300'
                  }`}
                  title={`Message from: ${isOwnMessage ? 'YOU (Right Side)' : 'OTHER (Left Side)'}`}
                >
                  {/* Offer message with special styling */}
                  {message.messageType === 'OFFER' && (
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs font-semibold">OFFER</span>
                    </div>
                  )}
                  
                  {/* Acceptance message with special styling */}
                  {message.messageType === 'ACCEPTANCE' && (
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4" />
                      <span className="text-xs font-semibold">ACCEPTED</span>
                    </div>
                  )}
                  
                  {/* Rejection message with special styling */}
                  {message.messageType === 'REJECTION' && (
                    <div className="flex items-center gap-2 mb-1">
                      <XIcon className="w-4 h-4" />
                      <span className="text-xs font-semibold">REJECTED</span>
                    </div>
                  )}
                  
                  <p className="text-sm leading-relaxed">{message.message}</p>
                  <p
                    className={`text-xs mt-1 text-right ${
                      isOwnMessage 
                        ? (message.messageType === 'OFFER' ? 'text-green-100' : 
                           message.messageType === 'ACCEPTANCE' ? 'text-emerald-100' :
                           message.messageType === 'REJECTION' ? 'text-red-100' : 'text-blue-100')
                        : (message.messageType === 'OFFER' ? 'text-green-600' : 
                           message.messageType === 'ACCEPTANCE' ? 'text-emerald-600' :
                           message.messageType === 'REJECTION' ? 'text-red-600' : 'text-gray-500')
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
          <div className="flex mb-2 justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-2xl rounded-bl-md shadow-sm">
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

      {/* Offer Input Section */}
      {showOfferInput && isBuyer() && (
        <div className="p-4 border-t bg-green-50">
          {error && (
            <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="number"
              value={offerAmount}
              onChange={(e) => {
                setOfferAmount(e.target.value);
                setError(''); // Clear error when user types
              }}
              placeholder="Enter offer amount (₹)"
              className="flex-1 px-4 py-2 border border-green-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              min="1000"
              step="0.01"
            />
            <button
              onClick={sendOffer}
              disabled={!offerAmount.trim() || isNaN(parseFloat(offerAmount)) || parseFloat(offerAmount) < 1000}
              className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <DollarSign className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setShowOfferInput(false);
                setOfferAmount('');
                setError('');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">Minimum offer: ₹1,000</p>
        </div>
      )}

      {/* Current Offer Actions (for seller) */}
      {console.log('Offer actions debug:', {
        currentOffer: !!currentOffer,
        offerStatus: currentOffer?.status,
        isUserSeller: isSeller(),
        shouldShowActions: currentOffer && currentOffer.status === 'PENDING' && isSeller()
      })}
      {currentOffer && currentOffer.status === 'PENDING' && isSeller() && (
        <div className="p-4 border-t bg-yellow-50">
          <div className="text-center mb-3">
            <p className="text-sm text-gray-700">
              <strong>₹{currentOffer.amount.toLocaleString()}</strong> offer received
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => respondToOffer('ACCEPT')}
              className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={() => respondToOffer('REJECT')}
              className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <XIcon className="w-4 h-4" />
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          {/* Offer button for buyers */}
          {isBuyer() && !showOfferInput && (
            <button
              onClick={() => setShowOfferInput(true)}
              className="px-3 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors flex items-center justify-center"
              title="Make an offer"
            >
              <DollarSign className="w-4 h-4" />
            </button>
          )}
          
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RealtimeChat;