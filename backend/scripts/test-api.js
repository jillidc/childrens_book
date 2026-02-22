#!/usr/bin/env node
/**
 * Quick API smoke test. Run with: node scripts/test-api.js
 * Requires backend to be running (npm run dev).
 * Uses API_BASE_URL, or PORT from .env, or http://localhost:5000
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const port = process.env.API_BASE_URL ? null : (process.env.PORT || 5000);
const API_BASE = process.env.API_BASE_URL || `http://localhost:${port}`;

async function request(method, path, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function main() {
  console.log('Testing API at', API_BASE, '\n');

  // 1. Health
  const health = await request('GET', '/api/health');
  console.log('GET /api/health:', health.status, health.data?.status || health.data);
  if (health.status !== 200) {
    console.error('Unexpected response. Is the backend running? (npm run dev)');
    if (health.status === 403) {
      console.error('403 Forbidden – if backend uses a different port (e.g. 5001), run: PORT=5001 node scripts/test-api.js');
    }
    console.error('Response:', health.data);
    process.exit(1);
  }

  // 2. Register
  const email = `test-${Date.now()}@example.com`;
  const reg = await request('POST', '/api/auth/register', {
    email,
    password: 'testpass123',
    username: 'TestUser'
  });
  console.log('POST /api/auth/register:', reg.status, reg.data?.message || reg.data?.error);

  if (reg.status !== 201) {
    console.log('Register response:', reg.data);
    process.exit(1);
  }

  const token = reg.data?.data?.token;
  if (!token) {
    console.error('No token in register response:', reg.data);
    process.exit(1);
  }

  // 3. Me
  const me = await request('GET', '/api/auth/me', null, token);
  console.log('GET /api/auth/me:', me.status, me.data?.data?.email || me.data?.error);

  // 4. Login
  const login = await request('POST', '/api/auth/login', { email, password: 'testpass123' });
  console.log('POST /api/auth/login:', login.status, login.data?.message || login.data?.error);

  // 5. Create story (protected)
  const story = await request(
    'POST',
    '/api/stories',
    {
      title: 'Test Story',
      description: 'A test drawing',
      storyText: 'Once upon a time...',
      language: 'english'
    },
    token
  );
  console.log('POST /api/stories:', story.status, story.data?.message || story.data?.error);
  if (story.status === 500 && story.data?.details) {
    console.log('  →', story.data.details);
  }

  // 6. List stories
  const list = await request('GET', '/api/stories', null, token);
  console.log('GET /api/stories:', list.status, list.data?.pagination?.count ?? list.data?.error);

  // 7. Translate (no auth required but rate limited)
  const translate = await request('POST', '/api/translate', {
    text: 'Hello world',
    targetLanguage: 'spanish'
  });
  console.log('POST /api/translate:', translate.status, translate.data?.data?.translatedText ? 'OK' : translate.data?.error);
  if (translate.status === 500 && translate.data?.details) {
    console.log('  →', translate.data.details);
  }

  console.log('\nDone. Backend looks good.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.cause?.code === 'ECONNREFUSED') {
    console.error('Cannot connect. Start the backend with: npm run dev');
  }
  process.exit(1);
});
