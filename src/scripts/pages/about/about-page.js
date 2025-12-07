export default class AboutPage {
  async render() {
    return `
      <section class="container">
        <article class="about-section">
          <h1>Tentang Story Map</h1>
          
          <p>
            Story Map adalah aplikasi Single-Page Application (SPA) yang memungkinkan Anda untuk 
            berbagi cerita dengan lokasi geografis. Aplikasi ini menampilkan cerita-cerita dari 
            pengguna lain pada peta interaktif, sehingga Anda dapat menjelajahi cerita dari berbagai 
            lokasi di seluruh dunia.
          </p>

          <h2>Fitur Utama:</h2>
          <ul>
            <li>📖 Lihat cerita dari berbagai lokasi di peta interaktif</li>
            <li>➕ Tambahkan cerita baru dengan lokasi pilihan Anda</li>
            <li>📷 Upload foto langsung dari kamera</li>
            <li>🗺️ Beberapa pilihan tampilan peta (tile layers)</li>
            <li>🔍 Filter cerita berdasarkan lokasi</li>
            <li>✨ Navigasi halaman yang smooth dengan custom transition</li>
          </ul>

          <h2>Teknologi yang Digunakan:</h2>
          <ul>
            <li>Vanilla JavaScript (ES6+)</li>
            <li>Vite sebagai build tool</li>
            <li>Leaflet.js untuk peta interaktif</li>
            <li>Story API dari Dicoding</li>
            <li>View Transitions API untuk transisi halaman</li>
            <li>Responsive Design untuk berbagai ukuran layar</li>
          </ul>

          <h2>Aksesibilitas:</h2>
          <p>
            Aplikasi ini dibangun dengan memperhatikan aksesibilitas, termasuk:
          </p>
          <ul>
            <li>Semantic HTML untuk struktur yang jelas</li>
            <li>ARIA labels untuk screen readers</li>
            <li>Keyboard navigation yang lengkap</li>
            <li>Skip to content link</li>
            <li>Alt text pada semua gambar</li>
            <li>Focus indicators yang jelas</li>
          </ul>

          <p>
            <strong>Dibuat untuk memenuhi Submission Dicoding - Front-End Web Intermediate</strong>
          </p>

          <p style="margin-top: 24px;">
            <a href="#/" class="btn btn-primary">← Kembali ke Beranda</a>
          </p>
        </article>
      </section>
    `;
  }

  async afterRender() {
    // No additional logic needed
  }
}
