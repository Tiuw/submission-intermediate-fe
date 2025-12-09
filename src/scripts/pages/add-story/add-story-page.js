export default class AddStoryPage {
  async render() {
    return `
      <section class="add-story-section">
        <div class="container">
          <div class="page-header">
            <h1>Tambah Cerita Baru</h1>
            <a href="#/" class="btn btn-secondary">← Kembali</a>
          </div>

          <form id="add-story-form" class="story-form">
            <div class="form-group">
              <label for="story-description">Deskripsi Cerita *</label>
              <textarea 
                id="story-description" 
                name="description" 
                required 
                rows="4"
                placeholder="Ceritakan pengalaman Anda..."
                aria-required="true"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="story-photo">Foto Cerita *</label>
              <div class="photo-input-group">
                <input 
                  type="file" 
                  id="story-photo" 
                  name="photo" 
                  accept="image/*"
                  aria-required="true"
                />
                <button type="button" id="camera-btn" class="btn btn-secondary">
                  📷 Gunakan Kamera
                </button>
              </div>
              <div id="photo-preview" class="photo-preview"></div>
            </div>

            <div class="form-group">
              <label for="location-display">Lokasi Cerita *</label>
              <p class="form-hint">Klik pada peta untuk memilih lokasi cerita Anda</p>
              <div class="location-info">
                <input 
                  type="text" 
                  id="location-display" 
                  readonly 
                  placeholder="Klik peta untuk memilih lokasi"
                  aria-label="Koordinat lokasi yang dipilih"
                />
                <input type="hidden" id="story-lat" name="lat" />
                <input type="hidden" id="story-lon" name="lon" />
              </div>
              <div id="add-story-map" class="map small-map" role="region" aria-label="Peta untuk memilih lokasi"></div>
            </div>

            <div id="form-error" class="error-message" role="alert" aria-live="polite"></div>
            <div id="form-success" class="success-message" role="alert" aria-live="polite"></div>

            <button type="submit" class="btn btn-primary btn-block">
              <span id="submit-button-text">Kirim Cerita</span>
              <span id="submit-spinner" class="spinner" style="display: none;"></span>
            </button>
          </form>
        </div>
      </section>

      <!-- Camera Modal -->
      <div id="camera-modal" class="modal" role="dialog" aria-labelledby="camera-modal-title" aria-hidden="true">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="camera-modal-title">Ambil Foto</h2>
            <button type="button" id="close-camera" class="close-btn" aria-label="Tutup kamera">&times;</button>
          </div>
          <div class="modal-body">
            <video id="camera-video" autoplay playsinline aria-label="Preview kamera"></video>
            <canvas id="camera-canvas" style="display: none;"></canvas>
            <div class="camera-actions">
              <button type="button" id="capture-btn" class="btn btn-primary">📸 Ambil Foto</button>
              <button type="button" id="cancel-camera" class="btn btn-secondary">Batal</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async afterRender() {
    const addStoryPresenter = new AddStoryPresenter();
    await addStoryPresenter.init();
  }
}

class AddStoryPresenter {
  constructor() {
    this.map = null;
    this.marker = null;
    this.selectedLat = null;
    this.selectedLon = null;
    this.selectedFile = null;
    this.mediaStream = null;
  }

  async init() {
    // Auth check is now handled globally in index.js
    // Just proceed with initialization
    
    this.form = document.getElementById('add-story-form');
    this.descriptionInput = document.getElementById('story-description');
    this.photoInput = document.getElementById('story-photo');
    this.latInput = document.getElementById('story-lat');
    this.lonInput = document.getElementById('story-lon');
    this.locationDisplay = document.getElementById('location-display');
    this.photoPreview = document.getElementById('photo-preview');
    this.errorDiv = document.getElementById('form-error');
    this.successDiv = document.getElementById('form-success');
    this.buttonText = document.getElementById('submit-button-text');
    this.spinner = document.getElementById('submit-spinner');

    await this.loadLeaflet();
    this.initMap();
    this.setupEventListeners();
    this.setupCamera();
  }

  async loadLeaflet() {
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

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
    this.map = L.map('add-story-map').setView([-2.5489, 118.0149], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Click to select location
    this.map.on('click', (e) => {
      this.selectLocation(e.latlng.lat, e.latlng.lng);
    });
  }

  selectLocation(lat, lon) {
    this.selectedLat = lat;
    this.selectedLon = lon;

    this.latInput.value = lat;
    this.lonInput.value = lon;
    this.locationDisplay.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

    // Remove old marker
    if (this.marker) {
      this.marker.remove();
    }

    // Add new marker
    this.marker = L.marker([lat, lon]).addTo(this.map);
    this.map.setView([lat, lon], 13);

    this.clearMessages();
  }

  setupEventListeners() {
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    this.photoInput.addEventListener('change', this.handlePhotoSelect.bind(this));
    this.descriptionInput.addEventListener('input', this.clearMessages.bind(this));
  }

  handlePhotoSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.showPhotoPreview(file);
      this.clearMessages();
    }
  }

  showPhotoPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.photoPreview.innerHTML = `
        <img src="${e.target.result}" alt="Preview foto yang akan diupload" class="preview-image" />
        <button type="button" id="remove-photo" class="btn-remove" aria-label="Hapus foto">✕</button>
      `;

      document.getElementById('remove-photo').addEventListener('click', () => {
        this.selectedFile = null;
        this.photoInput.value = '';
        this.photoPreview.innerHTML = '';
      });
    };
    reader.readAsDataURL(file);
  }

  setupCamera() {
    const cameraBtn = document.getElementById('camera-btn');
    const modal = document.getElementById('camera-modal');
    const closeBtn = document.getElementById('close-camera');
    const cancelBtn = document.getElementById('cancel-camera');
    const captureBtn = document.getElementById('capture-btn');
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');

    cameraBtn.addEventListener('click', async () => {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        video.srcObject = this.mediaStream;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
      } catch (error) {
        this.showError('Gagal mengakses kamera: ' + error.message);
      }
    });

    const closeCamera = () => {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }
      video.srcObject = null;
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    };

    closeBtn.addEventListener('click', closeCamera);
    cancelBtn.addEventListener('click', closeCamera);

    captureBtn.addEventListener('click', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.selectedFile = file;
        this.showPhotoPreview(file);
        
        // Update file input display
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        this.photoInput.files = dataTransfer.files;

        closeCamera();
      }, 'image/jpeg');
    });
  }

  clearMessages() {
    this.errorDiv.textContent = '';
    this.errorDiv.style.display = 'none';
    this.successDiv.textContent = '';
    this.successDiv.style.display = 'none';
  }

  showError(message) {
    this.errorDiv.textContent = message;
    this.errorDiv.style.display = 'block';
    this.errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  showSuccess(message) {
    this.successDiv.textContent = message;
    this.successDiv.style.display = 'block';
  }

  setLoading(loading) {
    if (loading) {
      this.buttonText.textContent = 'Mengirim...';
      this.spinner.style.display = 'inline-block';
      this.form.querySelector('button[type="submit"]').disabled = true;
    } else {
      this.buttonText.textContent = 'Kirim Cerita';
      this.spinner.style.display = 'none';
      this.form.querySelector('button[type="submit"]').disabled = false;
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    this.clearMessages();

    const description = this.descriptionInput.value.trim();

    // Validasi
    if (!description) {
      this.showError('Deskripsi harus diisi');
      this.descriptionInput.focus();
      return;
    }

    if (!this.selectedFile) {
      this.showError('Foto harus dipilih');
      this.photoInput.focus();
      return;
    }

    if (!this.selectedLat || !this.selectedLon) {
      this.showError('Lokasi harus dipilih. Klik pada peta untuk memilih lokasi.');
      return;
    }

    this.setLoading(true);

    try {
      const formData = new FormData();
      formData.append('description', description);
      formData.append('photo', this.selectedFile);
      formData.append('lat', this.selectedLat);
      formData.append('lon', this.selectedLon);

      const { addStory } = await import('../../data/api.js');
      await addStory(formData);

      this.showSuccess('✅ Cerita berhasil ditambahkan! Mengalihkan ke beranda...');

      setTimeout(() => {
        window.location.hash = '#/';
      }, 2000);
    } catch (error) {
      console.error('Error submitting story:', error);
      
      // Check if offline
      if (!navigator.onLine) {
        // Save to IndexedDB for background sync
        await this.saveForBackgroundSync(description, this.selectedFile, this.selectedLat, this.selectedLon);
        
        this.showSuccess('📡 Anda sedang offline. Cerita akan dikirim otomatis saat online kembali.');
        
        setTimeout(() => {
          window.location.hash = '#/';
        }, 3000);
      } else {
        this.showError(error.message || 'Gagal menambahkan cerita. Silakan coba lagi.');
        this.setLoading(false);
      }
    }
  }

  async saveForBackgroundSync(description, file, lat, lon) {
    try {
      const idb = (await import('../../utils/idb.js')).default;
      
      // Convert file to base64 for storage
      const base64 = await this.fileToBase64(file);
      
      await idb.addPendingStory({
        description,
        photo: {
          data: base64,
          name: file.name,
          type: file.type,
        },
        lat,
        lon,
        timestamp: new Date().toISOString(),
      });

      // Register background sync
      if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-stories');
        console.log('Background sync registered');
      }
    } catch (error) {
      console.error('Error saving for background sync:', error);
      throw new Error('Gagal menyimpan cerita untuk sync offline');
    }
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
