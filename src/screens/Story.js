import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateWithTimestamps } from '../services/elevenLabsService';
import openBook from '../assets/open-book.png';
import './Story.css';
import nightSky from '../assets/night-sky.gif';
import cloudsPng from '../assets/clouds.png';
import blueScribble from '../assets/bluescribble.png';

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

const SPEED_OPTIONS = [
  { value: 0.8,  label: 'Slow'   },
  { value: 1.0,  label: 'Medium' },
  { value: 1.15, label: 'Fast'   },
];

function HighlightedText({ text, charStart, charEnd }) {
  if (charStart == null || charEnd == null) return <>{text}</>;
  return (
    <>
      {text.slice(0, charStart)}
      <mark className="word-highlight">{text.slice(charStart, charEnd)}</mark>
      {text.slice(charEnd)}
    </>
  );
}

const Story = () => {
  const [storyData, setStoryData] = useState(null);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('');
  const [readingSpeed, setReadingSpeed] = useState(1.0);
  const [highlightRange, setHighlightRange] = useState({ start: null, end: null });
  const [autoAdvance, setAutoAdvance] = useState(true);

  const audioRef = useRef(null);
  const wordTimingsRef = useRef([]);
  const readingSpeedRef = useRef(readingSpeed);
  const utteranceRef = useRef(null);
  const currentSpreadRef = useRef(0);
  const pagesRef = useRef([]);
  const totalSpreadsRef = useRef(1);
  const speakPageRef = useRef(null);
  const autoAdvanceRef = useRef(true);
  const navigate = useNavigate();

  const pages = useMemo(
    () => (storyData ? getPagesFromStory(storyData) : []),
    [storyData]
  );

  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2));
  const leftIdx = currentSpread * 2;
  const rightIdx = currentSpread * 2 + 1;

  useEffect(() => { currentSpreadRef.current = currentSpread; }, [currentSpread]);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  useEffect(() => { totalSpreadsRef.current = totalSpreads; }, [totalSpreads]);
  useEffect(() => { autoAdvanceRef.current = autoAdvance; }, [autoAdvance]);

  useEffect(() => {
    const saved = localStorage.getItem('currentStory');
    if (saved) {
      setStoryData(JSON.parse(saved));
    } else {
      navigate('/upload');
    }
  }, [navigate]);

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      const oldSrc = audioRef.current.src;
      audioRef.current.pause();
      audioRef.current = null;
      if (oldSrc.startsWith('blob:')) URL.revokeObjectURL(oldSrc);
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    wordTimingsRef.current = [];
    setIsPlaying(false);
    setIsLoadingAudio(false);
    setHighlightRange({ start: null, end: null });
  }, []);

  useEffect(() => {
    return () => { stopSpeech(); };
  }, [stopSpeech]);

  const speakWithSynthesis = useCallback((text) => {
    if (!text || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = readingSpeedRef.current;
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

      if (autoAdvanceRef.current) {
        const nextSpread = currentSpreadRef.current + 1;
        if (nextSpread < totalSpreadsRef.current) {
          setFlipDirection('forward');
          setIsFlipping(true);
          setTimeout(() => {
            setCurrentSpread(nextSpread);
            setIsFlipping(false);
            setFlipDirection('');
            const nextLeft = pagesRef.current[nextSpread * 2]?.text || '';
            const nextRight = pagesRef.current[nextSpread * 2 + 1]?.text || '';
            const nextText = [nextLeft, nextRight].filter(Boolean).join(' ');
            if (nextText && speakPageRef.current) {
              setTimeout(() => speakPageRef.current(nextText), 200);
            }
          }, 400);
        }
      }
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  const speakPage = useCallback(async (text) => {
    stopSpeech();
    if (!text) return;

    setIsLoadingAudio(true);

    try {
      const result = await generateWithTimestamps(text);

      if (!result) {
        setIsLoadingAudio(false);
        speakWithSynthesis(text);
        return;
      }

      const { audioUrl, wordTimings } = result;
      wordTimingsRef.current = wordTimings;

      const audio = new Audio(audioUrl);
      audio.playbackRate = readingSpeedRef.current;
      audioRef.current = audio;

      audio.addEventListener('timeupdate', () => {
        const t = audio.currentTime;
        const timings = wordTimingsRef.current;
        const hit = timings.find(w => t >= w.startTime && t <= w.endTime);
        if (hit) {
          setHighlightRange({ start: hit.charStart, end: hit.charEnd });
        }
      });

      audio.onended = () => {
        const src = audio.src;
        audioRef.current = null;
        wordTimingsRef.current = [];
        setIsPlaying(false);
        setHighlightRange({ start: null, end: null });
        if (src.startsWith('blob:')) URL.revokeObjectURL(src);

        if (autoAdvanceRef.current) {
          const nextSpread = currentSpreadRef.current + 1;
          if (nextSpread < totalSpreadsRef.current) {
            setFlipDirection('forward');
            setIsFlipping(true);
            setTimeout(() => {
              setCurrentSpread(nextSpread);
              setIsFlipping(false);
              setFlipDirection('');
              const nextLeft = pagesRef.current[nextSpread * 2]?.text || '';
              const nextRight = pagesRef.current[nextSpread * 2 + 1]?.text || '';
              const nextText = [nextLeft, nextRight].filter(Boolean).join(' ');
              if (nextText && speakPageRef.current) {
                setTimeout(() => speakPageRef.current(nextText), 200);
              }
            }, 400);
          }
        }
      };

      audio.onerror = () => {
        audioRef.current = null;
        setIsPlaying(false);
        setIsLoadingAudio(false);
        setHighlightRange({ start: null, end: null });
      };

      setIsLoadingAudio(false);
      setIsPlaying(true);
      await audio.play();
    } catch (err) {
      console.error('speakPage error:', err);
      setIsLoadingAudio(false);
      speakWithSynthesis(text);
    }
  }, [stopSpeech, speakWithSynthesis]);

  useEffect(() => { speakPageRef.current = speakPage; }, [speakPage]);

  useEffect(() => {
    readingSpeedRef.current = readingSpeed;
    if (audioRef.current) {
      audioRef.current.playbackRate = readingSpeed;
    }
  }, [readingSpeed]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying || isLoadingAudio) {
      stopSpeech();
    } else {
      const left = pages[leftIdx]?.text || '';
      const right = pages[rightIdx]?.text || '';
      speakPage([left, right].filter(Boolean).join(' '));
    }
  }, [isPlaying, isLoadingAudio, stopSpeech, speakPage, pages, leftIdx, rightIdx]);

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

  const leftLen = leftPage?.text?.length || 0;

  const leftHlStart = highlightRange.start != null && highlightRange.start < leftLen
    ? highlightRange.start : null;
  const leftHlEnd = leftHlStart != null
    ? Math.min(highlightRange.end, leftLen) : null;

  const rightHlStart = highlightRange.start != null && highlightRange.start >= leftLen + 1
    ? highlightRange.start - leftLen - 1 : null;
  const rightHlEnd = rightHlStart != null
    ? highlightRange.end - leftLen - 1 : null;

  const playBtnClass = isLoadingAudio ? 'play-btn loading'
    : isPlaying ? 'play-btn playing'
    : 'play-btn';

  const playBtnLabel = isLoadingAudio
    ? 'Loading...'
    : isPlaying
      ? <>Pause Story</>
      : <>Read Story Aloud</>;

  return (
    <div className="story-screen" style={{ backgroundImage: `url(${nightSky})` }}>
      <div className="scrolling-clouds" style={{ backgroundImage: `url(${cloudsPng})` }} />
      <div className="story-header">
        <button className="back-btn" onClick={goBack}>&larr; Back</button>
        <h1>{storyData.title || 'Your Story'}</h1>
        <button className="done-btn" onClick={goToDone}>Done</button>
      </div>

      <div className="book-wrapper">
        <div className="book-inner">
        <img src={openBook} alt="Book frame" className="book-frame" />

        <div className="book-pages">
          <div className={`book-page left-page ${isFlipping && flipDirection.startsWith('backward') ? `flip-${flipDirection}` : ''}`}>
            <div className="page-content">
              {leftPage && (
                <>
                  {leftImage && (
                    <img src={leftImage} alt={`Page ${leftIdx + 1}`} className="page-drawing" />
                  )}
                  <p className="page-text">
                    <HighlightedText
                      text={leftPage.text}
                      charStart={leftHlStart}
                      charEnd={leftHlEnd}
                    />
                  </p>
                  <span className="page-number">{leftIdx + 1}</span>
                </>
              )}
            </div>
          </div>

          <div className={`book-page right-page ${isFlipping && flipDirection.startsWith('forward') ? `flip-${flipDirection}` : ''}`}>
            <div className="page-content">
              {rightPage ? (
                <>
                  {rightImage && (
                    <img src={rightImage} alt={`Page ${rightIdx + 1}`} className="page-drawing" />
                  )}
                  <p className="page-text">
                    <HighlightedText
                      text={rightPage.text}
                      charStart={rightHlStart}
                      charEnd={rightHlEnd}
                    />
                  </p>
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
      </div>

      <div className="story-controls" style={{ backgroundImage: `url(${blueScribble})` }}>
        <button
          className={playBtnClass}
          onClick={handlePlayPause}
          disabled={pages.length === 0}
        >
          {playBtnLabel}
        </button>

        <div className="narrator-settings">
          <div className="setting-item">
            <span className="setting-label">Speed:</span>
            <div className="speed-btn-group">
              {SPEED_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`speed-option ${readingSpeed === opt.value ? 'active' : ''}`}
                  onClick={() => setReadingSpeed(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-item">
            <span className="setting-label">Auto-flip</span>
            <button
              className={`toggle-btn ${autoAdvance ? 'toggle-on' : 'toggle-off'}`}
              onClick={() => setAutoAdvance(prev => !prev)}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </div>

        <span className="page-indicator">
          Page {leftIdx + 1}{rightIdx < pages.length ? `\u2013${rightIdx + 1}` : ''} of {pages.length}
        </span>
      </div>
    </div>
  );
};

export default Story;
