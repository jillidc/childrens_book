import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Done.css';

const Done = () => {
  const navigate = useNavigate();

  const createNewStory = () => {
    localStorage.removeItem('currentStory');
    navigate('/upload');
  };

  const readAgain = () => {
    navigate('/story');
  };

  const goToLibrary = () => {
    navigate('/library');
  };

  return (
    <div className="done-screen">
      <div className="done-container">
        <div className="celebration">
          <div className="celebration-icon">🎉</div>
          <h1>Story Complete!</h1>
          <p>Great job creating your magical story!</p>
        </div>

        <div className="done-actions">
          <button className="primary-btn" onClick={createNewStory}>
            ✨ Create Another Story
          </button>

          <button className="secondary-btn" onClick={readAgain}>
            📖 Read Again
          </button>

          <button className="library-btn" onClick={goToLibrary}>
            📚 View My Library
          </button>
        </div>

        <div className="fun-facts">
          <div className="fun-fact">
            <span className="fact-icon">🌟</span>
            <p>Every story you create is unique and special!</p>
          </div>
          <div className="fun-fact">
            <span className="fact-icon">🎨</span>
            <p>Your imagination brought this story to life!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Done;