import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateWithTimestamps, clampSpeed } from '../services/elevenLabsService';
import './Story.css';

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

const SPEED_OPTIONS = [
  { value: 0.8,  label: 'Slow'   },
  { value: 1.0,  label: 'Medium' },
  { value: 1.15, label: 'Fast'   },
];

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
    utterance.pitch = 1.1;

    const voices    = window.speechSynthesis.getVoices();
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

    const onDone = () => {
      setIsPlaying(false);
      setHighlightRange({ start: null, end: null });
      if (autoScrollRef.current && pagesRef.current) {
        const nextIdx = currentPageIndexRef.current + 1;
        if (nextIdx < pagesRef.current.length) {
          shouldAutoPlayRef.current = true;
          setCurrentPageIndex(nextIdx);
        }
      }
    };

    utterance.onend   = onDone;
    utterance.onerror = () => { setIsPlaying(false); setHighlightRange({ start: null, end: null }); };

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

  const handlePageChange = useCallback((newIndex) => {
    stopSpeech();
    setCurrentPageIndex(newIndex);
  }, [stopSpeech]);

  const handleSpeedChange = (newSpeed) => {
    setReadingSpeed(newSpeed);
    readingSpeedRef.current = newSpeed;
    // Stop current playback — ElevenLabs audio must be regenerated at the new speed
    if (isPlaying || isLoadingAudio) stopSpeech();
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const goToDone = () => { stopSpeech(); navigate('/done'); };
  const goBack = () => { stopSpeech(); navigate('/upload'); };

  if (!storyData) {
    return <div className="loading">Loading story...</div>;
  }

  // Only show AI-generated images (imageUrl from Imagen 4).
  // Never fall back to the original drawing thumbnail — it looks blurry at full size.
  const currentImage = hasMultiplePages
    ? (pages[currentPageIndex]?.imageUrl || null)
    : null;

  return (
    <div className="story-screen">
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
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {hasMultiplePages && (
          <div className="story-pagination">
            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPageIndex === 0}
              onClick={() => handlePageChange(Math.max(0, currentPageIndex - 1))}
            >
              ← Previous
            </button>
            <span className="page-indicator">
              Page {currentPageIndex + 1} of {pages.length}
            </span>
            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPageIndex >= pages.length - 1}
              onClick={() => handlePageChange(Math.min(pages.length - 1, currentPageIndex + 1))}
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Narrator controls ── */}
        <div className="story-controls">
          <button
            className={`play-btn ${isPlaying ? 'playing' : ''} ${isLoadingAudio ? 'loading' : ''}`}
            onClick={handlePlayPause}
            disabled={!currentPageText || isLoadingAudio}
          >
            {isLoadingAudio ? '⏳ Loading voice…' : isPlaying ? '⏸️ Pause' : '🔊 Read This Page'}
          </button>

          <div className="narrator-settings">
            {/* Auto-scroll toggle */}
            <div className="setting-item">
              <span className="setting-label">Auto-scroll</span>
              <button
                className={`toggle-btn ${autoScroll ? 'toggle-on' : 'toggle-off'}`}
                onClick={() => setAutoScroll(v => !v)}
                title="Automatically advance to the next page when reading finishes"
              >
                <span className="toggle-knob" />
              </button>
              <span className="setting-value">{autoScroll ? 'On' : 'Off'}</span>
            </div>

            {/* Speed buttons */}
            <div className="setting-item">
              <span className="setting-label">Speed</span>
              <div className="speed-btn-group">
                {SPEED_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`speed-option${readingSpeed === value ? ' active' : ''}`}
                    onClick={() => handleSpeedChange(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {storyData.language && (
            <div className="story-info">
              <span className="language-tag">Language: {storyData.language}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Story;
