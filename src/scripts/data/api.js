import CONFIG from '../config';

const ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  ADD_STORY: `${CONFIG.BASE_URL}/stories`,
  PUSH_SUBSCRIBE: `${CONFIG.BASE_URL}/push/subscribe`,
};

// Auth Helper
function getToken() {
  return localStorage.getItem('authToken');
}

function saveToken(token) {
  localStorage.setItem('authToken', token);
}

function removeToken() {
  localStorage.removeItem('authToken');
}

function isAuthenticated() {
  return !!getToken();
}

// API Functions
export async function register(name, email, password) {
  const response = await fetch(ENDPOINTS.REGISTER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Registration failed');
  }

  return data;
}

export async function login(email, password) {
  const response = await fetch(ENDPOINTS.LOGIN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }

  // Validate response structure - API Dicoding format (direct loginResult)
  if (!data.loginResult || !data.loginResult.token) {
    throw new Error('Invalid response from server');
  }

  // Save token
  const token = data.loginResult.token;
  saveToken(token);
  
  // Verify token was saved
  const savedToken = getToken();
  if (!savedToken || savedToken !== token) {
    throw new Error('Failed to save authentication token');
  }

  return data;
}

export function logout() {
  removeToken();
  window.location.hash = '#/login';
}

export async function getStories() {
  const response = await fetch(`${ENDPOINTS.STORIES}?location=1`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      logout();
    }
    throw new Error(data.message || 'Failed to fetch stories');
  }

  return data;
}

export async function addStory(formData) {
  const response = await fetch(ENDPOINTS.ADD_STORY, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to add story');
  }

  return data;
}

// Push Notification API
export async function subscribePush(subscription) {
  // Convert PushSubscription to JSON format
  const subscriptionJSON = subscription.toJSON();
  
  const response = await fetch(ENDPOINTS.PUSH_SUBSCRIBE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(subscriptionJSON),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to subscribe push notification');
  }

  return data;
}

// Note: unsubscribePush endpoint not supported by Dicoding API (CORS issue)
// Unsubscribe is handled locally in push-notification.js

export { getToken, saveToken, removeToken, isAuthenticated };