import apiService from './apiService';

// Story management service for CRUD operations
class StoryService {
  // Get all stories for a user
  async getAllStories(userId = null, limit = 50, offset = 0) {
    try {
      const params = { limit, offset };
      if (userId) params.userId = userId;

      const response = await apiService.get('/stories', params);

      if (response.success) {
        return {
          stories: response.data,
          pagination: response.pagination
        };
      } else {
        throw new Error(response.error || 'Failed to fetch stories');
      }
    } catch (error) {
      console.error('Error fetching stories:', error);

      // Fallback to localStorage for offline mode
      return this.getStoriesFromLocalStorage();
    }
  }

  // Get a specific story by ID
  async getStoryById(id) {
    try {
      const response = await apiService.get(`/stories/${id}`);

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Story not found');
      }
    } catch (error) {
      console.error('Error fetching story:', error);

      // Fallback to localStorage
      const stories = JSON.parse(localStorage.getItem('userStories') || '[]');
      return stories.find(story => story.id === id) || null;
    }
  }

  // Create a new story
  async createStory(storyData) {
    try {
      const response = await apiService.post('/stories', storyData);

      if (response.success) {
        // Also save to localStorage as backup
        this.saveToLocalStorage(response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create story');
      }
    } catch (error) {
      console.error('Error creating story:', error);

      // Fallback to localStorage only
      const story = {
        id: this.generateId(),
        ...storyData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.saveToLocalStorage(story);
      return story;
    }
  }

  // Update an existing story
  async updateStory(id, updateData) {
    try {
      const response = await apiService.put(`/stories/${id}`, updateData);

      if (response.success) {
        // Update localStorage backup
        this.updateInLocalStorage(response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to update story');
      }
    } catch (error) {
      console.error('Error updating story:', error);

      // Fallback to localStorage
      const stories = JSON.parse(localStorage.getItem('userStories') || '[]');
      const index = stories.findIndex(story => story.id === id);

      if (index !== -1) {
        stories[index] = { ...stories[index], ...updateData, updatedAt: new Date().toISOString() };
        localStorage.setItem('userStories', JSON.stringify(stories));
        return stories[index];
      }

      throw new Error('Story not found');
    }
  }

  // Delete a story
  async deleteStory(id) {
    try {
      const response = await apiService.delete(`/stories/${id}`);

      if (response.success) {
        // Remove from localStorage backup
        this.removeFromLocalStorage(id);
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete story');
      }
    } catch (error) {
      console.error('Error deleting story:', error);

      // Fallback to localStorage
      const stories = JSON.parse(localStorage.getItem('userStories') || '[]');
      const filteredStories = stories.filter(story => story.id !== id);
      localStorage.setItem('userStories', JSON.stringify(filteredStories));
      return true;
    }
  }

  // Upload image for story
  async uploadImage(file, options = {}) {
    try {
      const response = await apiService.uploadFile('/upload/image', file, options);

      if (response.success) {
        return {
          url: response.data.url,
          key: response.data.key,
          originalName: response.data.originalName
        };
      } else {
        throw new Error(response.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);

      // Fallback: create a local object URL for preview
      return {
        url: URL.createObjectURL(file),
        key: `local-${Date.now()}`,
        originalName: file.name,
        isLocal: true
      };
    }
  }

  // Helper methods for localStorage fallback
  getStoriesFromLocalStorage() {
    const stories = JSON.parse(localStorage.getItem('userStories') || '[]');
    return {
      stories: stories,
      pagination: {
        limit: 50,
        offset: 0,
        count: stories.length
      }
    };
  }

  saveToLocalStorage(story) {
    const existingStories = JSON.parse(localStorage.getItem('userStories') || '[]');
    existingStories.unshift(story); // Add to beginning
    localStorage.setItem('userStories', JSON.stringify(existingStories));
  }

  updateInLocalStorage(updatedStory) {
    const stories = JSON.parse(localStorage.getItem('userStories') || '[]');
    const index = stories.findIndex(story => story.id === updatedStory.id);

    if (index !== -1) {
      stories[index] = updatedStory;
    } else {
      stories.unshift(updatedStory);
    }

    localStorage.setItem('userStories', JSON.stringify(stories));
  }

  removeFromLocalStorage(storyId) {
    const stories = JSON.parse(localStorage.getItem('userStories') || '[]');
    const filteredStories = stories.filter(story => story.id !== storyId);
    localStorage.setItem('userStories', JSON.stringify(filteredStories));
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Sync localStorage stories to backend (when connection is restored)
  async syncLocalStorageToBackend() {
    try {
      const localStories = JSON.parse(localStorage.getItem('userStories') || '[]');
      const syncResults = [];

      for (const story of localStories) {
        if (!story.synced) {
          try {
            const backendStory = await this.createStory(story);
            story.synced = true;
            syncResults.push({ success: true, story: backendStory });
          } catch (error) {
            syncResults.push({ success: false, error: error.message, story });
          }
        }
      }

      // Update localStorage with sync status
      localStorage.setItem('userStories', JSON.stringify(localStories));
      return syncResults;
    } catch (error) {
      console.error('Error syncing stories to backend:', error);
      return [];
    }
  }
}

// Create singleton instance
const storyService = new StoryService();

export default storyService;