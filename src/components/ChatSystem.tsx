import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, DollarSign, Check, X, Clock } from 'lucide-react';
import { Chat } from '../types';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';

const ChatSystem: React.FC = () => {
  const { auth } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      loadChatDetails(selectedChat._id);
    }
  }, [selectedChat?._id]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyChats();
      setChats(response.chats);
    } catch (error: any) {
      setError(error.message || 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const loadChatDetails = async (chatId: string) => {
    try {
      const response = await apiService.getChat(chatId);
      setSelectedChat(response.chat);
    } catch (error: any) {
      setError(error.message || 'Failed to load chat details');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChat || !newMessage.trim()) return;

    try {
      await apiService.sendMessage(selectedChat._id, {
        message: newMessage,
        messageType: 'TEXT'
      });
      setNewMessage('');
      loadChatDetails(selectedChat._id);
    } catch (error: any) {
      setError(error.message || 'Failed to send message');
    }
  };

  const handleMakeOffer = async () => {
    if (!selectedChat || !offerAmount) return;

    try {
      await apiService.makeOffer(selectedChat._id, parseFloat(offerAmount));
      setOfferAmount('');
      setShowOfferInput(false);
      loadChatDetails(selectedChat._id);
    } catch (error: any) {
      setError(error.message || 'Failed to make offer');
    }
  };

  const handleCounterOffer = async () => {
    if (!selectedChat || !offerAmount) return;

    try {
      await apiService.makeCounterOffer(selectedChat._id, parseFloat(offerAmount));
      setOfferAmount('');
      setShowOfferInput(false);
      loadChatDetails(selectedChat._id);
    } catch (error: any) {
      setError(error.message || 'Failed to make counter offer');
    }
  };

  const handleAcceptOffer = async () => {
    if (!selectedChat) return;

    try {
      await apiService.acceptOffer(selectedChat._id);
      loadChatDetails(selectedChat._id);
      loadChats(); // Refresh chat list
    } catch (error: any) {
      setError(error.message || 'Failed to accept offer');
    }
  };

  const handleInitiateTransaction = async () => {
    if (!selectedChat) return;

    try {
      await apiService.initiateLandTransaction(selectedChat._id);
      loadChatDetails(selectedChat._id);
    } catch (error: any) {
      setError(error.message || 'Failed to initiate transaction');
    }
  };

  const formatPrice = (price: number | undefined) => {
    if (!price || price === 0) {
      return '₹0';
    }
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)} L`;
    } else {
      return `₹${price.toLocaleString()}`;
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'OFFER':
      case 'COUNTER_OFFER':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'ACCEPTANCE':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'REJECTION':
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <MessageCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  const canMakeOffer = (chat: Chat) => {
    return chat.buyer?.id === auth.user?.id && 
           (!chat.currentOffer || chat.currentOffer.status !== 'PENDING');
  };

  const canMakeCounterOffer = (chat: Chat) => {
    return chat.seller?.id === auth.user?.id && 
           chat.currentOffer && 
           chat.currentOffer.status === 'PENDING' &&
           chat.currentOffer.offeredBy?.id !== auth.user?.id;
  };

  const canAcceptOffer = (chat: Chat) => {
    return chat.currentOffer && 
           chat.currentOffer.status === 'PENDING' &&
           chat.currentOffer.offeredBy?.id !== auth.user?.id;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chat System</h1>
        <p className="mt-1 text-sm text-gray-500">
          Communicate with buyers and sellers
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Chat List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          </div>
          <div className="overflow-y-auto h-full">
            {chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No conversations yet
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedChat?._id === chat._id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">
                      {chat.landId.village}, {chat.landId.district}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      chat.status === 'DEAL_AGREED' ? 'bg-green-100 text-green-800' :
                      chat.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {chat.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Asset ID: {chat.landId?.assetId || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {chat.buyer?.id === auth.user?.id ? 'Seller' : 'Buyer'}: {' '}
                    {chat.buyer?.id === auth.user?.id ? (chat.seller?.fullName || 'Unknown') : (chat.buyer?.fullName || 'Unknown')}
                  </p>
                  {chat.currentOffer && chat.currentOffer.amount && (
                    <p className="text-sm font-medium text-green-600 mt-1">
                      Current Offer: {formatPrice(chat.currentOffer.amount)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedChat.landId.village}, {selectedChat.landId.district}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Asset ID: {selectedChat.landId?.assetId || 'N/A'} • {' '}
                      {selectedChat.buyer?.id === auth.user?.id ? 'Seller' : 'Buyer'}: {' '}
                      {selectedChat.buyer?.id === auth.user?.id ? (selectedChat.seller?.fullName || 'Unknown') : (selectedChat.buyer?.fullName || 'Unknown')}
                    </p>
                  </div>
                  {selectedChat.landId.marketInfo.askingPrice && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatPrice(selectedChat.landId.marketInfo.askingPrice)}
                      </p>
                      <p className="text-sm text-gray-500">Asking Price</p>
                    </div>
                  )}
                </div>

                {/* Current Offer Status */}
                {selectedChat.currentOffer && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Current Offer: {formatPrice(selectedChat.currentOffer.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          By: {selectedChat.currentOffer.offeredBy?.fullName || 'Unknown'} • Status: {selectedChat.currentOffer.status}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {canAcceptOffer(selectedChat) && (
                          <button
                            onClick={handleAcceptOffer}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                          >
                            Accept
                          </button>
                        )}
                        {canMakeCounterOffer(selectedChat) && (
                          <button
                            onClick={() => setShowOfferInput(true)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Counter
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Deal Agreed Actions */}
                {selectedChat.status === 'DEAL_AGREED' && (
                  <div className="mt-3 p-3 bg-green-50 rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Deal Agreed! Price: {formatPrice(selectedChat.agreedPrice!)}
                        </p>
                        <p className="text-xs text-green-600">
                          Ready to initiate official transaction
                        </p>
                      </div>
                      <button
                        onClick={handleInitiateTransaction}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                      >
                        Initiate Transaction
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedChat.messages.map((message, index) => {
                  const isOwnMessage = message.sender?.id === auth.user?.id;
                  return (
                    <div
                      key={index}
                      className={`flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-end ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isOwnMessage ? 'bg-blue-600 text-white ml-2' : 'bg-gray-400 text-white mr-2'
                        }`}>
                          {message.sender?.fullName ? message.sender.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        
                        {/* Message bubble */}
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                            isOwnMessage
                              ? 'bg-blue-500 text-white rounded-br-md'
                              : 'bg-gray-100 text-gray-900 rounded-bl-md'
                          }`}
                        >
                          {/* Message type icon and sender name */}
                          <div className="flex items-center mb-1">
                            {getMessageTypeIcon(message.messageType)}
                            <span className="ml-1 text-xs font-medium opacity-90">
                              {message.sender?.fullName || 'Unknown'}
                            </span>
                          </div>
                          
                          <p className="text-sm leading-relaxed">{message.message}</p>
                          
                          {message.offerAmount && (
                            <p className="text-xs mt-1 font-medium">
                              Amount: {formatPrice(message.offerAmount)}
                            </p>
                          )}
                          
                          <p className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Offer Input */}
              {showOfferInput && (
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Enter offer amount"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={canMakeCounterOffer(selectedChat) ? handleCounterOffer : handleMakeOffer}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      {canMakeCounterOffer(selectedChat) ? 'Counter' : 'Offer'}
                    </button>
                    <button
                      onClick={() => {
                        setShowOfferInput(false);
                        setOfferAmount('');
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                  {canMakeOffer(selectedChat) && (
                    <button
                      onClick={() => setShowOfferInput(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      <DollarSign className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSystem;