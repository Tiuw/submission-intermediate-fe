// CSS imports
import '../styles/styles.css';

import App from './pages/app';
import { isAuthenticated } from './data/api';

// PWA Install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt event fired');
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Show install button
  showInstallButton();
});

function showInstallButton() {
  // Add install button to header if not already there
  const header = document.querySelector('.main-header');
  if (!header || document.getElementById('install-btn')) return;
  
  const installBtn = document.createElement('button');
  installBtn.id = 'install-btn';
  installBtn.className = 'btn btn-primary';
  installBtn.innerHTML = '⬇️ Install App';
  installBtn.style.marginLeft = '10px';
  
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // Clear the deferredPrompt
    deferredPrompt = null;
    installBtn.remove();
  });
  
  header.appendChild(installBtn);
}

window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  deferredPrompt = null;
  const installBtn = document.getElementById('install-btn');
  if (installBtn) installBtn.remove();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('Service Worker registered successfully:', registration.scope);

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', async (event) => {
        if (event.data.type === 'SYNC_PENDING_STORY') {
          await handlePendingStorySync(event.data.payload);
        }
      });

      // Check for pending stories on page load
      checkPendingStories();
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

// Handle syncing pending stories
async function handlePendingStorySync(pendingStory) {
  try {
    const { addStory, getToken } = await import('./data/api.js');
    const idb = (await import('./utils/idb.js')).default;

    // Convert base64 back to file
    const response = await fetch(pendingStory.photo.data);
    const blob = await response.blob();
    const file = new File([blob], pendingStory.photo.name, { type: pendingStory.photo.type });

    // Create FormData
    const formData = new FormData();
    formData.append('description', pendingStory.description);
    formData.append('photo', file);
    formData.append('lat', pendingStory.lat);
    formData.append('lon', pendingStory.lon);

    // Submit story
    await addStory(formData);

    // Remove from pending stories
    await idb.removePendingStory(pendingStory.id);

    console.log('Pending story synced successfully');
  } catch (error) {
    console.error('Error syncing pending story:', error);
  }
}

// Check and sync pending stories when online
async function checkPendingStories() {
  if (!navigator.onLine) return;

  try {
    const idb = (await import('./utils/idb.js')).default;
    const pendingStories = await idb.getAllPendingStories();

    if (pendingStories.length > 0) {
      console.log(`Found ${pendingStories.length} pending stories, syncing...`);
      
      for (const story of pendingStories) {
        await handlePendingStorySync(story);
      }

      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Story Map', {
          body: `${pendingStories.length} cerita offline berhasil disinkronkan!`,
          icon: '/images/icon-192x192.png',
        });
      }
    }
  } catch (error) {
    console.error('Error checking pending stories:', error);
  }
}

// Listen for online event
window.addEventListener('online', () => {
  console.log('App is online, checking pending stories...');
  checkPendingStories();
});

// Auth guard for protected routes
function checkAuth() {
  const hash = window.location.hash || '#/';
  const publicRoutes = ['#/login', '#/register', '#/about'];
  
  const isAuth = isAuthenticated();
  const isPublicRoute = publicRoutes.includes(hash);
  
  // If trying to access protected route without auth, redirect to login
  if (!isAuth && !isPublicRoute) {
    window.location.hash = '#/login';
    return false;
  }
  
  // If authenticated and on auth page, redirect to home
  if (isAuth && isPublicRoute && hash !== '#/about') {
    window.location.hash = '#/';
    return false;
  }
  
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });
  
  // Check auth and set initial route
  const currentHash = window.location.hash;
  const isAuth = isAuthenticated();
  const publicRoutes = ['#/login', '#/register', '#/about'];
  
  // If no hash or trying to access protected route without auth, redirect to login
  if (!currentHash || currentHash === '#/' || currentHash === '#') {
    if (!isAuth) {
      window.location.hash = '#/login';
    }
  } else if (!isAuth && !publicRoutes.includes(currentHash)) {
    window.location.hash = '#/login';
  } else if (isAuth && (currentHash === '#/login' || currentHash === '#/register')) {
    window.location.hash = '#/';
  }
  
  // Wait a bit for hash change to take effect
  setTimeout(async () => {
    await app.renderPage();
  }, 10);

  window.addEventListener('hashchange', async () => {
    if (checkAuth()) {
      await app.renderPage();
    }
  });
});
