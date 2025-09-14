require("dotenv").config(); // <-- Add this line at the very top

const { ethers } = require("ethers");

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.wallet = null;
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.contractABI = [
      // Property registration
      "function registerProperty(address _owner, string memory _ipfsHash, string memory _location, uint256 _size, uint256 _valuation) external returns (uint256)",

      // Transaction management
      "function initiateTransaction(uint256 _propertyId, address _to, uint8 _type, uint256 _amount) external returns (uint256)",
      "function approveTransaction(uint256 _propertyId, uint256 _transactionIndex, string memory _certificateHash) external",

      // Property queries
      "function getProperty(uint256 _propertyId) external view returns (tuple(uint256 id, string ipfsHash, address owner, string location, uint256 size, uint256 valuation, uint8 status, uint256 registrationDate, bool isVerified))",
      "function getPropertyTransactions(uint256 _propertyId) external view returns (tuple(uint256 propertyId, address from, address to, uint8 transactionType, uint256 amount, uint256 timestamp, bool isApproved, string certificateHash)[])",
      "function getOwnerProperties(address _owner) external view returns (uint256[])",

      // Property management
      "function updatePropertyStatus(uint256 _propertyId, uint8 _status) external",

      // Admin functions
      "function addAdmin(address _admin) external",
      "function removeAdmin(address _admin) external",
      "function admins(address) external view returns (bool)",
      "function owner() external view returns (address)",

      // Counters
      "function propertyCounter() external view returns (uint256)",
      "function transactionCounter() external view returns (uint256)",

      // Events
      "event PropertyRegistered(uint256 indexed propertyId, address indexed owner, string location)",
      "event TransactionInitiated(uint256 indexed transactionId, uint256 indexed propertyId, address indexed from, address to)",
      "event TransactionApproved(uint256 indexed transactionId, uint256 indexed propertyId)",
      "event OwnershipTransferred(uint256 indexed propertyId, address indexed from, address indexed to)",
    ];
  }

  async initialize() {
    try {
      // Connect to Ethereum network
      const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:7545";
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      // Test connection
      const network = await this.provider.getNetwork();
      console.log(
        `Connected to blockchain network: Chain ID ${network.chainId}`
      );

      if (network.chainId === 5777) {
        console.log("✅ Connected to Ganache local network");
      } else if (network.chainId === 1337) {
        console.log("✅ Connected to Hardhat local network");
      } else {
        console.log(`✅ Connected to network: ${network.name}`);
      }

      // Create wallet from private key
      const privateKey = process.env.ADMIN_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error("ADMIN_PRIVATE_KEY not found in environment variables");
      }

      this.wallet = new ethers.Wallet(privateKey, this.provider);
      console.log(`Admin wallet address: ${this.wallet.address}`);

      // Check wallet balance
      const balance = await this.provider.getBalance(this.wallet.address);
      console.log(
        `Admin wallet balance: ${ethers.utils.formatEther(balance)} ETH`
      );

      // Initialize contract
      if (!this.contractAddress) {
        console.warn(
          "⚠️  CONTRACT_ADDRESS not found. Please deploy the contract first."
        );
        console.warn("Run: npm run blockchain:deploy:ganache");
        return;
      }

      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.wallet
      );

      // Verify contract is deployed
      const code = await this.provider.getCode(this.contractAddress);
      if (code === "0x") {
        throw new Error(
          `Contract not found at address: ${this.contractAddress}`
        );
      }

      // Verify admin status
      const isAdmin = await this.contract.admins(this.wallet.address);
      console.log(
        `Admin wallet status: ${isAdmin ? "✅ Verified Admin" : "❌ Not Admin"}`
      );

      console.log("✅ Blockchain service initialized successfully");
    } catch (error) {
      console.error(
        "❌ Failed to initialize blockchain service:",
        error.message
      );
      if (error.message.includes("CONTRACT_ADDRESS")) {
        console.log(
          "💡 Solution: Deploy the contract first with: npm run blockchain:deploy:ganache"
        );
      }
      // Don't throw error to allow server to start without blockchain
      console.warn("⚠️  Server starting without blockchain connection");
    }
  }

  async registerProperty(owner, ipfsHash, location, size, valuation) {
    try {
      if (!this.contract) throw new Error("Contract not initialized");

      console.log("Registering property on blockchain...");
      console.log({ owner, ipfsHash, location, size, valuation });

      // Estimate gas
      const gasEstimate = await this.contract.estimateGas.registerProperty(
        owner,
        ipfsHash,
        location,
        ethers.BigNumber.from(size.toString()),
        ethers.utils.parseEther(valuation.toString())
      );

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);

      const tx = await this.contract.registerProperty(
        owner,
        ipfsHash,
        location,
        ethers.BigNumber.from(size.toString()),
        ethers.utils.parseEther(valuation.toString()),
        { gasLimit }
      );

      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log(
        "Property registered successfully. Gas used:",
        receipt.gasUsed.toString()
      );

      return receipt;
    } catch (error) {
      console.error("Error registering property:", error);
      throw new Error(`Blockchain registration failed: ${error.message}`);
    }
  }

  async getProperty(propertyId) {
    try {
      if (!this.contract) throw new Error("Contract not initialized");

      const property = await this.contract.getProperty(propertyId);

      return {
        id: property.id.toNumber(),
        ipfsHash: property.ipfsHash,
        owner: property.owner,
        location: property.location,
        size: property.size.toNumber(),
        valuation: ethers.utils.formatEther(property.valuation),
        status: property.status,
        registrationDate: new Date(property.registrationDate.toNumber() * 1000),
        isVerified: property.isVerified,
      };
    } catch (error) {
      console.error("Error getting property:", error);
      throw new Error(`Failed to get property: ${error.message}`);
    }
  }

  async initiateTransaction(propertyId, to, type, amount) {
    try {
      if (!this.contract) throw new Error("Contract not initialized");

      console.log("Initiating transaction on blockchain...");

      const gasEstimate = await this.contract.estimateGas.initiateTransaction(
        propertyId,
        to,
        type,
        ethers.utils.parseEther(amount.toString())
      );

      const gasLimit = gasEstimate.mul(120).div(100);

      const tx = await this.contract.initiateTransaction(
        propertyId,
        to,
        type,
        ethers.utils.parseEther(amount.toString()),
        { gasLimit }
      );

      console.log("Transaction initiated:", tx.hash);
      return await tx.wait();
    } catch (error) {
      console.error("Error initiating transaction:", error);
      throw new Error(`Transaction initiation failed: ${error.message}`);
    }
  }

  async approveTransaction(propertyId, transactionIndex, certificateHash) {
    try {
      if (!this.contract) throw new Error("Contract not initialized");

      console.log("Approving transaction on blockchain...");

      const gasEstimate = await this.contract.estimateGas.approveTransaction(
        propertyId,
        transactionIndex,
        certificateHash
      );

      const gasLimit = gasEstimate.mul(120).div(100);

      const tx = await this.contract.approveTransaction(
        propertyId,
        transactionIndex,
        certificateHash,
        { gasLimit }
      );

      console.log("Transaction approved:", tx.hash);
      return await tx.wait();
    } catch (error) {
      console.error("Error approving transaction:", error);
      throw new Error(`Transaction approval failed: ${error.message}`);
    }
  }

  async getOwnerProperties(ownerAddress) {
    try {
      if (!this.contract) throw new Error("Contract not initialized");

      const propertyIds = await this.contract.getOwnerProperties(ownerAddress);
      return propertyIds.map((id) => id.toNumber());
    } catch (error) {
      console.error("Error getting owner properties:", error);
      throw new Error(`Failed to get owner properties: ${error.message}`);
    }
  }

  async getPropertyTransactions(propertyId) {
    try {
      if (!this.contract) throw new Error("Contract not initialized");

      const transactions = await this.contract.getPropertyTransactions(
        propertyId
      );

      return transactions.map((tx) => ({
        propertyId: tx.propertyId.toNumber(),
        from: tx.from,
        to: tx.to,
        transactionType: tx.transactionType,
        amount: ethers.utils.formatEther(tx.amount),
        timestamp: new Date(tx.timestamp.toNumber() * 1000),
        isApproved: tx.isApproved,
        certificateHash: tx.certificateHash,
      }));
    } catch (error) {
      console.error("Error getting property transactions:", error);
      throw new Error(`Failed to get property transactions: ${error.message}`);
    }
  }

  async updatePropertyStatus(propertyId, status) {
    try {
      if (!this.contract) throw new Error("Contract not initialized");

      const tx = await this.contract.updatePropertyStatus(propertyId, status);
      return await tx.wait();
    } catch (error) {
      console.error("Error updating property status:", error);
      throw new Error(`Status update failed: ${error.message}`);
    }
  }

  async getContractInfo() {
    try {
      if (!this.contract) throw new Error("Contract not initialized");

      const [propertyCounter, transactionCounter, owner] = await Promise.all([
        this.contract.propertyCounter(),
        this.contract.transactionCounter(),
        this.contract.owner(),
      ]);

      return {
        contractAddress: this.contractAddress,
        propertyCounter: propertyCounter.toNumber(),
        transactionCounter: transactionCounter.toNumber(),
        owner,
        network: await this.provider.getNetwork(),
      };
    } catch (error) {
      console.error("Error getting contract info:", error);
      throw error;
    }
  }

  // Utility function to convert transaction types
  getTransactionTypeNumber(type) {
    const types = {
      REGISTRATION: 0,
      SALE: 1,
      RENT: 2,
      TRANSFER: 3,
    };
    return types[type] || 0;
  }

  // Utility function to convert property status
  getPropertyStatusNumber(status) {
    const statuses = {
      AVAILABLE: 0,
      FOR_SALE: 1,
      FOR_RENT: 2,
      SOLD: 3,
      RENTED: 4,
    };
    return statuses[status] || 0;
  }
}

module.exports = new BlockchainService();
