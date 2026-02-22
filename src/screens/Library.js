import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import storyService from '../services/storyService';
import './Library.css';
import bgImage from '../assets/Jillian-BG.png';
import bookPjImage from '../assets/book-PJ.PNG';
import createImg from '../assets/create.png';
import cloudDrawBg from '../assets/blue-cloud-bg.png';
import blue1Img from '../assets/blue-1.PNG';
import trashImg from '../assets/trash.PNG';

const Library = () => {
  const [stories, setStories] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadStories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadStories = async () => {
    try {
      const result = await storyService.getAllStories(user?.id || null);
      setStories(result.stories);
    } catch (error) {
      console.error('Error loading stories:', error);
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
    <div className="library-screen" style={{ backgroundImage: `url(${bgImage})` }}>
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
          <div
            className="empty-library"
            style={{
              backgroundImage: `url(${cloudDrawBg})`,
              backgroundSize: '96%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="empty-icon">
              <img src={bookPjImage} alt="Books" className="empty-library-book-img" />
            </div>
            <h2>No stories yet!</h2>
            <p>Create your first story to see it here</p>
            <button className="create-first-btn" onClick={goHome}>
              <img src={createImg} alt="" className="create-first-btn-img" />
              <span className="create-first-btn-text">Create My First Story</span>
            </button>
          </div>
        ) : (
          <div className="stories-grid">
            {stories.map((story, index) => (
              <div
                key={index}
                className="story-card"
                style={{
                  backgroundImage: `url(${cloudDrawBg})`,
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <div className="story-image">
                  {(story.imagePreview || story.imageUrl) ? (
                    <img
                      src={story.imagePreview || story.imageUrl}
                      alt={`Story ${index + 1}`}
                      className="story-thumbnail"
                    />
                  ) : (
                    <div className="story-thumbnail-placeholder">
                      <img src={bookPjImage} alt="Story" className="story-thumbnail-placeholder-img" />
                    </div>
                  )}
                </div>

                <div className="story-details">
                  <h3 className="story-title">
                    {story.title || `Story #${stories.length - index}`}
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
                      <img src={blue1Img} alt="" className="read-btn-img" />
                      <span className="read-btn-text">Read Story</span>
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => deleteStory(index)}
                    >
                      <img src={trashImg} alt="Delete" className="delete-btn-img" />
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