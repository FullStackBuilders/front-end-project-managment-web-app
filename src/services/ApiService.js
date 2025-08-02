import AuthService from './AuthService';

const API_BASE_URL = 'http://localhost:8080';

class ApiService {
  // Base authenticated request method
  async authenticatedRequest(endpoint, options = {}) {
    const token = AuthService.getToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Check if token is expired
    if (!AuthService.isAuthenticated()) {
      AuthService.logout();
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Handle empty responses
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Error handling
  async handleErrorResponse(response) {
    let errorMessage = 'Request failed';
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    // Handle specific status codes
    switch (response.status) {
      case 401:
        AuthService.logout();
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      
      case 403:
        throw new Error('You do not have permission to perform this action.');
      
      case 404:
        throw new Error('Resource not found.');
      
      default:
        throw new Error(errorMessage);
    }
  }

  // HTTP Method Helpers
  async get(endpoint) {
    return this.authenticatedRequest(endpoint, { method: 'GET' });
  }

  async post(endpoint, data = null) {
    return this.authenticatedRequest(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async put(endpoint, data = null) {
    return this.authenticatedRequest(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async delete(endpoint) {
    return this.authenticatedRequest(endpoint, { method: 'DELETE' });
  }
}

export default new ApiService();