import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { playAudio } from '../services/elevenLabsService';
import openBook from '../assets/open-book.png';
import './Story.css';
import nightSky from '../assets/night-sky.png';
import cloudsPng from '../assets/clouds.png';

const splitIntoPages = (text) => {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
};

function getPagesAndFullText(storyData) {
  const raw = storyData.storyText ?? storyData.story ?? storyData.fullText ?? '';
  if (storyData.pages && Array.isArray(storyData.pages) && storyData.pages.length > 0) {
    const fullText = storyData.fullText || storyData.pages.map(p => p.text).join('\n\n');
    return { pages: storyData.pages, fullText };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 2 && Array.isArray(parsed.pages)) {
      return { pages: parsed.pages, fullText: parsed.fullText || parsed.pages.map(p => p.text).join('\n\n') };
    }
  } catch (_) {}
  return { pages: null, fullText: raw || storyData.story || '' };
}

const SPEED_LABELS = { 0.5: 'Slow', 0.75: 'Normal', 1: 'Fast', 1.25: 'Very Fast' };

function HighlightedText({ text, charStart, charEnd, highlightRef }) {
  if (charStart == null || charEnd == null || charStart >= text.length) {
    return <>{text}</>;
  }
  const before = text.slice(0, charStart);
  const word = text.slice(charStart, charEnd);
  const after = text.slice(charEnd);
  return (
    <>
      {before}
      <span className="highlighted-word" ref={highlightRef}>{word}</span>
      {after}
    </>
  );
}

const Story = () => {
  const [storyData, setStoryData] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('');
  const navigate = useNavigate();

  const { pages, fullText } = useMemo(
    () => (storyData ? getPagesAndFullText(storyData) : { pages: null, fullText: '' }),
    [storyData]
  );
  const hasMultiplePages = pages && pages.length > 1;

  const currentPageText = useMemo(() => {
    if (hasMultiplePages) return pages[currentPageIndex]?.text || '';
    return fullText;
  }, [hasMultiplePages, pages, currentPageIndex, fullText]);

  // Keep refs in sync with state
  useEffect(() => { autoScrollRef.current = autoScroll; }, [autoScroll]);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  useEffect(() => { currentPageIndexRef.current = currentPageIndex; }, [currentPageIndex]);
  useEffect(() => { readingSpeedRef.current = readingSpeed; }, [readingSpeed]);

  useEffect(() => {
    const currentStory = localStorage.getItem('currentStory');
    if (currentStory) {
      setStoryData(JSON.parse(currentStory));
    } else {
      navigate('/upload');
    }
  }, [navigate]);

  // Auto-scroll: keep the highlighted word in view
  useEffect(() => {
    if (autoScroll && highlightRef.current && highlightRange.start != null) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlightRange, autoScroll]);

  const stopSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    shouldAutoPlayRef.current = false;
    setIsPlaying(false);
    setHighlightRange({ start: null, end: null });
  }, []);

  const speakPage = useCallback((text) => {
    stopSpeech();
    if (!text || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = readingSpeedRef.current;
    utterance.pitch = 1.1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('karen') ||
      v.name.toLowerCase().includes('zira') ||
      v.name.toLowerCase().includes('google')
    );
    if (preferred) utterance.voice = preferred;

    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        const start = e.charIndex;
        const len = e.charLength || text.slice(start).match(/^\S+/)?.[0]?.length || 1;
        setHighlightRange({ start, end: start + len });
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

    utterance.onend = () => {
      setIsPlaying(false);
      setHighlightRange({ start: null, end: null });
      utteranceRef.current = null;

      if (audioUrl === 'speech-synthesis://mock-audio-url') {
        setIsPlaying(false);
        return;
      }
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setHighlightRange({ start: null, end: null });
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  }, [stopSpeech]);

  // When page changes due to auto-advance, auto-play the new page
  useEffect(() => {
    if (!shouldAutoPlayRef.current || !pages) return;
    shouldAutoPlayRef.current = false;
    const text = pages[currentPageIndex]?.text;
    if (text) speakPage(text);
  }, [currentPageIndex, pages, speakPage]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopSpeech();
    } else {
      speakPage(currentPageText);
    }
  }, [isPlaying, stopSpeech, speakPage, currentPageText]);

  const goToDone = () => {
    if (currentAudio) currentAudio.pause();
    navigate('/done');
  };

  const goBack = () => {
    if (currentAudio) currentAudio.pause();
    navigate('/upload');
  };

  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const goToDone = () => { stopSpeech(); navigate('/done'); };
  const goBack = () => { stopSpeech(); navigate('/upload'); };

  if (!storyData) {
    return <div className="loading">Loading story...</div>;
  }

  const currentImage = hasMultiplePages
    ? (pages[currentPageIndex]?.imageUrl || storyData.imagePreview)
    : (storyData.imagePreview || storyData.imageUrl);

  return (
    <div className="story-screen" style={{ backgroundImage: `url(${nightSky})` }}>
      <div className="scrolling-clouds" style={{ backgroundImage: `url(${cloudsPng})` }} />
      <div className="story-header">
        <button className="back-btn" onClick={goBack}>← Back</button>
        <h1>Your Story</h1>
        <button className="done-btn" onClick={goToDone}>Done ✓</button>
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
        </div>

        {/* ── Image below text ── */}
        <div className="story-image-block">
          {currentImage ? (
            <img
              src={currentImage}
              alt={`Page ${currentPageIndex + 1} illustration`}
              className="page-illustration"
            />
          ) : (
            <div className="story-image-placeholder">
              <span className="placeholder-text">📖</span>
              <span className="placeholder-label">Illustration loading…</span>
            </div>
          )}
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

          {storyData.language && (
            <div className="story-info">
              <span className="language-tag">Language: {storyData.language}</span>
            </div>
          )}
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
