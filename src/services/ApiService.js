import AuthService from './AuthService';
import CustomApiError from './CustomApiError'; // ✅ Make sure this path is correct

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

  // ✅ Updated error handler using CustomApiError
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

    // ✅ Throw enhanced error object with status, data, and isConflict
    throw new CustomApiError(errorMessage, response.status, errorData);
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
