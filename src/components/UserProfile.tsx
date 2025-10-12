import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Wallet,
  MapPin,
  Phone,
  Edit2,
  Save,
  X,
  QrCode,
  Copy,
  Map,
  Calendar,
  DollarSign,
  Eye,
  ShoppingCart,
  Scissors,
  Settings,
  Download,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import QRCode from "qrcode";
import apiService from "../services/api";
import LandListingForm from "./LandListingForm";

interface UserProfileProps {
  onNavigateToLand?: (landId: string) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onNavigateToLand }) => {
  const { auth } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [ownedLands, setOwnedLands] = useState<any[]>([]);
  const [landsLoading, setLandsLoading] = useState(false);
  const [showOwnedLands, setShowOwnedLands] = useState(false);
  const [showListingForm, setShowListingForm] = useState(false);
  const [showPartitionModal, setShowPartitionModal] = useState(false);
  const [selectedLand, setSelectedLand] = useState<any>(null);
  const [partitionData, setPartitionData] = useState({
    partitionType: "partial", // 'partial' or 'whole'
    partitionArea: "",
    askingPrice: "",
    description: "",
  });
  const [formData, setFormData] = useState({
    fullName: auth.user?.fullName || "",
    email: auth.user?.email || "",
    phoneNumber: auth.user?.profile?.phoneNumber || "",
    address: {
      street: auth.user?.profile?.address?.street || "",
      city: auth.user?.profile?.address?.city || "",
      state: auth.user?.profile?.address?.state || "",
      zipCode: auth.user?.profile?.address?.zipCode || "",
    },
  });

  // Generate QR code for user ID
  useEffect(() => {
    const generateQRCode = async () => {
      if (auth.user?.id) {
        try {
          const qrUrl = await QRCode.toDataURL(auth.user.id, {
            width: 200,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          setQrCodeUrl(qrUrl);
        } catch (error) {
          console.error("Error generating QR code:", error);
        }
      }
    };

    generateQRCode();
  }, [auth.user?.id]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const fetchOwnedLands = async () => {
    if (!auth.user?.id) {
      console.log("No user ID available");
      return;
    }

    console.log("Fetching owned lands for user:", auth.user.id);
    setLandsLoading(true);
    setError(""); // Clear any previous errors

    try {
      const response = await apiService.getOwnedLandsByUserId(auth.user.id, {
        limit: 10,
      });
      console.log("Owned lands response:", response);
      setOwnedLands(response.lands || []);
    } catch (error) {
      console.error("Error fetching owned lands:", error);
      setError(
        `Failed to load owned lands: ${error.message || "Unknown error"}`
      );
    } finally {
      setLandsLoading(false);
    }
  };

  const toggleOwnedLands = () => {
    if (!showOwnedLands && ownedLands.length === 0) {
      fetchOwnedLands();
    }
    setShowOwnedLands(!showOwnedLands);
  };

  const handleListForSale = (land: any) => {
    setSelectedLand(land);
    setShowListingForm(true);
  };

  const handleListingSuccess = () => {
    setShowListingForm(false);
    setSelectedLand(null);
    fetchOwnedLands(); // Refresh the owned lands list
  };

  const handleViewDetails = (landId: string) => {
    if (onNavigateToLand) {
      onNavigateToLand(landId);
    } else {
      console.warn('Navigation function not provided');
    }
  };

  const handleDownloadDocument = async (landId: string) => {
    try {
      setLoading(true);
      
      // Create a temporary link to download the PDF
      const token = localStorage.getItem('token');
      const downloadUrl = `http://localhost:5000/api/lands/${landId}/download-document`;
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `land_document_${landId}.pdf`;
      
      // Add authorization header by creating a fetch request first
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download document');
      }
      
      // Get the blob and create a download URL
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Trigger download
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
      
    } catch (error: any) {
      setError(error.message || 'Failed to download document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadOriginalDocument = async (landId: string) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const downloadUrl = `http://localhost:5000/api/lands/${landId}/download-original-document`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `original_document_${landId}.pdf`;
      
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download original document');
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
      
    } catch (error: any) {
      setError(error.message || 'Failed to download original document');
    } finally {
      setLoading(false);
    }
  };


  const handlePartitionLand = (land: any) => {
    setSelectedLand(land);
    setPartitionData({
      partitionType: "partial",
      partitionArea: "",
      askingPrice: "",
      description: "",
    });
    setShowPartitionModal(true);
  };


  const handlePartitionSubmit = async () => {
    if (!selectedLand || !partitionData.askingPrice) return;

    try {
      setLoading(true);
      // For now, we'll treat partition as a regular sale
      // In the future, this could create a new land record for the partitioned area
      const response = await apiService.listLandForSale(selectedLand._id, {
        askingPrice: partitionData.askingPrice,
        description: partitionData.description,
        features: `Partition: ${partitionData.partitionType}`,
        nearbyAmenities: "",
      });

      console.log("Land partitioned and listed:", response);
      await fetchOwnedLands();
      setShowPartitionModal(false);
      setError("");
    } catch (error) {
      console.error("Error partitioning land:", error);
      setError("Failed to partition land");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError("");
      // In a real implementation, this would save to the API
      console.log("Saving profile:", formData);
      setIsEditing(false);
    } catch (error: any) {
      setError(error.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError("");
    setFormData({
      fullName: auth.user?.fullName || "",
      email: auth.user?.email || "",
      phoneNumber: auth.user?.profile?.phoneNumber || "",
      address: {
        street: auth.user?.profile?.address?.street || "",
        city: auth.user?.profile?.address?.city || "",
        state: auth.user?.profile?.address?.state || "",
        zipCode: auth.user?.profile?.address?.zipCode || "",
      },
    });
    setIsEditing(false);
  };

  if (!auth.user) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account information and preferences
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Profile
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {auth.user.fullName}
              </h2>
              <p className="text-sm text-gray-500">
                {auth.user.role === "ADMIN"
                  ? "Administrator"
                  : "Property Owner"}
              </p>
              <div className="flex items-center mt-1">
                {auth.user.verificationStatus === "VERIFIED" ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Verified Account
                  </span>
                ) : auth.user.verificationStatus === "PENDING" ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending Verification
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Verification Required
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User ID and QR Code Section */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                User ID (MongoDB ObjectId)
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-mono text-gray-900 break-all">
                  {auth.user?.id || "Not available"}
                </code>
                <button
                  onClick={() => copyToClipboard(auth.user?.id || "")}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  title="Copy User ID"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {copySuccess && (
                <p className="text-xs text-green-600 mt-1">
                  Copied to clipboard!
                </p>
              )}
            </div>

            {/* QR Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <QrCode className="inline h-4 w-4 mr-1" />
                User ID QR Code
              </label>
              <div className="flex justify-center">
                {qrCodeUrl ? (
                  <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
                    <img
                      src={qrCodeUrl}
                      alt="User ID QR Code"
                      className="w-32 h-32"
                    />
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Scan to get User ID
                    </p>
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center">
                    <QrCode className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="text-gray-900">{auth.user.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline h-4 w-4 mr-1" />
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="text-gray-900">{auth.user.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              ) : (
                <p className="text-gray-900">
                  {auth.user.profile?.phoneNumber || "Not provided"}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Wallet className="inline h-4 w-4 mr-1" />
                Wallet Address
              </label>
              <p className="text-gray-900 font-mono text-sm break-all">
                {auth.user.walletAddress}
              </p>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter street address"
                  />
                ) : (
                  <p className="text-gray-900">
                    {auth.user.profile?.address?.street || "Not provided"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter city"
                  />
                ) : (
                  <p className="text-gray-900">
                    {auth.user.profile?.address?.city || "Not provided"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter state"
                  />
                ) : (
                  <p className="text-gray-900">
                    {auth.user.profile?.address?.state || "Not provided"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter ZIP code"
                  />
                ) : (
                  <p className="text-gray-900">
                    {auth.user.profile?.address?.zipCode || "Not provided"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Account Statistics */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Account Statistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {auth.user.ownedProperties?.length ?? 0}
                </div>
                <div className="text-sm text-blue-600">Properties Owned</div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {/* This would be calculated from transactions */}0
                </div>
                <div className="text-sm text-green-600">
                  Completed Transactions
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {/* This would be calculated from pending transactions */}0
                </div>
                <div className="text-sm text-yellow-600">
                  Pending Transactions
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Owned Lands Section */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Map className="h-5 w-5 mr-2" />
              Owned Lands
            </h3>
            <button
              onClick={toggleOwnedLands}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showOwnedLands ? "Hide" : "Show"} Lands
            </button>
          </div>

          {showOwnedLands && (
            <div className="space-y-4">
              {landsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading lands...</span>
                </div>
              ) : ownedLands.length === 0 ? (
                <div className="text-center py-8">
                  <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No lands owned yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ownedLands.map((land) => (
                    <div
                      key={land._id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 truncate">
                          {land.surveyNumber} - {land.subDivision}
                        </h4>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            land.status === "FOR_SALE"
                              ? "bg-green-100 text-green-800"
                              : land.status === "DIGITIZED"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {land.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>
                            {land.village}, {land.district}, {land.state}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>
                            Added:{" "}
                            {new Date(land.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {land.area && (
                          <div className="flex items-center">
                            <span className="font-medium">Area: </span>
                            <span className="ml-1">
                              {typeof land.area === "string"
                                ? JSON.parse(land.area).acres + " acres"
                                : land.area.acres + " acres"}
                            </span>
                          </div>
                        )}

                        {/* Document Information */}
                        <div className="space-y-1">
                          {land.originalDocument && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Download className="h-3 w-3 mr-1" />
                              <span>Original Doc: {land.originalDocument.filename || 'Available'}</span>
                            </div>
                          )}
                          {land.digitalDocument && (
                            <div className="flex items-center text-sm text-green-600">
                              <Download className="h-3 w-3 mr-1" />
                              <span>Digitized Doc: Available</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <button 
                              onClick={() => handleViewDetails(land._id)}
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </button>
                            {land.digitalDocument && (
                              <button 
                                onClick={() => handleDownloadDocument(land._id)}
                                className="inline-flex items-center text-green-600 hover:text-green-800 text-sm"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download Digitized Doc
                              </button>
                            )}
                            {land.originalDocument && (
                              <button 
                                onClick={() => handleDownloadOriginalDocument(land._id)}
                                className="inline-flex items-center text-gray-600 hover:text-gray-800 text-sm"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download Original Doc
                              </button>
                            )}
                          </div>

                          {land.status !== "FOR_SALE" && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleListForSale(land)}
                                className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-md text-sm"
                              >
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                List for Sale
                              </button>
                              <button
                                onClick={() => handlePartitionLand(land)}
                                className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md text-sm"
                              >
                                <Scissors className="h-4 w-4 mr-1" />
                                Partition
                              </button>
                            </div>
                          )}

                          {land.status === "FOR_SALE" && (
                            <div className="flex space-x-2">
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm">
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                Listed for Sale
                              </span>
                              <button
                                onClick={() => handlePartitionLand(land)}
                                className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md text-sm"
                              >
                                <Scissors className="h-4 w-4 mr-1" />
                                Partition
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Listing Form Modal */}
      {showListingForm && selectedLand && (
        <LandListingForm
          land={selectedLand}
          onClose={() => setShowListingForm(false)}
          onSuccess={handleListingSuccess}
        />
      )}

      {/* Partition Modal */}
      {showPartitionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Partition Land</h3>
              <button
                onClick={() => setShowPartitionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partition Type
                </label>
                <select
                  value={partitionData.partitionType}
                  onChange={(e) =>
                    setPartitionData({
                      ...partitionData,
                      partitionType: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="partial">Partial Sale</option>
                  <option value="whole">Sale as Whole</option>
                </select>
              </div>

              {partitionData.partitionType === "partial" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Partition Area (acres)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={partitionData.partitionArea}
                    onChange={(e) =>
                      setPartitionData({
                        ...partitionData,
                        partitionArea: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter area to partition"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asking Price (₹)
                </label>
                <input
                  type="number"
                  value={partitionData.askingPrice}
                  onChange={(e) =>
                    setPartitionData({
                      ...partitionData,
                      askingPrice: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter asking price"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={partitionData.description}
                  onChange={(e) =>
                    setPartitionData({
                      ...partitionData,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe the partitioned land..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowPartitionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePartitionSubmit}
                disabled={loading || !partitionData.askingPrice}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Partition & List"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
