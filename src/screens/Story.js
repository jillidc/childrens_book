import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import openBook from '../assets/open-book.png';
import './Story.css';
import nightSky from '../assets/night-sky.png';
import cloudsPng from '../assets/clouds.png';

function getPagesFromStory(storyData) {
  if (storyData.pages && Array.isArray(storyData.pages) && storyData.pages.length > 0) {
    return storyData.pages.map(p =>
      typeof p === 'string' ? { text: p, imageUrl: null } : p
    );
  }

  const raw = storyData.storyText ?? storyData.story ?? storyData.fullText ?? '';
  if (!raw) return [{ text: 'No story content available.', imageUrl: null }];

  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 2 && Array.isArray(parsed.pages)) {
      return parsed.pages;
    }
  } catch (_) { /* not JSON, fall through */ }

  const sentences = raw.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  const pages = [];
  for (let i = 0; i < sentences.length; i += 3) {
    pages.push({ text: sentences.slice(i, i + 3).join(' '), imageUrl: null });
  }
  return pages.length > 0 ? pages : [{ text: raw, imageUrl: null }];
}

const Story = () => {
  const [storyData, setStoryData] = useState(null);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('');
  const utteranceRef = useRef(null);
  const navigate = useNavigate();

  const pages = useMemo(
    () => (storyData ? getPagesFromStory(storyData) : []),
    [storyData]
  );

  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2));
  const leftIdx = currentSpread * 2;
  const rightIdx = currentSpread * 2 + 1;

  useEffect(() => {
    const saved = localStorage.getItem('currentStory');
    if (saved) {
      setStoryData(JSON.parse(saved));
    } else {
      navigate('/upload');
    }
  }, [navigate]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsPlaying(false);
  }, []);

  const speakText = useCallback((text) => {
    stopSpeech();
    if (!text || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('karen') ||
      v.name.toLowerCase().includes('google')
    );
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
      utteranceRef.current = null;
      setIsPlaying(false);
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  }, [stopSpeech]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopSpeech();
    } else {
      const left = pages[leftIdx]?.text || '';
      const right = pages[rightIdx]?.text || '';
      speakText([left, right].filter(Boolean).join('. '));
    }
  }, [isPlaying, stopSpeech, speakText, pages, leftIdx, rightIdx]);

  const goToNextSpread = useCallback(() => {
    if (currentSpread < totalSpreads - 1 && !isFlipping) {
      stopSpeech();
      setFlipDirection('forward');
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentSpread(prev => prev + 1);
        setIsFlipping(false);
        setFlipDirection('');
      }, 400);
    }
  }, [currentSpread, totalSpreads, isFlipping, stopSpeech]);

  const goToPrevSpread = useCallback(() => {
    if (currentSpread > 0 && !isFlipping) {
      stopSpeech();
      setFlipDirection('backward');
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentSpread(prev => prev - 1);
        setIsFlipping(false);
        setFlipDirection('');
      }, 400);
    }
  }, [currentSpread, isFlipping, stopSpeech]);

  const goToDone = () => { stopSpeech(); navigate('/done'); };
  const goBack = () => { stopSpeech(); navigate('/upload'); };

  if (!storyData) {
    return <div className="loading">Loading story...</div>;
  }

  const leftPage = pages[leftIdx];
  const rightPage = pages[rightIdx];
  const leftImage = leftPage?.imageUrl || (currentSpread === 0 ? (storyData.imagePreview || storyData.imageUrl) : null);
  const rightImage = rightPage?.imageUrl || null;

  return (
    <div className="story-screen" style={{ backgroundImage: `url(${nightSky})` }}>
      <div className="scrolling-clouds" style={{ backgroundImage: `url(${cloudsPng})` }} />
      <div className="story-header">
        <button className="back-btn" onClick={goBack}>&larr; Back</button>
        <h1>Your Story</h1>
        <button className="done-btn" onClick={goToDone}>Done &check;</button>
      </div>

      <div className="book-wrapper">
        <img src={openBook} alt="Book frame" className="book-frame" />

        <div className="book-pages">
          <div className={`book-page left-page ${isFlipping && flipDirection === 'backward' ? 'flip-backward' : ''}`}>
            <div className="page-content">
              {leftPage && (
                <>
                  {leftImage && (
                    <img src={leftImage} alt={`Page ${leftIdx + 1}`} className="page-drawing" />
                  )}
                  <p className="page-text">{leftPage.text}</p>
                  <span className="page-number">{leftIdx + 1}</span>
                </>
              )}
            </div>
          </div>

          <div className={`book-page right-page ${isFlipping && flipDirection === 'forward' ? 'flip-forward' : ''}`}>
            <div className="page-content">
              {rightPage ? (
                <>
                  {rightImage && (
                    <img src={rightImage} alt={`Page ${rightIdx + 1}`} className="page-drawing" />
                  )}
                  <p className="page-text">{rightPage.text}</p>
                  <span className="page-number">{rightIdx + 1}</span>
                </>
              ) : leftPage ? (
                <p className="page-text end-text">The End</p>
              ) : null}
            </div>
          </div>
        </div>

        {currentSpread > 0 && (
          <button className="page-nav prev-page" onClick={goToPrevSpread}>&#8249;</button>
        )}
        {currentSpread < totalSpreads - 1 && (
          <button className="page-nav next-page" onClick={goToNextSpread}>&#8250;</button>
        )}
      </div>

      <div className="story-controls">
        <button
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={handlePlayPause}
          disabled={pages.length === 0}
        >
          {isPlaying ? <>&nbsp;&#9208;&#65039; Pause Story</> : <>&nbsp;&#128266; Read Story Aloud</>}
        </button>

        {storyData.language && (
          <span className="language-tag">Language: {storyData.language}</span>
        )}

        <span className="page-indicator">
          Page {leftIdx + 1}{rightIdx < pages.length ? `\u2013${rightIdx + 1}` : ''} of {pages.length}
        </span>
      </div>
    </div>
  );
};

export default Story;
