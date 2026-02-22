// Central API service for backend communication
const raw = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
// Ensure base URL ends with /api so paths like "auth/login" become /api/auth/login
const API_BASE_URL = raw.endsWith('/api') ? raw.replace(/\/+$/, '') : raw.replace(/\/?$/, '') + '/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this._authToken = null;
  }

  setAuthToken(token) {
    this._authToken = token;
  }

  getAuthToken() {
    return this._authToken;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const authHeaders = {};
    if (this._authToken) {
      authHeaders['Authorization'] = `Bearer ${this._authToken}`;
    }

    const isFormData = options.body instanceof FormData;

    const defaultHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...authHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Handle non-JSON responses (like audio files)
      if (options.responseType === 'blob') {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.blob();
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(url, {
      method: 'GET',
    });
  }

  // POST request
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Upload file
  async uploadFile(endpoint, file, additionalData = {}) {
    const formData = new FormData();
    formData.append('image', file);

    // Add additional form data
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    return this.request(endpoint, {
      method: 'POST',
      headers: {}, // Remove Content-Type to let browser set it with boundary
      body: formData,
    });
  }

  // Get blob (for audio files)
  async getBlob(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(url, {
      method: 'GET',
      responseType: 'blob',
    });
  }

  // Post for blob response (for audio generation)
  async postBlob(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      responseType: 'blob',
    });
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;