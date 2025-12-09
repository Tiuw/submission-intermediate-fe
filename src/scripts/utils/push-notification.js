import CONFIG from '../config.js';

class PushNotificationManager {
  constructor() {
    this.swRegistration = null;
    this.isSubscribed = false;
  }

  // Initialize push notifications
  async init(swRegistration) {
    this.swRegistration = swRegistration;

    // Check if push notifications are supported
    if (!('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    // Check current subscription status
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      this.isSubscribed = subscription !== null;
      
      console.log('Push subscription status:', this.isSubscribed);
      
      // Update UI if toggle exists
      this.updateUI();
      
      return true;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }

  // Subscribe to push notifications
  async subscribe() {
    try {
      // Check if service worker is ready
      if (!this.swRegistration) {
        console.error('Service Worker not registered');
        return false;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        alert('Izin notifikasi ditolak. Silakan izinkan notifikasi di pengaturan browser.');
        return false;
      }

      // Get VAPID public key from config
      const vapidPublicKey = await this.getVapidPublicKey();
      
      if (!vapidPublicKey) {
        console.error('VAPID public key not available');
        alert('VAPID key tidak tersedia. Push notification tidak dapat diaktifkan.');
        return false;
      }

      console.log('Subscribing with VAPID key...');

      // Subscribe to push notifications
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      console.log('Push subscription successful:', subscription);

      // Send subscription to Dicoding API server
      // Menggunakan endpoint sesuai dokumentasi: POST /v1/push/subscribe
      // CORS may block in localhost, but will work in production (HTTPS)
      try {
        const { subscribePush } = await import('../data/api.js');
        const response = await subscribePush(subscription);
        console.log('✅ Subscription sent to Dicoding API successfully:', response);
      } catch (apiError) {
        // CORS error is normal in localhost, but push subscription still works locally
        if (apiError.message.includes('CORS') || apiError.message.includes('Failed to fetch')) {
          console.warn('⚠️ CORS error when sending to server (normal in localhost):', apiError.message);
          console.log('ℹ️ Local push subscription still active. Deploy to HTTPS for full server integration.');
        } else {
          // Other errors should be shown to user
          console.error('❌ Error sending subscription to server:', apiError);
          // Don't throw - subscription still works locally
        }
      }

      this.isSubscribed = true;
      this.updateUI();
      
      // Show success notification (optional, might fail if permission issues)
      try {
        await this.showLocalNotification(
          'Notifikasi Aktif!',
          'Anda akan menerima notifikasi untuk cerita baru.'
        );
      } catch (notifError) {
        console.log('Could not show success notification, but subscription is active');
      }

      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      this.isSubscribed = false;
      this.updateUI();
      alert(`Gagal mengaktifkan notifikasi: ${error.message}`);
      return false;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        console.log('No subscription to unsubscribe');
        this.isSubscribed = false;
        this.updateUI();
        return true;
      }

      // Note: Dicoding API doesn't support unsubscribe endpoint (CORS issue)
      // So we only unsubscribe locally
      console.log('Unsubscribing locally (server unsubscribe not supported)');

      // Unsubscribe locally
      const successful = await subscription.unsubscribe();
      
      if (successful) {
        console.log('Push unsubscription successful');
        this.isSubscribed = false;
        this.updateUI();
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }

  // Get VAPID public key from API
  async getVapidPublicKey() {
    try {
      // Use VAPID key from config directly
      // VAPID key dari dokumentasi Dicoding Story API
      if (CONFIG.VAPID_PUBLIC_KEY) {
        console.log('Using VAPID key from config');
        return CONFIG.VAPID_PUBLIC_KEY;
      }
      
      // Try to fetch from API as fallback
      const response = await fetch(`${CONFIG.BASE_URL}/push`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.publicKey) {
          console.log('Got VAPID key from API');
          return data.publicKey;
        }
      }
      
      console.error('VAPID key not found in config or API');
      return null;
      
    } catch (error) {
      console.error('Error fetching VAPID key:', error);
      // Return from config as fallback
      return CONFIG.VAPID_PUBLIC_KEY || null;
    }
  }

  // Convert VAPID key to Uint8Array
  urlBase64ToUint8Array(base64String) {
    try {
      // Remove any whitespace
      base64String = base64String.trim();
      
      // Check if string is valid
      if (!base64String || base64String.length === 0) {
        throw new Error('VAPID key is empty');
      }
      
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch (error) {
      console.error('Error converting VAPID key:', error);
      console.error('VAPID key value:', base64String);
      throw new Error(`Invalid VAPID key format: ${error.message}`);
    }
  }

  // Show local notification (for testing or feedback)
  async showLocalNotification(title, body, data = {}) {
    if (this.swRegistration) {
      await this.swRegistration.showNotification(title, {
        body,
        icon: '/images/icon-192x192.png',
        badge: '/images/icon-72x72.png',
        data,
      });
    }
  }

  // Send subscription to server (optional, depends on your backend)
  async sendSubscriptionToServer(subscription) {
    try {
      // This would be your backend endpoint to store subscriptions
      // Not required for Dicoding submission, but good practice
      console.log('Subscription to store:', JSON.stringify(subscription));
      // await fetch('/api/subscriptions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(subscription),
      // });
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  }

  // Update UI based on subscription status
  updateUI() {
    const toggleButton = document.getElementById('push-toggle');
    
    if (toggleButton) {
      toggleButton.checked = this.isSubscribed;
      
      const label = document.querySelector('label[for="push-toggle"]');
      if (label) {
        label.textContent = this.isSubscribed 
          ? '🔔 Notifikasi Aktif' 
          : '🔕 Aktifkan Notifikasi';
      }
    }
  }

  // Get current subscription status
  getSubscriptionStatus() {
    return this.isSubscribed;
  }
}

export default new PushNotificationManager();
