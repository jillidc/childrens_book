import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateStory } from '../services/geminiService';
import storyService from '../services/storyService';
import './Loading.css';

const loadingMessages = [
  "Creating your magical story...",
  "Adding characters and adventures...",
  "Sprinkling some magic dust...",
  "Almost ready to read!"
];

const Loading = () => {
  const [loadingText, setLoadingText] = useState(loadingMessages[0]);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const generateUserStory = async () => {
      try {
        const storyData = JSON.parse(localStorage.getItem('currentStory'));
        if (!storyData) {
          navigate('/upload');
          return;
        }

        let messageIndex = 0;
        const messageInterval = setInterval(() => {
          if (messageIndex < loadingMessages.length - 1) {
            messageIndex++;
            setLoadingText(loadingMessages[messageIndex]);
            setProgress((messageIndex / (loadingMessages.length - 1)) * 70);
          }
        }, 1500);

        const generatedStory = await generateStory(
          storyData.description,
          storyData.language,
          storyData.translationLanguage
        );

        clearInterval(messageInterval);
        setProgress(100);
        setLoadingText("Story ready!");

        const completeStory = {
          ...storyData,
          storyText: generatedStory,
          title: `Story #${Date.now()}`,
          createdAt: new Date().toISOString()
        };

        // Save story to backend
        try {
          const savedStory = await storyService.createStory(completeStory);
          localStorage.setItem('currentStory', JSON.stringify(savedStory));
        } catch (error) {
          console.error('Error saving story to backend:', error);
          // Fallback to localStorage only
          localStorage.setItem('currentStory', JSON.stringify(completeStory));

          const existingStories = JSON.parse(localStorage.getItem('userStories') || '[]');
          existingStories.unshift(completeStory);
          localStorage.setItem('userStories', JSON.stringify(existingStories));
        }

        setTimeout(() => navigate('/story'), 1000);
      } catch (error) {
        console.error('Error generating story:', error);
        setLoadingText("Oops! Something went wrong. Let's try again!");
        setTimeout(() => navigate('/upload'), 2000);
      }
    };

    generateUserStory();
  }, [navigate]);

  return (
    <div className="loading-screen">
      <div className="loading-container">
        <div className="loading-animation">
          <div className="magic-wand">🪄</div>
          <div className="sparkles">
            <span className="sparkle">✨</span>
            <span className="sparkle">⭐</span>
            <span className="sparkle">💫</span>
          </div>
        </div>

        <h2>{loadingText}</h2>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="loading-details">
          <p>We're creating a personalized story just for you!</p>
        </div>
      </div>
    </div>
  );
};

export default Loading;