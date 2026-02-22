import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Done.css';
import nightSky from '../assets/night-sky.png';
import cloudsPng from '../assets/clouds.png';
import drawingImg from '../assets/drawing.PNG';
import starsImg from '../assets/stars.png';

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
    <div className="done-screen" style={{ backgroundImage: `url(${nightSky})` }}>
      <div className="scrolling-clouds" style={{ backgroundImage: `url(${cloudsPng})` }} />
      <div className="done-container">
        <div className="celebration">
          <div className="celebration-icon"><img src={starsImg} alt="Stars" className="celebration-img" /></div>
          <h1>Story Complete!</h1>
          <p>Great job creating your magical story!</p>
        </div>

        <div className="done-actions">
          <button className="primary-btn" onClick={createNewStory}>
            Create Another Story
          </button>

          <button className="secondary-btn" onClick={readAgain}>
            Read Again
          </button>

          <button className="library-btn" onClick={goToLibrary}>
            View My Library
          </button>
        </div>

        <div className="fun-facts">
          <div className="fun-fact">
            <span className="fact-icon"><img src={starsImg} alt="" className="fact-stars-img" /></span>
            <p>Every story you create is unique and special!</p>
          </div>
          <div className="fun-fact">
            <span className="fact-icon"><img src={drawingImg} alt="" className="fact-drawing-img" /></span>
            <p>Your imagination brought this story to life!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Done;