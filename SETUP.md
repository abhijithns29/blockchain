# Complete Setup Guide for Blockchain Land Registry

## Prerequisites

Before starting, ensure you have:

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **MongoDB** - [Download here](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)
3. **MetaMask** browser extension - [Install here](https://metamask.io/)
4. **Git** - [Download here](https://git-scm.com/)

## Step-by-Step Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repository-url>
cd blockchain-land-registry
npm install
```

### 2. Environment Configuration

#### A. Server Environment (.env)

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/landregistry
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/landregistry

# JWT Secret Key (IMPORTANT: Change this!)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Blockchain Configuration (Local Development)
RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=  # Will be filled after deployment
ADMIN_PRIVATE_KEY=  # Will be provided after blockchain setup

# IPFS Configuration (Free Options)
IPFS_HOST=ipfs.io
IPFS_PORT=443
IPFS_PROTOCOL=https

# Optional: Web3.Storage (Free 1TB)
# WEB3_STORAGE_TOKEN=your-free-token-from-web3-storage

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

#### B. Frontend Environment (.env.local)

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Edit the `.env.local` file:

```env
# Contract address (will be set after blockchain setup)
VITE_CONTRACT_ADDRESS=

# RPC URL for frontend
VITE_RPC_URL=http://localhost:8545

# API URL (optional)
VITE_API_URL=http://localhost:5000/api
```

### 3. Database Setup

#### Option A: Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service:
   ```bash
   # Check if MongoDB is running
   ps aux | grep mongod
   
   # Windows
   net start MongoDB
   
   # macOS (with Homebrew)
   brew services start mongodb-community
   # Or manually:
   mongod --config /usr/local/etc/mongod.conf
   
   # Linux
   sudo systemctl start mongod
   # Or manually:
   sudo mongod --dbpath /var/lib/mongodb
   ```

3. Verify MongoDB is running:
   ```bash
   # Test connection
   mongosh --eval "db.adminCommand('ismaster')"
   # Or for older versions:
   mongo --eval "db.adminCommand('ismaster')"
   ```

#### Option B: MongoDB Atlas (Recommended for beginners)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster (free tier)
4. Get your connection string
5. Update `MONGODB_URI` in `.env` with your Atlas connection string

### 4. Blockchain Setup (Local Development)

#### Terminal 1: Start Local Blockchain
```bash
npm run blockchain:node
```
Keep this terminal running. You'll see test accounts with private keys.

#### Terminal 2: Deploy Smart Contract
```bash
npm run blockchain:setup
```

This will:
- Deploy the LandRegistry smart contract
- Display the contract address
- Show test account information

**Important**: Copy the contract address from the output and update both:
- `CONTRACT_ADDRESS` in `.env`
- `VITE_CONTRACT_ADDRESS` in `.env.local`

Also copy one of the private keys for `ADMIN_PRIVATE_KEY` in `.env`.

### 5. MetaMask Configuration

1. Open MetaMask
2. Add Local Network:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `1337`
   - Currency Symbol: `ETH`

3. Import Test Account:
   - Copy a private key from the blockchain node terminal
   - In MetaMask: Account menu → Import Account → Paste private key

### 6. Start the Application

```bash
npm run dev
```

This starts both the backend server and frontend simultaneously.

### 7. Create Admin Account

1. Open http://localhost:5173
2. Click "Create account"
3. Fill in the form with:
   - Full Name: Your name
   - Email: Your email
   - Password: Your password
   - Wallet Address: Copy from MetaMask
   - **Important**: Manually change the role to 'ADMIN' in the database or register as USER first

## Environment Variables Reference

### Server (.env)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | Yes | `mongodb://localhost:27017/landregistry` |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | `your-super-secret-key-32-chars-min` |
| `RPC_URL` | Ethereum RPC endpoint | Yes | `http://localhost:8545` |
| `CONTRACT_ADDRESS` | Deployed contract address | Yes | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `ADMIN_PRIVATE_KEY` | Admin wallet private key | Yes | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| `WEB3_STORAGE_TOKEN` | Web3.Storage API token | No | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `PORT` | Server port | No | `5000` |
| `NODE_ENV` | Environment mode | No | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | No | `http://localhost:5173` |

### Frontend (.env.local)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_CONTRACT_ADDRESS` | Contract address for frontend | Yes | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `VITE_RPC_URL` | RPC URL for frontend | Yes | `http://localhost:8545` |
| `VITE_API_URL` | Backend API URL | No | `http://localhost:5000/api` |

## Free Service Setup (Optional)

### Web3.Storage (Free IPFS)
1. Go to [web3.storage](https://web3.storage)
2. Sign up for free account
3. Create API token
4. Add `WEB3_STORAGE_TOKEN` to `.env`

### MongoDB Atlas (Free Database)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free account
3. Create free cluster
4. Get connection string
5. Update `MONGODB_URI` in `.env`

### Infura (Free Ethereum RPC)
1. Go to [Infura](https://infura.io)
2. Create free account
3. Create new project
4. Get endpoint URL
5. Use for `RPC_URL` when deploying to testnet

## Testnet Deployment (Optional)

To deploy to Sepolia testnet:

1. Get Sepolia ETH from [faucet](https://sepoliafaucet.com/)
2. Update `.env`:
   ```env
   RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   ADMIN_PRIVATE_KEY=your_real_private_key
   ```
3. Deploy:
   ```bash
   npm run blockchain:deploy -- --network sepolia
   ```

## Troubleshooting

### Common Issues

1. **"Contract not found"**
   - Ensure blockchain node is running
   - Verify CONTRACT_ADDRESS is set correctly
   - Redeploy contract if needed

2. **"Database connection failed"**
   - Check MongoDB is running
   - Verify MONGODB_URI is correct
   - Check network connectivity for Atlas

3. **"MetaMask connection failed"**
   - Ensure MetaMask is installed
   - Check network is added correctly
   - Verify account has ETH for gas

4. **"Port already in use"**
   - Change PORT in `.env`
   - Kill existing processes: `pkill -f node`

### Reset Everything

```bash
# Stop all processes
pkill -f node
pkill -f hardhat

# Clean and reinstall
rm -rf node_modules package-lock.json
npm install

# Restart blockchain
npm run blockchain:node
# In new terminal:
npm run blockchain:setup
```

## Production Deployment

For production deployment, update:

1. Use production MongoDB (Atlas recommended)
2. Deploy to mainnet or stable testnet
3. Use production IPFS service
4. Set strong JWT_SECRET
5. Configure proper CORS settings
6. Use HTTPS for all endpoints

## Support

If you encounter issues:

1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure all services are running
4. Check network connectivity
5. Review the troubleshooting section above

For additional help, check the project documentation or create an issue in the repository.