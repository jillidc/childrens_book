import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Upload.css';

const Upload = () => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('english');
  const [translationLanguage, setTranslationLanguage] = useState('');
  const navigate = useNavigate();

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (image && description.trim()) {
      const storyData = {
        image,
        description,
        language,
        translationLanguage
      };
      localStorage.setItem('currentStory', JSON.stringify({
        ...storyData,
        imagePreview
      }));
      navigate('/loading');
    }
  };

  const goToLibrary = () => {
    navigate('/library');
  };

  return (
    <div className="upload-screen">
      <div className="header">
        <h1>Draw My Story</h1>
        <button className="library-btn" onClick={goToLibrary}>
          📚 My Library
        </button>
      </div>

      <div className="upload-container">
        <div className="image-upload">
          <div className="upload-box">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="image-preview" />
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">🎨</div>
                <p>Upload your drawing</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="file-input"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="upload-label">
              {imagePreview ? 'Change Image' : 'Choose Image'}
            </label>
          </div>
        </div>

        <div className="description-section">
          <label htmlFor="description">Tell me about your drawing:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your drawing and what kind of story you'd like..."
            rows="4"
          />
        </div>

        <div className="options-section">
          <div className="language-select">
            <label htmlFor="language">Story Language:</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="english">English</option>
              <option value="spanish">Spanish</option>
              <option value="french">French</option>
              <option value="chinese">Chinese</option>
            </select>
          </div>

          <div className="translation-select">
            <label htmlFor="translation">Translate to (optional):</label>
            <select
              id="translation"
              value={translationLanguage}
              onChange={(e) => setTranslationLanguage(e.target.value)}
            >
              <option value="">No translation</option>
              <option value="spanish">Spanish</option>
              <option value="french">French</option>
              <option value="english">English</option>
              <option value="chinese">Chinese</option>
            </select>
          </div>
        </div>

        <button
          className="generate-btn"
          onClick={handleSubmit}
          disabled={!image || !description.trim()}
        >
          Create My Story! ✨
        </button>
      </div>
    </div>
  );
};

export default Upload;