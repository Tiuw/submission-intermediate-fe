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
      console.log('📤 Sending subscription to server...', subscription.toJSON());
      
      try {
        const { subscribePush } = await import('../data/api.js');
        const result = await subscribePush(subscription);
        console.log('✅ Subscription sent to server successfully:', result);
        
        this.isSubscribed = true;
        this.updateUI();
        
        // Show success notification
        this.showLocalNotification(
          'Notifikasi Aktif!',
          'Anda akan menerima notifikasi untuk cerita baru.'
        );

        return true;
      } catch (apiError) {
        console.error('❌ Failed to send subscription to server:', apiError);
        
        // Check if it's a CORS error in localhost (only ignore CORS in localhost)
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
        
        if (isLocalhost && apiError.message.includes('Failed to fetch')) {
          console.warn('⚠️ CORS error in localhost - this is normal during development');
          console.log('ℹ️ Subscription registered locally. Deploy to HTTPS for full server integration.');
          
          this.isSubscribed = true;
          this.updateUI();
          
          this.showLocalNotification(
            'Notifikasi Aktif (Localhost)',
            'Notifikasi aktif di localhost. Deploy ke HTTPS untuk notifikasi dari server.'
          );
          
          return true;
        }
        
        // For production or non-CORS errors, throw the error
        console.error('❌ Cannot subscribe to push notifications:', apiError.message);
        throw new Error(`Gagal mendaftarkan notifikasi ke server: ${apiError.message}`);
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
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
        
        // Show info notification
        this.showLocalNotification(
          'Notifikasi Dinonaktifkan',
          'Anda tidak akan menerima notifikasi lagi.'
        );
      }

      return successful;
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
