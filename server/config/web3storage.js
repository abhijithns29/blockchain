// Alternative free IPFS service using Web3.Storage
// Web3.Storage provides 1TB free storage
const axios = require('axios');
const FormData = require('form-data');

class Web3StorageService {
  constructor() {
    // Web3.Storage is completely free up to 1TB
    this.apiUrl = 'https://api.web3.storage';
    this.gatewayUrl = 'https://w3s.link/ipfs/';
    // You can get a free API token from https://web3.storage
    this.apiToken = process.env.WEB3_STORAGE_TOKEN || null;
  }

  async uploadFile(fileBuffer, fileName) {
    try {
      if (!this.apiToken) {
        console.warn('Web3.Storage token not provided, using local storage fallback');
        return this.localStorageFallback(fileBuffer, fileName);
      }

      const formData = new FormData();
      formData.append('file', fileBuffer, fileName);

      const response = await axios.post(`${this.apiUrl}/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          ...formData.getHeaders(),
        },
      });

      return response.data.cid;
    } catch (error) {
      console.error('Web3.Storage upload failed, using fallback:', error.message);
      return this.localStorageFallback(fileBuffer, fileName);
    }
  }

  async uploadJSON(jsonData) {
    try {
      const jsonString = JSON.stringify(jsonData);
      const buffer = Buffer.from(jsonString);
      return await this.uploadFile(buffer, 'metadata.json');
    } catch (error) {
      console.error('Error uploading JSON:', error);
      throw error;
    }
  }

  localStorageFallback(fileBuffer, fileName) {
    // Fallback to local storage when no API token is available
    const crypto = require('crypto');
    const fs = require('fs');
    const path = require('path');
    
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    hash.update(fileName);
    hash.update(Date.now().toString());
    const fileHash = 'Qm' + hash.digest('hex').substring(0, 44);
    
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(uploadsDir, fileHash), fileBuffer);
    return fileHash;
  }

  getFileUrl(hash) {
    if (this.apiToken) {
      return `${this.gatewayUrl}${hash}`;
    }
    // Local fallback URL
    return `http://localhost:${process.env.PORT || 5000}/uploads/${hash}`;
  }
}

module.exports = new Web3StorageService();