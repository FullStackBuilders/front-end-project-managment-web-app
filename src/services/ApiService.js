import AuthService from './AuthService';
import CustomApiError from './CustomApiError'; 

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

  async handleErrorResponse(response) {
    let errorMessage = 'Request failed';
    let errorData = null;

    try {
      const responseBody = await response.json();
      errorData = responseBody;
      errorMessage = responseBody.message || responseBody.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    throw new CustomApiError(errorMessage, response.status, errorData);
  }

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
