# Panduan Deployment Story Map

## 🚀 Deployment ke Netlify

### Langkah-langkah:

1. **Build aplikasi:**
   ```bash
   npm run build
   ```

2. **Upload ke Netlify:**
   - Login ke [Netlify](https://netlify.com)
   - Klik "Add new site" → "Deploy manually"
   - Drag & drop folder `dist` ke area upload
   - Atau connect dengan GitHub repository

3. **Konfigurasi Build Settings (jika dari GitHub):**
   ```
   Build command: npm run build
   Publish directory: dist
   ```

4. **Redirect Rules (untuk SPA):**
   Buat file `public/_redirects`:
   ```
   /*    /index.html   200
   ```

## 🌐 Deployment ke Vercel

### Langkah-langkah:

1. **Install Vercel CLI (optional):**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Atau deploy via GitHub:**
   - Login ke [Vercel](https://vercel.com)
   - Import repository
   - Konfigurasi otomatis terdeteksi untuk Vite

## 📦 Deployment ke GitHub Pages

### Langkah-langkah:

1. **Update `vite.config.js`:**
   ```javascript
   import { defineConfig } from 'vite'
   
   export default defineConfig({
     base: '/repository-name/', // Ganti dengan nama repo
   })
   ```

2. **Build dan deploy:**
   ```bash
   npm run build
   git add dist -f
   git commit -m "Deploy to GitHub Pages"
   git subtree push --prefix dist origin gh-pages
   ```

3. **Aktifkan GitHub Pages:**
   - Settings → Pages
   - Source: gh-pages branch

## ✅ Checklist Sebelum Deploy

- [ ] Update STUDENT.txt dengan informasi Anda
- [ ] Test semua fitur di local
- [ ] Pastikan semua dependencies terinstall
- [ ] Build berhasil tanpa error
- [ ] Test responsive di berbagai ukuran layar
- [ ] Test di berbagai browser
- [ ] Pastikan API key tidak terekspos (jika ada)

## 🔍 Testing Production Build

```bash
npm run build
npm run preview
```

Buka http://localhost:4173 untuk test production build di local.

## 📝 Catatan Penting

1. **Environment Variables**: Tidak ada env variable yang perlu dikonfigurasi karena menggunakan public API

2. **CORS**: Story API Dicoding sudah mengizinkan CORS dari semua origin

3. **HTTPS**: Pastikan deploy di HTTPS untuk akses kamera bekerja

4. **Browser Compatibility**: Test di Chrome, Firefox, Safari

## 🐛 Troubleshooting

### Build Error
- Hapus `node_modules` dan install ulang
- Pastikan menggunakan Node.js versi terbaru (16+)

### API Error
- Check koneksi internet
- Verify API endpoint masih aktif
- Check browser console untuk error detail

### Camera Access
- Pastikan aplikasi di-serve melalui HTTPS
- User harus memberikan permission untuk akses kamera
- Test di device yang memiliki kamera

## 📊 Performance

Setelah deploy, test performa dengan:
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

Target Score:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

---

**Selamat deploy! 🎉**
