import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import storyService from '../services/storyService';
import './Library.css';

const Library = () => {
  const [stories, setStories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const result = await storyService.getAllStories();
      setStories(result.stories);
    } catch (error) {
      console.error('Error loading stories:', error);
      // Fallback to localStorage
      const userStories = JSON.parse(localStorage.getItem('userStories') || '[]');
      setStories(userStories);
    }
  };

  const readStory = (story) => {
    localStorage.setItem('currentStory', JSON.stringify(story));
    navigate('/story');
  };

  const deleteStory = async (index) => {
    const story = stories[index];
    if (window.confirm('Are you sure you want to delete this story?')) {
      try {
        await storyService.deleteStory(story.id);
        // Reload stories after successful deletion
        await loadStories();
      } catch (error) {
        console.error('Error deleting story:', error);
        // Fallback to local deletion
        const updatedStories = stories.filter((_, i) => i !== index);
        setStories(updatedStories);
        localStorage.setItem('userStories', JSON.stringify(updatedStories));
      }
    }
  };

  const goHome = () => {
    navigate('/upload');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="library-screen">
      <div className="library-header">
        <button className="back-btn" onClick={goHome}>
          ← Back
        </button>
        <h1>My Story Library</h1>
        <button className="new-story-btn" onClick={goHome}>
          + New Story
        </button>
      </div>

      <div className="library-container">
        {stories.length === 0 ? (
          <div className="empty-library">
            <div className="empty-icon">📚</div>
            <h2>No stories yet!</h2>
            <p>Create your first story to see it here.</p>
            <button className="create-first-btn" onClick={goHome}>
              Create My First Story
            </button>
          </div>
        ) : (
          <div className="stories-grid">
            {stories.map((story, index) => (
              <div key={index} className="story-card">
                <div className="story-image">
                  <img
                    src={story.imagePreview}
                    alt={`Story ${index + 1}`}
                    className="story-thumbnail"
                  />
                </div>

                <div className="story-details">
                  <h3 className="story-title">
                    Story #{stories.length - index}
                  </h3>

                  <p className="story-description">
                    {story.description?.substring(0, 100)}
                    {story.description?.length > 100 ? '...' : ''}
                  </p>

                  <div className="story-meta">
                    <span className="story-date">
                      {story.createdAt ? formatDate(story.createdAt) : 'Recently created'}
                    </span>
                    {story.language && (
                      <span className="story-language">
                        {story.language}
                      </span>
                    )}
                  </div>

                  <div className="story-actions">
                    <button
                      className="read-btn"
                      onClick={() => readStory(story)}
                    >
                      📖 Read Story
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => deleteStory(index)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;