const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private async handleResponse(response: Response) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'An error occurred');
    }
    return data;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
        ...(!(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      ...options,
    };

    // Remove Content-Type for FormData to let browser set it with boundary
    if (options.body instanceof FormData) {
      delete (config.headers as any)['Content-Type'];
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      return this.handleResponse(response);
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // ==================== AUTH ====================
  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: any) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async verifyWallet(walletData: any) {
    return this.request('/auth/verify-wallet', {
      method: 'POST',
      body: JSON.stringify(walletData),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // ==================== PROPERTIES ====================
  async getProperties(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/properties${queryString ? `?${queryString}` : ''}`);
  }

  async getProperty(id: string) {
    return this.request(`/properties/${id}`);
  }

  async registerProperty(propertyData: FormData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/properties/register`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: propertyData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Property registration failed');
    }

    return await response.json();
  }

  async listProperty(id: string, listingData: any) {
    return this.request(`/properties/${id}/list`, {
      method: 'POST',
      body: JSON.stringify(listingData),
    });
  }

  async getUserProperties() {
    return this.request('/properties/user/owned');
  }

  // ==================== TRANSACTIONS ====================
  async initiateTransaction(transactionData: any) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  async getPendingTransactions() {
    return this.request('/transactions/pending');
  }

  async approveTransaction(id: string) {
    return this.request(`/transactions/${id}/approve`, {
      method: 'PUT',
    });
  }

  async rejectTransaction(id: string, reason: string) {
    return this.request(`/transactions/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  async getPropertyTransactions(propertyId: string) {
    return this.request(`/transactions/property/${propertyId}`);
  }

  async getUserTransactions() {
    return this.request('/transactions/user/history');
  }

  async verifyCertificate(certificateHash: string) {
    return this.request(`/transactions/verify/${certificateHash}`);
  }

  // ==================== USER VERIFICATION ====================
  async submitVerificationDocuments(formData: FormData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/users/verification/submit`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Document submission failed');
    }

    return await response.json();
  }

  async getPendingVerifications() {
    return this.request('/users/verification/pending');
  }

  async verifyUser(userId: string, verificationData: any) {
    return this.request(`/users/verification/${userId}/verify`, {
      method: 'PUT',
      body: JSON.stringify(verificationData),
    });
  }

  // ==================== LANDS ====================
  async addLand(landData: FormData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/lands/add`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: landData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Land addition failed');
    }

    return await response.json();
  }

  async getLands(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/lands${queryString ? `?${queryString}` : ''}`);
  }

  async getLandById(landId: string) {
    return this.request(`/lands/land/${landId}`);
  }

  async getMyLands() {
    return this.request('/lands/my-lands');
  }

  async getOwnedLandsByUserId(userId: string, params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/lands/owned-by/${userId}${queryString ? `?${queryString}` : ''}`);
  }


  async getLandsForSale(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/lands/for-sale${queryString ? `?${queryString}` : ''}`);
  }

  async getMarketplaceLands(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/lands/marketplace${queryString ? `?${queryString}` : ''}`);
  }

  async digitalizeLand(landId: string) {
    if (!landId) throw new Error("❌ No landId provided to digitalize");
    return this.request(`/lands/digitalize`, {
      method: 'POST',
      body: JSON.stringify({ landId }),
    });
  }

  async searchLand(assetId: string) {
    return this.request(`/lands/search/${assetId}`);
  }

  async downloadCertificate(landId: string) {
    const response = await fetch(`${API_BASE_URL}/lands/${landId}/certificate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Failed to download certificate');
    }

    return response.blob();
  }

  async downloadOriginalDocument(landId: string) {
    const response = await fetch(`${API_BASE_URL}/lands/${landId}/original-document`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Failed to download original document');
    }

    return response.blob();
  }

  async checkDocumentStatus(landId: string) {
    const response = await fetch(`${API_BASE_URL}/lands/${landId}/document-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Failed to check document status');
    }

    return response.json();
  }

  async claimLandOwnership(landId: string) {
    return this.request(`/lands/${landId}/claim`, {
      method: 'POST',
    });
  }

  async listLandForSale(landId: string, saleData: any, images?: File[]) {
    const formData = new FormData();
    
    // Add text fields
    formData.append('askingPrice', saleData.askingPrice.toString());
    if (saleData.description) {
      formData.append('description', saleData.description);
    }
    if (saleData.features) {
      formData.append('features', JSON.stringify(saleData.features));
    }
    if (saleData.nearbyAmenities) {
      formData.append('nearbyAmenities', JSON.stringify(saleData.nearbyAmenities));
    }
    
    // Add image files
    if (images && images.length > 0) {
      images.forEach((image, index) => {
        formData.append('images', image);
      });
    }
    
    return this.request(`/lands/${landId}/list-for-sale`, {
      method: 'POST',
      body: formData,
    });
  }

  async verifyLandByAssetId(assetId: string) {
    return this.request(`/lands/verify/${assetId}`);
  }

  async getNearbyLands(latitude: number, longitude: number, maxDistance?: number) {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      ...(maxDistance && { maxDistance: maxDistance.toString() }),
    });
    return this.request(`/lands/nearby?${params}`);
  }

  // ==================== CHAT ====================
  async startChat(landId: string) {
    return this.request('/chat/start', {
      method: 'POST',
      body: JSON.stringify({ landId }),
    });
  }

  async getMyChats() {
    return this.request('/chat/my-chats');
  }

  async getChat(chatId: string) {
    return this.request(`/chat/${chatId}`);
  }

  async sendMessage(chatId: string, messageData: any) {
    return this.request(`/chat/${chatId}/message`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async makeOffer(chatId: string, offerAmount: number) {
    return this.request(`/chat/${chatId}/offer`, {
      method: 'POST',
      body: JSON.stringify({ offerAmount }),
    });
  }

  async makeCounterOffer(chatId: string, counterAmount: number) {
    return this.request(`/chat/${chatId}/counter-offer`, {
      method: 'POST',
      body: JSON.stringify({ counterAmount }),
    });
  }

  async acceptOffer(chatId: string) {
    return this.request(`/chat/${chatId}/accept`, {
      method: 'POST',
    });
  }

  // ==================== LAND TRANSACTIONS ====================
  async initiateLandTransaction(chatId: string) {
    return this.request('/land-transactions/purchase', {
      method: 'POST',
      body: JSON.stringify({ chatId }),
    });
  }

  async purchaseLand(landId: string, offerPrice: number) {
    return this.request(`/lands/${landId}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ offerPrice }),
    });
  }

  async submitTransactionDocuments(transactionId: string, documents: FormData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/land-transactions/${transactionId}/documents`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: documents,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Document submission failed');
    }

    return await response.json();
  }

  async getPendingLandTransactions() {
    return this.request('/land-transactions/pending-review');
  }

  async reviewLandTransaction(transactionId: string, reviewData: any) {
    return this.request(`/land-transactions/${transactionId}/review`, {
      method: 'PUT',
      body: JSON.stringify(reviewData),
    });
  }

  async getMyLandTransactions() {
    return this.request('/land-transactions/my-transactions');
  }

  async getLandTransaction(transactionId: string) {
    return this.request(`/land-transactions/${transactionId}`);
  }

  async verifyOwnership(transactionId: string) {
    return this.request(`/land-transactions/verify/${transactionId}`);
  }

  // ==================== 2FA ====================
  async setupTwoFactor() {
    return this.request('/auth/2fa/setup', { method: 'POST' });
  }

  async verifyTwoFactor(data: { token: string }) {
    console.log('Verifying 2FA with token:', data.token);
    const response = await fetch(`${API_BASE_URL}/2fa/verify`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ token: data.token }) // Only send token
    });
    const result = await this.handleResponse(response);
    console.log('2FA verify response:', result);
    return result;
  }

  async disableTwoFactor(data: any) {
    return this.request('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== AUDIT ====================
  async getAuditLogs(dateRange: any) {
    const params = new URLSearchParams(dateRange);
    return this.request(`/audit/logs?${params}`);
  }

  async getSystemStatistics(dateRange: any) {
    const params = new URLSearchParams(dateRange);
    return this.request(`/audit/statistics?${params}`);
  }

  async exportAuditReport(dateRange: any) {
    const params = new URLSearchParams(dateRange);
    const response = await fetch(`${API_BASE_URL}/audit/export?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      throw new Error('Failed to export audit report');
    }

    return response;
  }
}

export default new ApiService();
