export interface User {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  role: 'USER' | 'ADMIN' | 'AUDITOR';
  verificationStatus: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  verificationDocuments?: {
    panCard?: {
      number: string;
      documentUrl: string;
      verified: boolean;
    };
    aadhaarCard?: {
      number: string;
      documentUrl: string;
      verified: boolean;
    };
    drivingLicense?: {
      number: string;
      documentUrl: string;
      verified: boolean;
    };
    passport?: {
      number: string;
      documentUrl: string;
      verified: boolean;
    };
  };
  verifiedBy?: string;
  verificationDate?: string;
  rejectionReason?: string;
  profile?: {
    phoneNumber?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    profileImage?: string;
  };
  ownedLands: string[];
  createdAt: string;
  lastLogin?: string;
}

export interface Land {
  id: string;
  _id?: string;
  assetId: string;
  surveyNumber: string;
  subDivision?: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  pincode: string;
  area: {
    acres?: number;
    guntas?: number;
    sqft?: number;
  };
  boundaries: {
    north: string;
    south: string;
    east: string;
    west: string;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  landType: 'AGRICULTURAL' | 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'GOVERNMENT';
  classification?: 'DRY' | 'WET' | 'GARDEN' | 'INAM' | 'SARKAR';
  currentOwner?: User;
  ownershipHistory: Array<{
    owner?: User;
    ownerName?: string;
    fromDate: string;
    toDate?: string;
    documentReference: string;
    transactionType: string;
  }>;
  originalDocument?: {
    filename: string;
    hash: string;
    url: string;
    uploadedAt: string;
    uploadedBy?: User;
  };
  digitalDocument?: {
    hash: string;
    url: string;
    digitalizedBy?: User;
    verifiedBy?: User;
    generatedAt: string;
    isDigitalized: boolean;
  };
  marketInfo: {
    isForSale: boolean;
    askingPrice?: number;
    pricePerSqft?: number;
    listedDate?: string;
    description?: string;
    images?: string[];
    features?: string[];
    nearbyAmenities?: string[];
    virtualTourUrl?: string;
  };
  status: 'AVAILABLE' | 'FOR_SALE' | 'UNDER_TRANSACTION' | 'SOLD' | 'DISPUTED';
  verificationStatus: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: User;
  addedBy: User;
  createdAt: string;
  blockchainTxHash?: string;
  escrowContract?: string;
}

export interface LandTransaction {
  id: string;
  transactionId: string;
  landId: Land;
  seller: User;
  buyer: User;
  agreedPrice: number;
  escrowAmount: number;
  transactionType: 'SALE' | 'TRANSFER' | 'INHERITANCE' | 'GIFT';
  status: 'INITIATED' | 'DOCUMENTS_SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  documents: Array<{
    documentType: string;
    documentName: string;
    documentUrl: string;
    uploadedBy: User;
    uploadDate: string;
    verified: boolean;
  }>;
  adminReview: {
    reviewedBy?: User;
    reviewDate?: string;
    comments?: string;
    rejectionReason?: string;
    documentsVerified: boolean;
    legalClearance: boolean;
  };
  completionDetails?: {
    completedDate: string;
    registrationNumber: string;
    transactionCertificate: {
      certificateUrl: string;
      qrCode: string;
    };
    newOwnershipDocument: {
      certificateUrl: string;
      qrCode: string;
    };
  };
  blockchainTxHash?: string;
  escrowContractAddress?: string;
  timeline: Array<{
    event: string;
    timestamp: string;
    performedBy: User;
    description: string;
  }>;
  createdAt: string;
}

export interface Chat {
  _id: string;
  id?: string;
  landId: Land;
  buyer: User;
  seller: User;
  messages: Array<{
    sender: User;
    message: string;
    messageType: 'TEXT' | 'OFFER' | 'COUNTER_OFFER' | 'ACCEPTANCE' | 'REJECTION';
    offerAmount?: number;
    timestamp: string;
    isRead: boolean;
  }>;
  currentOffer?: {
    amount: number;
    offeredBy: User;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTER_OFFERED';
  };
  status: 'ACTIVE' | 'DEAL_AGREED' | 'TRANSACTION_INITIATED' | 'COMPLETED' | 'CANCELLED';
  agreedPrice?: number;
  agreedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface MapLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface EscrowContract {
  contractAddress: string;
  buyer: string;
  seller: string;
  amount: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: User;
  targetResource: string;
  targetId: string;
  details: any;
  timestamp: string;
  ipAddress: string;
}