import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateWithTimestamps, clampSpeed } from '../services/elevenLabsService';
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
  } catch (_) {}
  return { pages: null, fullText: raw || storyData.story || '' };
}

const SPEED_OPTIONS = [
  { value: 0.8,  label: 'Slow'   },
  { value: 1.0,  label: 'Medium' },
  { value: 1.15, label: 'Fast'   },
];

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
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [highlightRange, setHighlightRange] = useState({ start: null, end: null });
  const [autoScroll, setAutoScroll] = useState(true);
  const [readingSpeed, setReadingSpeed] = useState(1.0);

  const audioRef      = useRef(null);   // HTMLAudioElement for ElevenLabs
  const wordTimingsRef = useRef([]);     // word timing from ElevenLabs
  const highlightRef  = useRef(null);
  // Refs so closures in audio callbacks always see fresh state
  const autoScrollRef       = useRef(autoScroll);
  const pagesRef            = useRef(null);
  const currentPageIndexRef = useRef(0);
  const shouldAutoPlayRef   = useRef(false);
  const readingSpeedRef     = useRef(readingSpeed);

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
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const stopSpeech = useCallback(() => {
    // Stop ElevenLabs audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Also cancel any fallback SpeechSynthesis
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    wordTimingsRef.current = [];
    shouldAutoPlayRef.current = false;
    setIsPlaying(false);
    setIsLoadingAudio(false);
    setHighlightRange({ start: null, end: null });
  }, []);

  // SpeechSynthesis fallback — used only when ElevenLabs is unavailable
  const speakWithSynthesis = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate  = readingSpeedRef.current;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsPlaying(false);
  }, []);

  const speakText = useCallback((text) => {
    stopSpeech();
    if (!text || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.1;

    const voices    = window.speechSynthesis.getVoices();
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

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  const speakPage = useCallback(async (text) => {
    stopSpeech();
    if (!text) return;

    setIsLoadingAudio(true);

    try {
      const result = await generateWithTimestamps(text, {
        speed: clampSpeed(readingSpeedRef.current)
      });

      if (!result) {
        // ElevenLabs unavailable — fall back silently
        setIsLoadingAudio(false);
        speakWithSynthesis(text);
        return;
      }

      const { audioUrl, wordTimings } = result;
      wordTimingsRef.current = wordTimings;

      const audio = new Audio(audioUrl);
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
        audioRef.current = null;
        setIsPlaying(false);
        setHighlightRange({ start: null, end: null });
        // Revoke object URL to free memory
        URL.revokeObjectURL(audioUrl);
        if (autoScrollRef.current && pagesRef.current) {
          const nextIdx = currentPageIndexRef.current + 1;
          if (nextIdx < pagesRef.current.length) {
            shouldAutoPlayRef.current = true;
            setCurrentPageIndex(nextIdx);
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
        <button className="back-btn" onClick={goBack}>← Back</button>
        <h1>Your Story</h1>
        <button className="done-btn" onClick={goToDone}>Done ✓</button>
      </div>

      <div className="story-container">
        {/* ── Text ── word highlight works on every page/paragraph ── */}
        <div className="story-text-block">
          <div className="story-paragraphs">
            {(() => {
              // Build paragraph list with cumulative offsets so charIndex
              // (which counts across the whole currentPageText string) maps
              // correctly to the right paragraph.
              const paras = currentPageText.split('\n').filter(p => p.trim());
              let offset = 0;
              return paras.map((para, i) => {
                const paraStart = currentPageText.indexOf(para.trim(), offset);
                const paraEnd   = paraStart + para.trim().length;
                offset = paraEnd;

                const hlStart = highlightRange.start;
                const hlEnd   = highlightRange.end;
                const inThisPara =
                  hlStart != null &&
                  hlEnd   != null &&
                  hlStart >= paraStart &&
                  hlStart <  paraEnd;

                return (
                  <p key={i} className="story-paragraph">
                    <HighlightedText
                      text={para.trim()}
                      charStart={inThisPara ? hlStart - paraStart : null}
                      charEnd={inThisPara ? hlEnd   - paraStart : null}
                      highlightRef={inThisPara ? highlightRef : null}
                    />
                  </p>
                );
              });
            })()}
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

        {/* ── Image below text ── only show AI-generated images; placeholder otherwise */}
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
              <span className="placeholder-label">Illustration generating…</span>
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
          {isPlaying ? <>&#9208;&#65039; Pause Story</> : <>&#128266; Read Story Aloud</>}
        </button>

        {storyData.language && (
          <span className="language-tag">Language: {storyData.language}</span>
        )}

        <span className="page-indicator">
          Page {leftIdx + 1}{rightIdx < pages.length ? `–${rightIdx + 1}` : ''} of {pages.length}
        </span>
      </div>
    </div>
  );
};

export default Story;
