import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Done.css';
import nightSky from '../assets/night-sky.png';
import cloudsPng from '../assets/clouds.png';
import starsImg from '../assets/stars.png';
import blue1 from '../assets/blue-1.PNG';
import blue2 from '../assets/blue-2.PNG';
import blue3 from '../assets/blue-3.PNG';
import cloudDrawBg from '../assets/blue-cloud-bg.png';

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
      <div
        className="done-container"
        style={{
          backgroundImage: `url(${cloudDrawBg})`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="celebration">
          <div className="celebration-icon"><img src={starsImg} alt="Stars" className="celebration-img" /></div>
          <h1>Story Complete!</h1>
          <p>Great job creating your magical story!</p>
        </div>

        <div className="done-actions">
          <button className="primary-btn" onClick={createNewStory} style={{ backgroundImage: `url(${blue1})` }}>
            Create Another Story
          </button>

          <button className="secondary-btn" onClick={readAgain} style={{ backgroundImage: `url(${blue2})` }}>
            Read Again
          </button>

          <button className="library-btn" onClick={goToLibrary} style={{ backgroundImage: `url(${blue3})` }}>
            View My Library
          </button>
        </div>
      </div>
    </div>
  );
};

export default Done;