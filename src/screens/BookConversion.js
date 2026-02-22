import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { convertBook } from '../services/geminiService';
import './BookConversion.css';

const BookConversion = () => {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await convertBook(rawText.trim());
      setResult(data);
    } catch (err) {
      setError(err.message || 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => navigate('/upload');
  const goToLibrary = () => navigate('/library');

  return (
    <div className="book-conversion-screen">
      <div className="book-conversion-header">
        <button type="button" className="back-btn" onClick={goHome}>← Back</button>
        <h1>Convert a Book</h1>
        <button type="button" className="library-link-btn" onClick={goToLibrary}>📚 Library</button>
      </div>

      <div className="book-conversion-container">
        <p className="book-conversion-intro">
          Paste adult or young-adult book text below. We'll simplify it for kids (Grade 2–4), pick key scenes, and add child-friendly illustrations.
        </p>

        <textarea
          className="book-conversion-textarea"
          placeholder="Paste your book text here…"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={12}
          disabled={loading}
        />

        {error && <div className="book-conversion-error">{error}</div>}

        <button
          type="button"
          className="book-conversion-submit"
          onClick={handleSubmit}
          disabled={loading || !rawText.trim()}
        >
          {loading ? 'Simplifying & illustrating…' : 'Convert to children\'s book'}
        </button>

        {result && (
          <div className="book-conversion-result">
            <h2>Simplified story</h2>
            <div className="simplified-text">{result.simplifiedText}</div>
            <h2>Illustrated scenes</h2>
            <div className="scenes-list">
              {result.scenes.map((scene, i) => (
                <div key={i} className="scene-card">
                  {scene.imageUrl && (
                    <img src={scene.imageUrl} alt={scene.description} className="scene-image" />
                  )}
                  <p className="scene-description">{scene.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookConversion;
