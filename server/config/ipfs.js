const axios = require('axios');
const FormData = require('form-data');

class IPFSService {
  constructor() {
    this.gatewayUrl = 'https://ipfs.io/ipfs/';
    this.uploadUrl = 'https://api.pinata.cloud/pinning/pinFileToIPFS'; // Free tier available
    this.jsonUploadUrl = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    // Using a free public IPFS node for uploads
    this.publicUploadUrl = 'https://api.web3.storage/upload'; // Free service
  }

  async initialize() {
    try {
      // Using free public IPFS - no initialization needed
      console.log('Free IPFS service initialized');
    } catch (error) {
      console.error('Failed to initialize IPFS service:', error);
    }
  }

  async uploadFile(fileBuffer, fileName) {
    try {
      // Using a simple approach with a free IPFS service
      // For production, you might want to use Web3.Storage or similar free services
      
      // Simulate IPFS upload by creating a hash-like identifier
      // In a real implementation, you would use a free service like Web3.Storage
      const hash = this.generateHash(fileBuffer, fileName);
      
      // Store file locally for demo purposes (in production, use actual IPFS)
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '../uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(uploadsDir, hash), fileBuffer);
      
      console.log(`File uploaded to IPFS with hash: ${hash}`);
      return hash;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  }

  async uploadJSON(jsonData) {
    try {
      const jsonString = JSON.stringify(jsonData);
      const buffer = Buffer.from(jsonString);
      const hash = this.generateHash(buffer, 'metadata.json');
      
      // Store JSON locally for demo purposes
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '../uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(uploadsDir, hash), jsonString);
      
      return hash;
    } catch (error) {
      console.error('Error uploading JSON to IPFS:', error);
      throw error;
    }
  }

  generateHash(buffer, fileName) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    hash.update(fileName);
    hash.update(Date.now().toString());
    return 'Qm' + hash.digest('hex').substring(0, 44); // IPFS-like hash format
  }

  async downloadFile(hash) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Validate hash
      if (!hash || typeof hash !== 'string') {
        throw new Error('Invalid file hash provided');
      }
      
      const filePath = path.join(__dirname, '../uploads', hash);
      console.log(`Attempting to download file: ${hash} from path: ${filePath}`);
      
      // Check if file exists locally first
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
          throw new Error('File exists but is empty');
        }
        console.log(`File found locally: ${hash}, size: ${stats.size} bytes`);
        return fs.readFileSync(filePath);
      }
      
      console.log(`File not found locally: ${hash}, attempting IPFS gateway...`);
      
      // If not found locally, try to fetch from IPFS gateway
      try {
        const response = await axios.get(`${this.gatewayUrl}${hash}`, {
          responseType: 'arraybuffer',
          timeout: 10000 // 10 second timeout
        });
        
        if (response.data && response.data.byteLength > 0) {
          console.log(`File downloaded from IPFS gateway: ${hash}, size: ${response.data.byteLength} bytes`);
          return Buffer.from(response.data);
        } else {
          throw new Error('Empty response from IPFS gateway');
        }
      } catch (gatewayError) {
        console.error(`IPFS gateway error for hash ${hash}:`, gatewayError.message);
        throw new Error(`File not found locally or on IPFS gateway: ${hash}`);
      }
      
    } catch (error) {
      console.error('Error downloading file from IPFS:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  getFileUrl(hash) {
    // Always serve from local server since files are stored locally
    const port = process.env.PORT || 5000;
    const host = process.env.HOST || 'localhost';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    return `${protocol}://${host}:${port}/uploads/${hash}`;
  }

  // Helper method to check if file exists locally
  async fileExists(hash) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (!hash || typeof hash !== 'string') {
        return false;
      }
      
      const filePath = path.join(__dirname, '../uploads', hash);
      return fs.existsSync(filePath);
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  // Helper method to get file info
  async getFileInfo(hash) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (!hash || typeof hash !== 'string') {
        return null;
      }
      
      const filePath = path.join(__dirname, '../uploads', hash);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const stats = fs.statSync(filePath);
      return {
        exists: true,
        size: stats.size,
        path: filePath,
        modified: stats.mtime
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }
}

module.exports = new IPFSService();