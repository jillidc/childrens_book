import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import storyService from '../services/storyService';
import './Account.css';
import bgImage from '../assets/Jillian-BG.png';
import cloudDrawBg from '../assets/blue-cloud-bg.png';
import starsImg from '../assets/stars.png';
import blue1Img from '../assets/blue-2.PNG';
import redImg from '../assets/red.png';

const MAX_GENERATIONS = 10;
const WINDOW_MINUTES = 15;

const Account = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [storyCount, setStoryCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadStats = async () => {
    try {
      const result = await storyService.getAllStories(user?.id);
      setStoryCount(result.stories?.length || 0);
    } catch (_) {}
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('currentStory');
    localStorage.removeItem('userStories');
    navigate('/login');
  };

  const handleDeleteData = async () => {
    if (!window.confirm('This will permanently delete your account and all your stories. This cannot be undone. Are you sure?')) return;
    setDeleting(true);
    try {
      const result = await storyService.getAllStories(user.id);
      for (const story of (result.stories || [])) {
        try { await storyService.deleteStory(story.id); } catch (_) {}
      }
      try { await apiService.delete(`/users/${user.id}`); } catch (_) {}
      localStorage.removeItem('currentStory');
      localStorage.removeItem('userStories');
      logout();
      navigate('/login');
    } catch (err) {
      console.error('Error deleting data:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthenticated || !user) return null;

  const displayName = user.username || user.email.split('@')[0];

  return (
    <div className="account-screen" style={{ backgroundImage: `url(${bgImage})` }}>
      <div
        className="account-container"
        style={{
          backgroundImage: `url(${cloudDrawBg})`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <button className="account-back-btn" onClick={() => navigate('/upload')}>← Back</button>

        <div className="account-header">
          <div className="account-avatar">
            <img src={starsImg} alt="Profile" className="account-avatar-img" />
          </div>
          <h1>{displayName}</h1>
          <p className="account-email">{user.email}</p>
        </div>

        <div className="account-stats">
          <div className="stat-card">
            <span className="stat-number">{storyCount}</span>
            <span className="stat-label">Stories Created</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{MAX_GENERATIONS}</span>
            <span className="stat-label">Generations / {WINDOW_MINUTES} min</span>
          </div>
        </div>

        <div className="account-info-note">
          You can generate up to {MAX_GENERATIONS} stories every {WINDOW_MINUTES} minutes. This limit resets automatically.
        </div>

        <div className="account-actions">
          <button className="account-logout-btn" onClick={handleLogout}>
            <img src={blue1Img} alt="" className="account-logout-img" />
            <span className="account-logout-text">Log Out</span>
          </button>
          <button className="account-delete-btn" onClick={handleDeleteData} disabled={deleting}>
            <img src={redImg} alt="" className="account-delete-img" />
            <span className="account-delete-text">
              {deleting ? 'Deleting...' : 'Delete My Account & Data'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Account;
