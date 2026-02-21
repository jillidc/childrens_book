import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { playAudio } from '../services/elevenLabsService';
import './Story.css';

const Story = () => {
  const [storyData, setStoryData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
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

  const handlePlayStory = async () => {
    const storyText = storyData?.story || storyData?.storyText;
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

      // Handle both regular audio URLs and speech synthesis
      if (audioUrl === 'speech-synthesis://mock-audio-url') {
        // Browser speech synthesis fallback
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
    if (currentAudio) {
      currentAudio.pause();
    }
    navigate('/done');
  };

  const goBack = () => {
    if (currentAudio) {
      currentAudio.pause();
    }
    navigate('/upload');
  };

  if (!storyData) {
    return <div className="loading">Loading story...</div>;
  }

  return (
    <div className="story-screen">
      <div className="story-header">
        <button className="back-btn" onClick={goBack}>
          ← Back
        </button>
        <h1>Your Story</h1>
        <button className="done-btn" onClick={goToDone}>
          Done ✓
        </button>
      </div>

      <div className="story-container">
        <div className="story-image">
          <img
            src={storyData.imagePreview}
            alt="Your drawing"
            className="drawing-image"
          />
        </div>

        <div className="story-content">
          <div className="story-text">
            {(storyData.story || storyData.storyText) ? (
              <div className="story-paragraphs">
                {(storyData.story || storyData.storyText).split('\n').map((paragraph, index) => (
                  paragraph.trim() && (
                    <p key={index} className="story-paragraph">
                      {paragraph.trim()}
                    </p>
                  )
                ))}
              </div>
            ) : (
              <p className="no-story">No story available</p>
            )}
          </div>

          <div className="story-controls">
            <button
              className={`play-btn ${isPlaying ? 'playing' : ''}`}
              onClick={handlePlayStory}
              disabled={!(storyData.story || storyData.storyText)}
            >
              {isPlaying ? (
                <>⏸️ Pause Story</>
              ) : (
                <>🔊 Read Story Aloud</>
              )}
            </button>

            {storyData.language && (
              <div className="story-info">
                <span className="language-tag">
                  Language: {storyData.language}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Story;