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
  const [loadingText, setLoadingText] = useState("Creating your magical story...");
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

        // Prefer the DO Spaces URL (full-res) over the tiny thumbnail for AI parsing
        const imageForApi = storyData.imageUrl || storyData.imagePreview || null;
        const data = await generateStory(
          storyData.description,
          storyData.language,
          storyData.translationLanguage,
          imageForApi
        );

        clearInterval(messageInterval);
        setProgress(100);
        setLoadingText("Story ready!");

        const fullText = data.fullText || data.story || '';
        const pages = data.pages || [{ text: fullText, imageUrl: null }];

        const completeStory = {
          ...storyData,
          pages,
          fullText,
          storyText: fullText,
          story: fullText,
          title: storyData.title || `Story #${Date.now()}`,
          createdAt: storyData.createdAt || new Date().toISOString()
        };

        // Save to backend (it handles its own storage)
        try {
          await storyService.createStory({
            ...completeStory,
            storyText: fullText
          });
        } catch (error) {
          console.error('Error saving story to backend:', error);
        }

        // For localStorage: keep pages but strip any huge data-URL images
        // to avoid exceeding the ~5 MB quota
        const pagesForStorage = pages.map(p => ({
          text: p.text,
          imageUrl: p.imageUrl && !p.imageUrl.startsWith('data:') ? p.imageUrl : null
        }));
        const storyForStorage = {
          ...completeStory,
          pages: pagesForStorage,
          imagePreview: storyData.imagePreview
        };
        try {
          localStorage.setItem('currentStory', JSON.stringify(storyForStorage));
        } catch (e) {
          console.warn('localStorage full, storing minimal data');
          localStorage.setItem('currentStory', JSON.stringify({
            description: storyData.description,
            language: storyData.language,
            fullText,
            story: fullText,
            pages: pages.map(p => ({ text: p.text, imageUrl: null })),
            title: completeStory.title,
            createdAt: completeStory.createdAt
          }));
        }

        setTimeout(() => navigate('/story'), 1000);
      } catch (error) {
        console.error('Error generating story:', error);
        setLoadingText("Oops! Something went wrong. Let's try again!");
        setTimeout(() => navigate('/upload'), 2000);
      }
    };

    generateUserStory();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadingMessages is a module-level constant
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
