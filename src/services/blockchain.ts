import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface ContractInfo {
  contractAddress: string;
  propertyCounter: number;
  transactionCounter: number;
  owner: string;
  network: any;
}

interface Property {
  id: number;
  ipfsHash: string;
  owner: string;
  location: string;
  size: number;
  valuation: string;
  status: number;
  registrationDate: Date;
  isVerified: boolean;
}

class BlockchainService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  
  private contractABI = [
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
    "function transactionCounter() external view returns (uint256)"
  ];

  async connectWallet() {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();

      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      
      // Check if we're on Ganache network
      if (network.chainId !== 5777) {
        console.warn(`Connected to chain ID ${network.chainId}, but expected Ganache (5777)`);
        // Try to switch to Ganache
        try {
          await this.switchToGanache();
          const newNetwork = await this.provider.getNetwork();
          console.log('Switched to Ganache network');
        } catch (switchError) {
          console.warn('Could not switch to Ganache network:', switchError);
        }
      }

      // Initialize contract if address is available
      if (this.contractAddress) {
        this.contract = new ethers.Contract(
          this.contractAddress,
          this.contractABI,
          this.signer
        );
        
        // Verify contract exists
        try {
          const code = await this.provider.getCode(this.contractAddress);
          if (code === '0x') {
            console.warn('Contract not deployed at specified address');
          }
        } catch (error) {
          console.warn('Could not verify contract deployment:', error);
        }
      }

      console.log('Wallet connected:', address);
      console.log('Network Chain ID:', network.chainId);

      return {
        address,
        network: network.chainId === 5777 ? 'Ganache Local' : network.name || 'Unknown',
        chainId: network.chainId
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }
  
  async switchToGanache() {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      // Try to switch to Ganache network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1695' }], // 5777 in hex
      });
    } catch (error: any) {
      // Network not added to MetaMask, add it
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x1695', // 5777 in hex
            chainName: 'Ganache Local',
            rpcUrls: ['http://127.0.0.1:7545'],
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            blockExplorerUrls: null,
          }],
        });
      } else {
        throw error;
      }
    }
  }

  async signMessage(message: string) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this.signer.signMessage(message);
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  async getBalance(address: string) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  async getProperty(propertyId: number): Promise<Property> {
    if (!this.contract) {
      throw new Error('Contract not initialized. Please connect your wallet first.');
    }

    try {
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
        isVerified: property.isVerified
      };
    } catch (error) {
      console.error('Error getting property:', error);
      throw new Error(`Failed to get property: ${error}`);
    }
  }

  async getOwnerProperties(ownerAddress: string): Promise<number[]> {
    if (!this.contract) {
      throw new Error('Contract not initialized. Please connect your wallet first.');
    }

    try {
      const propertyIds = await this.contract.getOwnerProperties(ownerAddress);
      return propertyIds.map((id: ethers.BigNumber) => id.toNumber());
    } catch (error) {
      console.error('Error getting owner properties:', error);
      throw new Error(`Failed to get owner properties: ${error}`);
    }
  }

  async initiateTransaction(propertyId: number, to: string, type: string, amount: string) {
    if (!this.contract) {
      throw new Error('Contract not initialized. Please connect your wallet first.');
    }

    try {
      const typeNumber = this.getTransactionTypeNumber(type);
      
      // Estimate gas
      const gasEstimate = await this.contract.estimateGas.initiateTransaction(
        propertyId,
        to,
        typeNumber,
        ethers.utils.parseEther(amount)
      );

      const gasLimit = gasEstimate.mul(120).div(100); // Add 20% buffer

      const tx = await this.contract.initiateTransaction(
        propertyId,
        to,
        typeNumber,
        ethers.utils.parseEther(amount),
        { gasLimit }
      );
      
      console.log('Transaction initiated:', tx.hash);
      return await tx.wait();
    } catch (error) {
      console.error('Error initiating transaction:', error);
      throw new Error(`Transaction initiation failed: ${error}`);
    }
  }

  async getContractInfo(): Promise<ContractInfo> {
    if (!this.contract) {
      throw new Error('Contract not initialized. Please connect your wallet first.');
    }

    try {
      const [propertyCounter, transactionCounter, owner] = await Promise.all([
        this.contract.propertyCounter(),
        this.contract.transactionCounter(),
        this.contract.owner()
      ]);

      const network = await this.provider!.getNetwork();

      return {
        contractAddress: this.contractAddress!,
        propertyCounter: propertyCounter.toNumber(),
        transactionCounter: transactionCounter.toNumber(),
        owner,
        network
      };
    } catch (error) {
      console.error('Error getting contract info:', error);
      throw error;
    }
  }

  async isAdmin(address: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized. Please connect your wallet first.');
    }

    try {
      return await this.contract.admins(address);
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  private getTransactionTypeNumber(type: string): number {
    const types: { [key: string]: number } = {
      'REGISTRATION': 0,
      'SALE': 1,
      'RENT': 2,
      'TRANSFER': 3
    };
    return types[type] || 0;
  }

  onAccountsChanged(callback: (accounts: string[]) => void) {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', callback);
    }
  }

  onChainChanged(callback: (chainId: string) => void) {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', callback);
    }
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
  }
}

export default new BlockchainService();