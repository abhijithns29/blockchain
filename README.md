# Blockchain-Based Land Registration and Transfer System

A comprehensive blockchain-based land registration system that enables secure digitization, ownership tracking, and transfer of land documents with admin verification and marketplace functionality.

## 🏗️ System Architecture

### Core Components
- **Frontend**: React-based user interface
- **Backend**: Node.js/Express API server
- **Blockchain**: Ganache for local development
- **Database**: MongoDB with separate collections
- **Storage**: IPFS for document storage
- **Authentication**: JWT-based auth system

### Database Structure
- **Users Collection**: User profiles and verification status
- **Digitized Land DB**: All digitized land records with ownership mapping
- **Transactions Collection**: Land transfer transactions
- **Chats Collection**: Buyer-seller communications

## 🚀 Features

### 1. User Registration & Verification
- ✅ User registration with document submission
- ✅ Admin verification of user identity
- ✅ Aadhaar card and other document verification
- ✅ Role-based access control

### 2. Land Document Digitization
- ✅ Admin digitizes paper documents to PDF
- ✅ Unique ID and QR code generation
- ✅ Secure storage in Digitized Land DB
- ✅ Ownership mapping to verified users

### 3. Marketplace Functionality
- ✅ OLX-style land marketplace
- ✅ Search and filter capabilities
- ✅ Land listing with unique IDs
- ✅ Contact sellers and make offers

### 4. Transaction & Transfer Process
- ✅ Buyer-seller agreement system
- ✅ Admin verification and confirmation
- ✅ Automatic ownership transfer
- ✅ PDF transaction documents
- ✅ Blockchain transaction recording

### 5. Communication System
- ✅ Built-in chat functionality
- ✅ Real-time buyer-seller interaction
- ✅ Offer negotiation system

### 6. Security & Consistency
- ✅ JWT authentication
- ✅ Document encryption
- ✅ Atomic transactions
- ✅ Blockchain immutability

## 📋 Prerequisites

Before starting, ensure you have:

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **MongoDB** (v5.0 or higher) - [Download here](https://www.mongodb.com/try/download/community)
3. **Ganache** - [Download here](https://trufflesuite.com/ganache/)
4. **MetaMask** browser extension - [Install here](https://metamask.io/)
5. **Git** - [Download here](https://git-scm.com/)

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repository-url>
cd blockchain-land-registry
npm install
```

### 2. MongoDB Setup

#### Option A: Local MongoDB
1. Install and start MongoDB service:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS (with Homebrew)
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

2. Create database and admin users:
   ```bash
   # Connect to MongoDB
   mongosh
   
   # Create database
   use landregistry
   
   # Seed admin users
   npm run db:seed
   ```

#### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Get your connection string
4. Update `MONGODB_URI` in `.env`

### 3. Ganache Setup

1. **Install and Start Ganache**:
   - Download and install Ganache from [https://trufflesuite.com/ganache/](https://trufflesuite.com/ganache/)
   - Start Ganache and create a new workspace
   - Configure settings:
     - **Port Number**: `7545`
     - **Network ID**: `5777`
     - **Accounts & Keys**: Generate at least 10 accounts

2. **Copy Private Key**:
   - Copy the first account's private key for admin use
   - This will be used in your `.env` file

### 4. MetaMask Setup

1. **Install MetaMask** browser extension
2. **Add Ganache Network**:
   - Open MetaMask
   - Click Networks dropdown → Add Network → Add a network manually
   - Fill in the details:
     - **Network Name**: `Ganache Local`
     - **New RPC URL**: `http://127.0.0.1:7545`
     - **Chain ID**: `5777`
     - **Currency Symbol**: `ETH`

3. **Import Ganache Account**:
   - In MetaMask: Account menu → Import Account
   - Paste the private key from Ganache

### 5. Environment Configuration

#### A. Server Environment (.env)

Create a `.env` file in the root directory:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/landregistry

# JWT Secret Key (IMPORTANT: Change this in production!)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-for-production

# Blockchain Configuration (Ganache Local)
RPC_URL=http://127.0.0.1:7545
CONTRACT_ADDRESS=  # Will be filled after deployment
ADMIN_PRIVATE_KEY=0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d  # Replace with your Ganache account private key

# IPFS Configuration (Free Options)
IPFS_HOST=ipfs.io
IPFS_PORT=443
IPFS_PROTOCOL=https

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

#### B. Frontend Environment (.env.local)

Create a `.env.local` file in the root directory:

```env
# Contract address (will be set after blockchain setup)
VITE_CONTRACT_ADDRESS=

# RPC URL for frontend (Ganache)
VITE_RPC_URL=http://127.0.0.1:7545

# API URL
VITE_API_URL=http://localhost:5000/api
```

### 6. Smart Contract Deployment

1. **Compile and Deploy Contract**:
   ```bash
   # Compile the smart contract
   npm run blockchain:compile
   
   # Deploy to Ganache
   npm run blockchain:deploy:ganache
   ```

2. **Update Environment Variables**:
   - Copy the contract address from the deployment output
   - Update `CONTRACT_ADDRESS` in `.env`
   - Update `VITE_CONTRACT_ADDRESS` in `.env.local`

### 7. Seed Admin Users

```bash
npm run db:seed
```

This creates two admin accounts:
- **Email**: `admin@landregistry.gov` | **Password**: `admin123`
- **Email**: `officer@landregistry.gov` | **Password**: `admin123`

### 8. Start the Application

```bash
# Start both backend and frontend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 👥 User Roles & Workflows

### Admin Workflow
1. **User Verification**: Review and approve user documents
2. **Land Digitization**: Convert paper documents to digital format
3. **Transaction Approval**: Verify and confirm land transfers
4. **System Management**: Monitor all activities

### User Workflow
1. **Registration**: Create account and submit verification documents
2. **Wait for Verification**: Admin reviews and approves
3. **Bring Documents**: Visit admin to digitize land documents
4. **Use Marketplace**: List lands for sale or browse available lands
5. **Make Transactions**: Buy/sell lands with admin approval

## 🔧 Key Features Explained

### 1. Document Digitization Process
- Admin scans paper documents
- System generates unique Land ID
- Creates QR code for verification
- Stores in Digitized Land DB
- Maps ownership to user

### 2. Marketplace System
- Search by Land ID, location, price
- Filter by land type, area, etc.
- Contact sellers through built-in chat
- Make offers and negotiate prices

### 3. Transaction Process
- Buyer and seller agree on price
- Transaction created in pending state
- Admin reviews and verifies
- Upon approval: ownership transfers automatically
- Both parties receive transaction certificates
- Blockchain records the transfer

### 4. Security Features
- JWT-based authentication
- Document encryption
- Blockchain immutability
- Admin verification for all transfers
- Atomic database transactions

## 🗄️ Database Collections

### Users Collection
```javascript
{
  fullName: String,
  email: String,
  password: String (hashed),
  walletAddress: String,
  role: 'USER' | 'ADMIN',
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED',
  verificationDocuments: {
    aadhaarCard: { number, documentUrl, verified },
    // other documents
  },
  ownedLands: [ObjectId] // References to Land documents
}
```

### Digitized Land DB Collection
```javascript
{
  landId: String (unique),
  originalDocuments: [{
    type: String,
    documentUrl: String,
    ipfsHash: String
  }],
  digitalDocument: {
    certificateUrl: String,
    qrCode: String,
    isDigitalized: Boolean
  },
  currentOwner: ObjectId, // Reference to User
  ownershipHistory: [{
    owner: ObjectId,
    fromDate: Date,
    toDate: Date
  }],
  landDetails: {
    surveyNumber: String,
    village: String,
    district: String,
    area: Number,
    landType: String
  },
  marketInfo: {
    isForSale: Boolean,
    askingPrice: Number,
    listedDate: Date
  }
}
```

### Transactions Collection
```javascript
{
  landId: ObjectId,
  seller: ObjectId,
  buyer: ObjectId,
  agreedPrice: Number,
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED',
  adminReview: {
    reviewedBy: ObjectId,
    reviewDate: Date,
    comments: String
  },
  blockchainTxHash: String,
  transactionCertificate: String
}
```

## 🔐 Security Measures

1. **Authentication**: JWT tokens with expiration
2. **Authorization**: Role-based access control
3. **Document Security**: IPFS storage with encryption
4. **Blockchain**: Immutable transaction records
5. **Admin Verification**: All transfers require admin approval
6. **Atomic Operations**: Database consistency guaranteed

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Start only backend
npm run server:dev

# Start only frontend
npm run client:dev

# Compile smart contracts
npm run blockchain:compile

# Deploy to Ganache
npm run blockchain:deploy:ganache

# Seed admin users
npm run db:seed

# Build for production
npm run build
```

## 🔧 Troubleshooting

### Common Issues

1. **"Contract not found"**
   - Ensure Ganache is running on port 7545
   - Verify CONTRACT_ADDRESS is set correctly in both .env files
   - Redeploy contract if needed

2. **"Database connection failed"**
   - Check MongoDB is running
   - Verify MONGODB_URI is correct
   - Check network connectivity for Atlas

3. **"MetaMask connection failed"**
   - Ensure MetaMask is installed and unlocked
   - Check Ganache network is added correctly
   - Verify account has ETH for gas fees

4. **"Admin login not working"**
   - Run `npm run db:seed` to create admin users
   - Check MongoDB connection
   - Verify credentials: admin@landregistry.gov / admin123

### Reset Everything

```bash
# Stop all processes
pkill -f node

# Clean and reinstall
rm -rf node_modules package-lock.json
npm install

# Restart Ganache and redeploy
npm run blockchain:deploy:ganache

# Update environment variables with new contract address
# Restart application
npm run dev
```

## 📊 System Flow

```
1. User Registration → Document Submission → Admin Verification
2. Verified User → Brings Paper Documents → Admin Digitizes
3. Digital Land Record → Stored in Digitized Land DB → Ownership Mapped
4. User Lists Land → Marketplace → Other Users Browse
5. Buyer Contacts Seller → Chat → Price Agreement
6. Transaction Created → Admin Reviews → Approval/Rejection
7. If Approved → Ownership Transfer → Blockchain Record → Certificates Generated
```

## 🚀 Production Deployment

For production deployment:

1. **Database**: Use MongoDB Atlas or dedicated MongoDB server
2. **Blockchain**: Deploy to Ethereum mainnet or testnet
3. **Storage**: Use dedicated IPFS node or Pinata
4. **Frontend**: Deploy to Vercel, Netlify, or similar
5. **Backend**: Deploy to AWS, Google Cloud, or similar
6. **Security**: Update JWT_SECRET, use HTTPS, configure CORS properly

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check this README for setup instructions
- Review the troubleshooting section
- Create an issue in the repository

---

**Note**: This system is designed for real-world land registry use cases with proper security, verification, and blockchain integration. Ensure proper security audits and compliance checks before production deployment.