import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import storyService from '../services/storyService';
import './Upload.css';
import bgImage from '../assets/Jillian-BG.png';
import libraryIcon from '../assets/bluescribble.png';
import drawingImg from '../assets/drawing.PNG';
import cloudDrawBg from '../assets/blue-cloud-bg.png';
import createImg from '../assets/create.png';

function createThumbnail(dataUrl, maxSize = 200) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

const Upload = () => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('english');
  const [translationLanguage, setTranslationLanguage] = useState('');
  const { user, isAuthenticated } = useAuth();
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

  const handleSubmit = async () => {
    if (image && description.trim()) {
      const thumbnail = await createThumbnail(imagePreview);

      let remoteUrl = null;
      let fileName = null;
      try {
        const uploadResult = await storyService.uploadImage(image, {
          maxWidth: 1200,
          quality: 85
        });
        if (!uploadResult.isLocal) {
          remoteUrl = uploadResult.url;
          fileName = uploadResult.originalName;
        }
      } catch (error) {
        console.warn('Image upload failed, will use data URL for generation:', error.message);
      }

      const storyData = {
        description,
        language,
        translationLanguage,
        imageUrl: remoteUrl || imagePreview,
        imageFileName: fileName || image.name,
        imagePreview: thumbnail || remoteUrl || null
      };

      localStorage.setItem('currentStory', JSON.stringify(storyData));
      navigate('/loading');
    }
  };

  const goToLibrary = () => {
    navigate('/library');
  };

  return (
    <div className="upload-screen" style={{ backgroundImage: `url(${bgImage})` }}>
      <div className="header">
        {isAuthenticated && (
          <button className="account-btn" onClick={() => navigate('/account')} title="Account Settings">
            <span className="account-icon">&#9881;&#65039;</span>
          </button>
        )}
        <h1>Draw My Story</h1>
        {isAuthenticated && user && (
          <p className="greeting">Hi, {user.username || user.email.split('@')[0]}!</p>
        )}
      </div>

      <div
        className="upload-container"
        style={{
          backgroundImage: `url(${cloudDrawBg})`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="image-upload">
          <div className="upload-box">
            {imagePreview ? (
              <div className="upload-preview-wrap">
                <img src={imagePreview} alt="Preview" className="image-preview" title="Click to replace" />
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon"><img src={drawingImg} alt="" className="upload-drawing-img" /></div>
                <label htmlFor="image-upload" className="upload-label">Choose Image</label>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="file-input"
              id="image-upload"
            />
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
          <img src={createImg} alt="" className="generate-btn-img" />
          <span className="generate-btn-text">Create My Story</span>
        </button>
      </div>

      <div className="upload-footer-links">
        <div className="library-footer" onClick={goToLibrary}>
          <img src={libraryIcon} alt="My Library" className="library-btn-img" />
          <span className="library-btn-text">My Library</span>
        </div>
        <div className="book-conversion-link" onClick={() => navigate('/book-conversion')}>
          <span className="library-btn-text">📚 Convert a Book</span>
        </div>
      </div>
    </div>
  );
};

export default Upload;
