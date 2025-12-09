export default class HomePage {
  async render() {
    return `
      <section class="home-section">
        <div class="container">
          <div class="home-header">
            <h1>Story Map</h1>
            <div class="home-actions">
              <a href="#/add-story" class="btn btn-primary">
                <span aria-hidden="true">+</span> Tambah Story
              </a>
              <a href="#/favorites" class="btn btn-secondary">
                📚 Favorit
              </a>
              <button id="logout-btn" class="btn btn-secondary">Logout</button>
            </div>
          </div>
          
          <!-- Push Notification Toggle -->
          <div class="notification-toggle">
            <label class="switch">
              <label for="push-toggle" class="visually-hidden">Toggle push notifications</label>
              <input type="checkbox" id="push-toggle" aria-label="Toggle push notifications">
              <span class="slider"></span>
            </label>
            <label for="push-toggle" id="push-label">🔕 Aktifkan Notifikasi</label>
          </div>

          <div class="filter-section">
            <label for="filter-select">Filter Lokasi:</label>
            <select id="filter-select" class="filter-select">
              <option value="all">Semua Lokasi</option>
            </select>
          </div>

          <div class="content-grid">
            <div class="map-container">
              <div id="map" class="map" role="region" aria-label="Peta interaktif cerita"></div>
            </div>

            <div class="stories-list">
              <h2>Daftar Cerita</h2>
              <div id="stories-container" class="stories-grid" role="list">
                <div class="loading">Memuat cerita...</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const homePresenter = new HomePresenter();
    await homePresenter.init();
  }
}

class HomePresenter {
  constructor() {
    this.map = null;
    this.markers = [];
    this.stories = [];
    this.currentFilter = 'all';
    this.baseLayers = {};
    this.activeMarker = null;
  }

  async init() {
    // Auth check is now handled globally in index.js
    // Just proceed with initialization
    this.setupLogout();
    await this.setupPushNotifications();
    await this.loadLeaflet();
    this.initMap();
    await this.loadStories();
    this.setupFilter();
  }

  async setupPushNotifications() {
    const pushManager = (await import('../../utils/push-notification.js')).default;
    const toggle = document.getElementById('push-toggle');
    const label = document.getElementById('push-label');

    if (!toggle) return;

    // Initialize push notifications with service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await pushManager.init(registration);
        
        // Update UI based on current subscription
        const isSubscribed = pushManager.getSubscriptionStatus();
        toggle.checked = isSubscribed;
        label.textContent = isSubscribed ? '🔔 Notifikasi Aktif' : '🔕 Aktifkan Notifikasi';
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    }

    // Handle toggle changes
    toggle.addEventListener('change', async (e) => {
      const isEnabled = e.target.checked;
      
      try {
        if (isEnabled) {
          const success = await pushManager.subscribe();
          if (!success) {
            toggle.checked = false;
            this.showToast('❌ Gagal mengaktifkan notifikasi', 'error');
          } else {
            label.textContent = '🔔 Notifikasi Aktif';
            this.showToast('✅ Notifikasi diaktifkan', 'success');
          }
        } else {
          const success = await pushManager.unsubscribe();
          if (!success) {
            toggle.checked = true;
            this.showToast('❌ Gagal menonaktifkan notifikasi', 'error');
          } else {
            label.textContent = '🔕 Aktifkan Notifikasi';
            this.showToast('🔕 Notifikasi dinonaktifkan', 'info');
          }
        }
      } catch (error) {
        console.error('Error toggling push notifications:', error);
        toggle.checked = !isEnabled;
        this.showToast('❌ Terjadi kesalahan', 'error');
      }
    });
  }

  setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', async () => {
      const { logout } = await import('../../data/api.js');
      logout();
    });
  }

  async loadLeaflet() {
    if (!window.L) {
      // Load Leaflet CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Load Leaflet JS
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  }

  initMap() {
    // Initialize map centered on Indonesia
    this.map = L.map('map').setView([-2.5489, 118.0149], 5);

    // Multiple tile layers (Advance requirement)
    this.baseLayers = {
      'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }),
      'CartoDB Light': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB',
        maxZoom: 19
      }),
      'CartoDB Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB',
        maxZoom: 19
      })
    };

    // Add default layer
    this.baseLayers['OpenStreetMap'].addTo(this.map);

    // Add layer control
    L.control.layers(this.baseLayers).addTo(this.map);
  }

  async loadStories() {
    const container = document.getElementById('stories-container');
    
    try {
      const { getStories } = await import('../../data/api.js');
      const response = await getStories();
      
      // API response format: { error: false, message: "success", listStory: [...] }
      this.stories = response.listStory || [];

      if (this.stories.length === 0) {
        container.innerHTML = '<p class="empty-state">Belum ada cerita. Tambahkan cerita pertama Anda!</p>';
        return;
      }

      this.displayStories();
      this.addMarkersToMap();
      this.populateFilter();
    } catch (error) {
      container.innerHTML = `<p class="error-state">Gagal memuat cerita: ${error.message}</p>`;
    }
  }

  displayStories(filteredStories = null) {
    const container = document.getElementById('stories-container');
    const stories = filteredStories || this.stories;

    container.innerHTML = stories.map((story, index) => `
      <article class="story-card" data-story-id="${story.id}" tabindex="0" role="listitem">
        <img 
          src="${story.photoUrl}" 
          alt="Foto cerita: ${story.name}"
          class="story-image"
          loading="lazy"
        />
        <div class="story-content">
          <h3 class="story-title">${story.name}</h3>
          <p class="story-description">${story.description}</p>
          <p class="story-meta">
            <span aria-label="Oleh ${story.createdBy || 'Anonim'}">👤 ${story.createdBy || 'Anonim'}</span>
            <span aria-label="Lokasi ${story.lat}, ${story.lon}">📍 ${story.lat?.toFixed(4)}, ${story.lon?.toFixed(4)}</span>
          </p>
          <button 
            class="btn-favorite" 
            data-story-id="${story.id}"
            aria-label="Tambahkan ke favorit"
            title="Tambahkan ke favorit"
          >
            ⭐ Favorit
          </button>
        </div>
      </article>
    `).join('');

    // Add click handlers for story cards (Skilled: sinkronisasi list dan peta)
    container.querySelectorAll('.story-card').forEach((card, index) => {
      const story = stories[index];
      card.addEventListener('click', (e) => {
        // Don't focus if clicking favorite button
        if (!e.target.classList.contains('btn-favorite')) {
          this.focusOnStory(story);
        }
      });
      card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.focusOnStory(story);
      });
    });

    // Add favorite button handlers
    this.setupFavoriteButtons(stories);
  }

  async setupFavoriteButtons(stories) {
    const idb = (await import('../../utils/idb.js')).default;
    
    // Update button states based on favorites
    for (const story of stories) {
      const button = document.querySelector(`.btn-favorite[data-story-id="${story.id}"]`);
      if (button) {
        const isFavorite = await idb.isFavorite(story.id);
        button.textContent = isFavorite ? '⭐ Tersimpan' : '⭐ Favorit';
        button.classList.toggle('active', isFavorite);
      }
    }

    // Add event listeners
    document.querySelectorAll('.btn-favorite').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation();
        const storyId = button.dataset.storyId;
        const story = stories.find(s => s.id === storyId);
        
        if (story) {
          const isFavorite = await idb.isFavorite(storyId);
          
          if (isFavorite) {
            await idb.removeFavorite(storyId);
            button.textContent = '⭐ Favorit';
            button.classList.remove('active');
            this.showToast('Dihapus dari favorit');
          } else {
            await idb.addFavorite(story);
            button.textContent = '⭐ Tersimpan';
            button.classList.add('active');
            this.showToast('✅ Ditambahkan ke favorit');
          }
        }
      });
    });
  }

  addMarkersToMap() {
    // Clear existing markers
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    this.stories.forEach(story => {
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon])
          .bindPopup(`
            <div class="marker-popup">
              <img src="${story.photoUrl}" alt="${story.name}" style="width: 100%; max-width: 200px; border-radius: 4px;"/>
              <h4>${story.name}</h4>
              <p>${story.description.substring(0, 100)}...</p>
              <small>Oleh: ${story.createdBy || 'Anonim'}</small>
            </div>
          `)
          .addTo(this.map);

        // Skilled: Highlight marker aktif
        marker.on('click', () => this.highlightMarker(marker, story));
        
        marker.storyData = story;
        this.markers.push(marker);
      }
    });
  }

  highlightMarker(marker, story) {
    // Remove previous highlight
    if (this.activeMarker) {
      this.activeMarker.setIcon(new L.Icon.Default());
    }

    // Highlight current marker
    const highlightIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    marker.setIcon(highlightIcon);
    this.activeMarker = marker;

    // Scroll to story card
    const storyCard = document.querySelector(`[data-story-id="${story.id}"]`);
    if (storyCard) {
      storyCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      storyCard.focus();
    }
  }

  focusOnStory(story) {
    if (story.lat && story.lon) {
      this.map.setView([story.lat, story.lon], 13);
      
      // Find and highlight the marker
      const marker = this.markers.find(m => m.storyData.id === story.id);
      if (marker) {
        marker.openPopup();
        this.highlightMarker(marker, story);
      }
    }
  }

  populateFilter() {
    const filterSelect = document.getElementById('filter-select');
    
    // Get unique locations
    const locations = [...new Set(this.stories.map(story => 
      `${story.lat?.toFixed(2)}, ${story.lon?.toFixed(2)}`
    ))];

    locations.forEach(location => {
      const option = document.createElement('option');
      option.value = location;
      option.textContent = location;
      filterSelect.appendChild(option);
    });
  }

  setupFilter() {
    const filterSelect = document.getElementById('filter-select');
    
    filterSelect.addEventListener('change', (e) => {
      this.currentFilter = e.target.value;
      
      if (this.currentFilter === 'all') {
        this.displayStories();
        this.map.setView([-2.5489, 118.0149], 5);
      } else {
        const [lat, lon] = this.currentFilter.split(',').map(Number);
        const filtered = this.stories.filter(story => 
          story.lat?.toFixed(2) == lat.toFixed(2) && 
          story.lon?.toFixed(2) == lon.toFixed(2)
        );
        this.displayStories(filtered);
        
        if (filtered.length > 0) {
          this.map.setView([filtered[0].lat, filtered[0].lon], 10);
        }
      }
    });
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

