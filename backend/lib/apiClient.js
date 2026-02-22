/**
 * Centralized HTTP client for external APIs (Gemini, ElevenLabs, etc.).
 * Single place for timeouts, retries, and error handling.
 */

const axios = require('axios');

const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds for AI/TTS

class ExternalApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ExternalApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Create an axios instance with default timeout and error normalization.
 * @param {Object} options - axios options
 * @param {number} [options.timeout=DEFAULT_TIMEOUT_MS]
 * @returns {import('axios').AxiosInstance}
 */
function createApiClient(options = {}) {
  const client = axios.create({
    timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
    ...options
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;
      const data = error.response?.data;
      const message =
        data?.error?.message ||
        data?.message ||
        (typeof data === 'string' ? data : null) ||
        error.message;
      const normalized = new ExternalApiError(
        message || `Request failed with status ${status || 'unknown'}`,
        status,
        data
      );
      return Promise.reject(normalized);
    }
  );

  return client;
}

/** Default client for Gemini, ElevenLabs, etc. */
const apiClient = createApiClient({ timeout: DEFAULT_TIMEOUT_MS });

module.exports = {
  apiClient,
  createApiClient,
  ExternalApiError,
  DEFAULT_TIMEOUT_MS
};
