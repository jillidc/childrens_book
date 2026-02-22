import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { playAudio } from '../services/elevenLabsService';
import openBook from '../assets/open-book.png';
import './Story.css';
import cloudBackground from '../assets/cloud-background.png';

const splitIntoPages = (text) => {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
};

const Story = () => {
  const [storyData, setStoryData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const currentStory = localStorage.getItem('currentStory');
    if (currentStory) {
      setStoryData(JSON.parse(currentStory));
    } else {
      navigate('/upload');
    }

    return () => {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    };
  }, [navigate, currentAudio]);

  const storyText = storyData?.story || storyData?.storyText || '';
  const pages = useMemo(() => splitIntoPages(storyText), [storyText]);

  const totalSpreads = Math.ceil(pages.length / 2);
  const leftPageIndex = currentSpread * 2;
  const rightPageIndex = currentSpread * 2 + 1;

  const goToNextSpread = () => {
    if (currentSpread < totalSpreads - 1 && !isFlipping) {
      setFlipDirection('forward');
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentSpread(prev => prev + 1);
        setIsFlipping(false);
        setFlipDirection('');
      }, 500);
    }
  };

  const goToPrevSpread = () => {
    if (currentSpread > 0 && !isFlipping) {
      setFlipDirection('backward');
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentSpread(prev => prev - 1);
        setIsFlipping(false);
        setFlipDirection('');
      }, 500);
    }
  };

  const handlePlayStory = async () => {
    if (!storyText) return;

    if (isPlaying && currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
      setCurrentAudio(null);
      return;
    }

    try {
      setIsPlaying(true);
      const audioUrl = await playAudio(storyText);

      if (audioUrl === 'speech-synthesis://mock-audio-url') {
        setIsPlaying(false);
        return;
      }

      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        console.error('Error playing audio');
      };

      await audio.play();
    } catch (error) {
      console.error('Error generating or playing audio:', error);
      setIsPlaying(false);
    }
  };

  const goToDone = () => {
    if (currentAudio) currentAudio.pause();
    navigate('/done');
  };

  const goBack = () => {
    if (currentAudio) currentAudio.pause();
    navigate('/upload');
  };

  if (!storyData) {
    return <div className="loading">Loading story...</div>;
  }

  return (
    <div className="story-screen" style={{ backgroundImage: `url(${cloudBackground})` }}>
      <div className="story-header">
        <button className="back-btn" onClick={goBack}>
          ← Back
        </button>
        <h1>Your Story</h1>
        <button className="done-btn" onClick={goToDone}>
          Done ✓
        </button>
      </div>

      <div className="book-wrapper">
        <img src={openBook} alt="Book frame" className="book-frame" />

        <div className="book-pages">
          {/* Left page */}
          <div className={`book-page left-page ${isFlipping && flipDirection === 'backward' ? 'flip-backward' : ''}`}>
            <div className="page-content">
              {pages[leftPageIndex] && (
                <>
                  {currentSpread === 0 && storyData.imagePreview && (
                    <img
                      src={storyData.imagePreview}
                      alt="Your drawing"
                      className="page-drawing"
                    />
                  )}
                  <p className="page-text">{pages[leftPageIndex]}</p>
                  <span className="page-number">{leftPageIndex + 1}</span>
                </>
              )}
            </div>
          </div>

          {/* Right page */}
          <div className={`book-page right-page ${isFlipping && flipDirection === 'forward' ? 'flip-forward' : ''}`}>
            <div className="page-content">
              {pages[rightPageIndex] && (
                <>
                  <p className="page-text">{pages[rightPageIndex]}</p>
                  <span className="page-number">{rightPageIndex + 1}</span>
                </>
              )}
              {!pages[rightPageIndex] && pages[leftPageIndex] && (
                <p className="page-text end-text">The End</p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        {currentSpread > 0 && (
          <button className="page-nav prev-page" onClick={goToPrevSpread}>
            ‹
          </button>
        )}
        {currentSpread < totalSpreads - 1 && (
          <button className="page-nav next-page" onClick={goToNextSpread}>
            ›
          </button>
        )}
      </div>

      <div className="story-controls">
        <button
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={handlePlayStory}
          disabled={!storyText}
        >
          {isPlaying ? <>⏸️ Pause Story</> : <>🔊 Read Story Aloud</>}
        </button>

        {storyData.language && (
          <span className="language-tag">
            Language: {storyData.language}
          </span>
        )}

        <span className="page-indicator">
          Page {leftPageIndex + 1}–{Math.min(rightPageIndex + 1, pages.length)} of {pages.length}
        </span>
      </div>
    </div>
  );
};

export default Story;
