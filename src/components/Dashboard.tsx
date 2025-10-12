import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Shield,
  Map,
  QrCode,
  BarChart3,
  CheckCircle,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Land } from "../types";
import apiService from "../services/api";
import Navbar from "./Navbar";
import TransactionHistory from "./TransactionHistory";
import AdminPanel from "./AdminPanel";
import UserProfile from "./UserProfile";
import UserVerification from "./UserVerification";
import LandDatabase from "./LandDatabase";
import Marketplace from "./Marketplace";
import LandMarketplace from "./LandMarketplace";
import RealtimeChat from "./RealtimeChat";
import { Chat } from "../types";
import QRScanner from "./QRScanner";
import TwoFactorAuth from "./TwoFactorAuth";
import AuditorDashboard from "./AuditorDashboard";
import AdminTransactionDashboard from "./AdminTransactionDashboard";

interface DashboardProps {
  onNavigateToLand?: (landId: string) => void;
  initialTab?: string;
  initialSelectedChatId?: string;
  chatNavigation?: {landId: string, sellerId: string, isFirstChat?: boolean, activeTab?: string};
  onClearChatNavigation?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToLand, initialTab, initialSelectedChatId, chatNavigation, onClearChatNavigation }) => {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState(
    initialTab || (auth.user?.role === "ADMIN" ? "land-database" : "marketplace")
  );
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [autoFillMessage, setAutoFillMessage] = useState<string | null>(null);
  const [pendingChat, setPendingChat] = useState<{landId: string, recipientId: string, recipientName: string} | null>(null);

  // Redirect non-admin users away from land-database tab
  useEffect(() => {
    if (activeTab === "land-database" && auth.user?.role !== "ADMIN") {
      setActiveTab("marketplace");
    }
  }, [activeTab, auth.user?.role]);

  // Load chats when chats tab is selected
  useEffect(() => {
    if (activeTab === "chats") {
      loadChats();
    } else {
      // Clear selected chat when leaving chats tab to prevent confusion
      setSelectedChat(null);
    }
  }, [activeTab]);

  // Handle chat navigation and active tab changes
  useEffect(() => {
    if (chatNavigation) {
      // Set the active tab first
      if (chatNavigation.activeTab) {
        setActiveTab(chatNavigation.activeTab);
      }
      
      // If we have land and seller info, try to find the specific chat
      if (chatNavigation.landId && chatNavigation.sellerId && chats.length > 0) {
        const chatToSelect = chats.find(chat => 
          chat.landId?._id === chatNavigation.landId && 
          (chat.seller?.id === chatNavigation.sellerId || chat.buyer?.id === chatNavigation.sellerId)
        );
        
        if (chatToSelect) {
          // Found existing chat, select it
          setSelectedChat(chatToSelect);
          setPendingChat(null);
        } else {
          // No existing chat found, set up pending chat
          setSelectedChat(null);
          setAutoFillMessage("I am interested, can I get more info?");
          
          // We need to get the land details to get the recipient name
          // For now, set a placeholder and let RealtimeChat handle it
          setPendingChat({
            landId: chatNavigation.landId,
            recipientId: chatNavigation.sellerId,
            recipientName: 'Seller' // Will be updated when land details are loaded
          });
        }
        
        if (onClearChatNavigation) {
          onClearChatNavigation();
        }
      } else if (chatNavigation.activeTab && onClearChatNavigation) {
        // Just switching tabs without specific chat
        onClearChatNavigation();
      }
    }
  }, [chats, chatNavigation, onClearChatNavigation]);

  // Load selected chat from localStorage or initial prop on component mount
  useEffect(() => {
    if (chats.length > 0 && !chatNavigation) {
      const chatIdToSelect = initialSelectedChatId || localStorage.getItem('selectedChatId');
      if (chatIdToSelect) {
        const chatToSelect = chats.find(chat => chat._id === chatIdToSelect);
        if (chatToSelect) {
          setSelectedChat(chatToSelect);
          setActiveTab("chats");
        }
      }
    }
  }, [chats, initialSelectedChatId, chatNavigation]);

  // Save selected chat to localStorage
  useEffect(() => {
    if (selectedChat) {
      localStorage.setItem('selectedChatId', selectedChat._id);
    } else {
      localStorage.removeItem('selectedChatId');
    }
  }, [selectedChat]);

  const loadChats = async () => {
    try {
      setChatsLoading(true);
      setError("");
      console.log("Loading chats for user:", auth.user?.id);
      const response = await apiService.getMyChats();
      console.log("Chat API response:", response);
      
      // Handle different response structures
      let chatsData = [];
      if (response && response.chats) {
        chatsData = response.chats;
      } else if (Array.isArray(response)) {
        chatsData = response;
      } else if (response && Array.isArray(response.data)) {
        chatsData = response.data;
      }
      
      console.log("Processed chats data:", chatsData);
      setChats(chatsData);
    } catch (error: any) {
      console.error("Error loading chats:", error);
      setError(error.message || "Failed to load chats");
    } finally {
      setChatsLoading(false);
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
  };

  const handleBackToChatList = () => {
    setSelectedChat(null);
    setPendingChat(null);
  };


  const handleQRScan = async (assetId: string) => {
    try {
      setShowQRScanner(false);
      const response = await apiService.verifyLandByAssetId(assetId);
      setVerificationResult(response.verification);
    } catch (error: any) {
      setError(error.message || "Failed to verify land");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "land-database":
        return auth.user?.role === "ADMIN" ? (
          <LandDatabase />
        ) : (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Access Restricted
              </h2>
              <p className="text-gray-600">
                The Land Database is only accessible to administrators.
              </p>
            </div>
          </div>
        );
      case "marketplace":
        return <LandMarketplace onNavigateToLand={onNavigateToLand} />;
      case "chats":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Chat System</h1>
              <p className="mt-1 text-sm text-gray-500">
                Communicate with buyers and sellers
              </p>
            </div>
            
            {/* WhatsApp-like Chat Layout */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[700px] flex">
              {/* Left Sidebar - Chat List */}
              <div className="w-1/3 border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                </div>
                
                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
                  {chatsLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : error ? (
                    <div className="p-4 text-center">
                      <p className="text-red-600 mb-4 text-sm">{error}</p>
                      <button
                        onClick={loadChats}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : chats.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="mb-3">
                        <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">No conversations yet</h3>
                      <p className="text-xs text-gray-500 mb-3">
                        Start a conversation from the marketplace.
                      </p>
                      <button
                        onClick={() => setActiveTab("marketplace")}
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Go to Marketplace
                      </button>
                    </div>
                  ) : (
                    <div>
                      {chats.map((chat) => {
                        // Always show the other user (receiver), not the current user
                        
                        // Ensure proper string comparison for user IDs
                        const currentUserId = auth.user?.id || auth.user?._id;
                        const buyerId = chat.buyer?.id || chat.buyer?._id;
                        const otherUser = buyerId === currentUserId ? chat.seller : chat.buyer;
                        const lastMessage = chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
                        const isActive = selectedChat?._id === chat._id;
                        
                        return (
                          <div
                            key={chat._id}
                            onClick={() => handleChatSelect(chat)}
                            className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 ${
                              isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              {/* Avatar */}
                              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                {otherUser?.fullName?.charAt(0) || 'U'}
                              </div>
                              
                              {/* Chat Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                  <h3 className="font-medium text-gray-900 truncate">
                                    {otherUser?.fullName || 'Unknown User'}
                                  </h3>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    chat.status === 'DEAL_AGREED' ? 'bg-green-100 text-green-800' :
                                    chat.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {chat.status === 'DEAL_AGREED' ? 'Deal' : 'Active'}
                                  </span>
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-1 truncate">
                                  {chat.landId?.village}, {chat.landId?.district}
                                </p>
                                
                                {lastMessage && (
                                  <p className="text-xs text-gray-500 truncate">
                                    {lastMessage.messageType === 'OFFER' ? '💰 Offer' :
                                     lastMessage.messageType === 'ACCEPTANCE' ? '✅ Accepted' :
                                     lastMessage.messageType === 'REJECTION' ? '❌ Rejected' :
                                     lastMessage.message}
                                  </p>
                                )}
                                
                                {chat.currentOffer && chat.currentOffer.amount && (
                                  <p className="text-xs font-medium text-green-600 mt-1">
                                    ₹{(chat.currentOffer.amount / 100000).toFixed(1)}L
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right Side - Chat Area */}
              <div className="flex-1 flex flex-col">
                {(selectedChat || pendingChat) ? (
                  <div className="flex-1 flex flex-col bg-white">
                    {/* Chat Header - Same as Marketplace */}
                    <div className="flex justify-between items-center p-4 border-b">
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedChat ? 
                          `Chat with ${selectedChat.buyer?.id === auth.user?.id ? selectedChat.seller?.fullName : selectedChat.buyer?.fullName || 'User'}` :
                          `Start Chat with ${pendingChat?.recipientName || 'Seller'}`
                        }
                      </h2>
                      <button
                        onClick={handleBackToChatList}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {selectedChat ? (
                        <RealtimeChat 
                          chatId={selectedChat._id} 
                          onClose={handleBackToChatList} 
                          showHeader={false}
                          autoFillMessage={autoFillMessage}
                          onAutoFillUsed={() => setAutoFillMessage(null)}
                        />
                      ) : pendingChat ? (
                        <RealtimeChat 
                          landId={pendingChat.landId}
                          recipientId={pendingChat.recipientId}
                          recipientName={pendingChat.recipientName}
                          onClose={handleBackToChatList} 
                          showHeader={false}
                          autoFillMessage={autoFillMessage}
                          onAutoFillUsed={() => setAutoFillMessage(null)}
                        />
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="text-center text-gray-500">
                      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                      <p className="text-gray-500">
                        Choose a conversation from the list to start chatting
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "transactions":
        return <TransactionHistory />;
      case "profile":
        return <UserProfile onNavigateToLand={onNavigateToLand} />;
      case "admin":
        return auth.user?.role === "ADMIN" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            </div>
            <AdminTransactionDashboard />
            <AdminPanel />
          </div>
        ) : null;
      case "auditor":
        return auth.user?.role === "AUDITOR" ? <AuditorDashboard /> : null;
      case "verification":
        return <UserVerification />;
      case "two-factor":
        return <TwoFactorAuth />;
      case "qr-verify":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  QR Code Verification
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Scan QR codes to verify land ownership and authenticity
                </p>
              </div>
              <button
                onClick={() => setShowQRScanner(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Scan QR Code
              </button>
            </div>

            {verificationResult && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Verification Result
                </h2>
                {verificationResult.isValid ? (
                  <div className="space-y-3">
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span className="font-medium">
                        Valid Land Certificate
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Asset ID:</strong> {verificationResult.assetId}
                      </div>
                      <div>
                        <strong>Owner:</strong>{" "}
                        {verificationResult.currentOwner?.fullName}
                      </div>
                      <div>
                        <strong>Location:</strong>{" "}
                        {verificationResult.landDetails.village},{" "}
                        {verificationResult.landDetails.district}
                      </div>
                      <div>
                        <strong>Area:</strong>{" "}
                        {verificationResult.landDetails.area.acres} Acres
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <X className="h-5 w-5 mr-2" />
                    <span className="font-medium">
                      Invalid or Unverified Certificate
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </main>

      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
