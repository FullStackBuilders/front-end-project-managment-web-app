import ApiService from './ApiService';

export const userApi = {
  getUserProfile: async () => {
    try {
      const response = await ApiService.get('/api/users/profile');
      return response;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }
};