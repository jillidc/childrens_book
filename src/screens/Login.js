import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';
import bgImage from '../assets/Jillian-BG.png';
import cloudDrawBg from '../assets/blue-cloud-bg.png';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(email, password, username || undefined);
      } else {
        await login(email, password);
      }
      navigate('/upload');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const continueAsGuest = () => {
    navigate('/upload');
  };

  return (
    <div className="login-screen" style={{ backgroundImage: `url(${bgImage})` }}>
      <div
        className="login-container"
        style={{
          backgroundImage: `url(${cloudDrawBg})`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <h1 className="login-title">Draw My Story</h1>
        <p className="login-subtitle">
          {isRegister ? 'Create an account to save your stories' : 'Sign in to access your stories'}
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="username">Name (optional)</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? 'At least 6 characters' : 'Your password'}
              required
              minLength={isRegister ? 6 : undefined}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="login-toggle">
          <span>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            type="button"
            className="toggle-btn"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </div>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button type="button" className="guest-btn" onClick={continueAsGuest}>
          Continue as Guest
        </button>
      </div>
    </div>
  );
};

export default Login;
