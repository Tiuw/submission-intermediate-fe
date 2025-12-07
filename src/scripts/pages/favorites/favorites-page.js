import { logout } from '../../data/api.js';
import idb from '../../utils/idb.js';

const FavoritesPage = {
  async render() {
    return `
      <div class="page-container">
        <div class="container">
          <div class="page-header">
            <h1>📚 Cerita Favorit Saya</h1>
            <p>Kumpulan cerita yang telah Anda simpan</p>
          </div>

          <!-- Search and Filter -->
          <div class="favorites-controls">
            <div class="search-box">
              <input 
                type="text" 
                id="search-favorites" 
                placeholder="🔍 Cari cerita favorit..." 
                aria-label="Cari cerita favorit"
              />
            </div>
            <div class="filter-buttons">
              <button id="sort-newest" class="btn-filter active" aria-label="Urutkan terbaru">
                Terbaru
              </button>
              <button id="sort-oldest" class="btn-filter" aria-label="Urutkan terlama">
                Terlama
              </button>
              <button id="sort-name" class="btn-filter" aria-label="Urutkan nama">
                A-Z
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div id="favorites-loading" class="loading-state">
            <div class="spinner"></div>
            <p>Memuat favorit...</p>
          </div>

          <!-- Empty State -->
          <div id="favorites-empty" class="empty-state" style="display: none;">
            <div class="empty-icon">📭</div>
            <h2>Belum Ada Favorit</h2>
            <p>Anda belum menyimpan cerita favorit. Mulai tambahkan dari halaman beranda!</p>
            <a href="#/" class="btn btn-primary">Jelajahi Cerita</a>
          </div>

          <!-- Favorites List -->
          <div id="favorites-list" class="favorites-grid" style="display: none;"></div>

          <!-- Floating Action Button -->
          <a href="#/" class="fab" title="Kembali ke Beranda" aria-label="Kembali ke Beranda">
            🏠
          </a>
        </div>
      </div>
    `;
  },

  async afterRender() {
    await this._loadFavorites();
    this._initializeEventListeners();
  },

  async _loadFavorites(sortBy = 'newest') {
    const loading = document.getElementById('favorites-loading');
    const empty = document.getElementById('favorites-empty');
    const list = document.getElementById('favorites-list');

    try {
      loading.style.display = 'flex';
      empty.style.display = 'none';
      list.style.display = 'none';

      // Get favorites from IndexedDB
      let favorites = await idb.getAllFavorites();

      if (favorites.length === 0) {
        loading.style.display = 'none';
        empty.style.display = 'flex';
        return;
      }

      // Sort favorites
      favorites = this._sortFavorites(favorites, sortBy);

      // Render favorites
      this._renderFavorites(favorites);

      loading.style.display = 'none';
      list.style.display = 'grid';
    } catch (error) {
      console.error('Error loading favorites:', error);
      loading.innerHTML = `
        <div class="error-state">
          <p>❌ Gagal memuat favorit</p>
          <button id="retry-load" class="btn btn-secondary">Coba Lagi</button>
        </div>
      `;

      document.getElementById('retry-load')?.addEventListener('click', () => {
        this._loadFavorites(sortBy);
      });
    }
  },

  _sortFavorites(favorites, sortBy) {
    switch (sortBy) {
      case 'newest':
        return favorites.sort((a, b) => 
          new Date(b.savedAt) - new Date(a.savedAt)
        );
      case 'oldest':
        return favorites.sort((a, b) => 
          new Date(a.savedAt) - new Date(b.savedAt)
        );
      case 'name':
        return favorites.sort((a, b) => 
          a.name.localeCompare(b.name)
        );
      default:
        return favorites;
    }
  },

  _renderFavorites(favorites) {
    const list = document.getElementById('favorites-list');
    
    list.innerHTML = favorites.map(story => `
      <article class="favorite-card" data-story-id="${story.id}">
        <div class="favorite-image">
          ${story.photoUrl 
            ? `<img src="${story.photoUrl}" alt="${story.name}" loading="lazy" />` 
            : '<div class="no-image">📷</div>'
          }
        </div>
        <div class="favorite-content">
          <h3 class="favorite-title">${story.name}</h3>
          <p class="favorite-description">${this._truncateText(story.description, 120)}</p>
          <div class="favorite-meta">
            <span class="favorite-date">
              💾 ${this._formatDate(story.savedAt)}
            </span>
            ${story.lat && story.lon 
              ? `<span class="favorite-location">📍 ${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}</span>` 
              : ''
            }
          </div>
          <div class="favorite-actions">
            <button 
              class="btn-action btn-remove" 
              data-id="${story.id}"
              aria-label="Hapus dari favorit"
            >
              🗑️ Hapus
            </button>
            <button 
              class="btn-action btn-view" 
              data-story='${JSON.stringify(story).replace(/'/g, "&apos;")}'
              aria-label="Lihat detail"
            >
              👁️ Detail
            </button>
          </div>
        </div>
      </article>
    `).join('');

    // Add event listeners to action buttons
    this._attachCardEventListeners();
  },

  _attachCardEventListeners() {
    // Remove buttons
    document.querySelectorAll('.btn-remove').forEach(button => {
      button.addEventListener('click', async (e) => {
        const storyId = e.target.dataset.id;
        await this._removeFavorite(storyId);
      });
    });

    // View buttons
    document.querySelectorAll('.btn-view').forEach(button => {
      button.addEventListener('click', (e) => {
        const story = JSON.parse(e.target.dataset.story);
        this._showStoryDetail(story);
      });
    });
  },

  async _removeFavorite(storyId) {
    if (!confirm('Hapus cerita dari favorit?')) {
      return;
    }

    try {
      await idb.removeFavorite(storyId);
      
      // Show success message
      this._showToast('✅ Dihapus dari favorit', 'success');
      
      // Reload favorites
      const activeSort = document.querySelector('.btn-filter.active')?.id?.replace('sort-', '') || 'newest';
      await this._loadFavorites(activeSort);
    } catch (error) {
      console.error('Error removing favorite:', error);
      this._showToast('❌ Gagal menghapus favorit', 'error');
    }
  },

  _showStoryDetail(story) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" role="dialog" aria-labelledby="modal-title" aria-modal="true">
        <button class="modal-close" aria-label="Tutup">&times;</button>
        <div class="modal-body">
          ${story.photoUrl 
            ? `<img src="${story.photoUrl}" alt="${story.name}" class="modal-image" />` 
            : '<div class="modal-no-image">📷 Tidak ada foto</div>'
          }
          <h2 id="modal-title">${story.name}</h2>
          <p class="modal-description">${story.description}</p>
          <div class="modal-meta">
            <p>📅 Disimpan: ${this._formatDate(story.savedAt)}</p>
            ${story.createdAt ? `<p>✏️ Dibuat: ${this._formatDate(story.createdAt)}</p>` : ''}
            ${story.lat && story.lon 
              ? `<p>📍 Lokasi: ${story.lat.toFixed(6)}, ${story.lon.toFixed(6)}</p>` 
              : ''
            }
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal handlers
    const closeModal = () => {
      modal.remove();
    };

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  },

  _initializeEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-favorites');
    let searchTimeout;

    searchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const query = e.target.value.trim();
        
        if (query) {
          const results = await idb.searchFavorites(query);
          const activeSort = document.querySelector('.btn-filter.active')?.id?.replace('sort-', '') || 'newest';
          const sortedResults = this._sortFavorites(results, activeSort);
          this._renderFavorites(sortedResults);
        } else {
          const activeSort = document.querySelector('.btn-filter.active')?.id?.replace('sort-', '') || 'newest';
          await this._loadFavorites(activeSort);
        }
      }, 300);
    });

    // Sort buttons
    document.querySelectorAll('.btn-filter').forEach(button => {
      button.addEventListener('click', async (e) => {
        // Update active state
        document.querySelectorAll('.btn-filter').forEach(btn => 
          btn.classList.remove('active')
        );
        e.target.classList.add('active');

        // Get sort type
        const sortBy = e.target.id.replace('sort-', '');
        
        // Reload with new sort
        await this._loadFavorites(sortBy);
      });
    });
  },

  _truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  _formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  },

  _showToast(message, type = 'info') {
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
  },
};

export default FavoritesPage;
