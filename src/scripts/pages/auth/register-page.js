export default class RegisterPage {
  async render() {
    return `
      <div class="auth-container">
        <div class="auth-card">
          <h1 class="auth-title">Daftar Story Map</h1>
          <p class="auth-subtitle">Buat akun untuk berbagi cerita Anda</p>
          
          <form id="register-form" class="auth-form">
            <div class="form-group">
              <label for="register-name">Nama Lengkap</label>
              <input 
                type="text" 
                id="register-name" 
                name="name" 
                required 
                placeholder="John Doe"
                autocomplete="name"
                aria-required="true"
              />
            </div>
            
            <div class="form-group">
              <label for="register-email">Email</label>
              <input 
                type="email" 
                id="register-email" 
                name="email" 
                required 
                placeholder="your@email.com"
                autocomplete="email"
                aria-required="true"
              />
            </div>
            
            <div class="form-group">
              <label for="register-password">Password</label>
              <input 
                type="password" 
                id="register-password" 
                name="password" 
                required 
                placeholder="Minimal 8 karakter"
                autocomplete="new-password"
                aria-required="true"
                minlength="8"
              />
              <small class="form-hint">Password minimal 8 karakter</small>
            </div>
            
            <div id="register-error" class="error-message" role="alert" aria-live="polite"></div>
            <div id="register-success" class="success-message" role="alert" aria-live="polite"></div>
            
            <button type="submit" class="btn btn-primary btn-block">
              <span id="register-button-text">Daftar</span>
              <span id="register-spinner" class="spinner" style="display: none;"></span>
            </button>
          </form>
          
          <p class="auth-footer">
            Sudah punya akun? <a href="#/login">Login di sini</a>
          </p>
        </div>
      </div>
    `;
  }

  async afterRender() {
    const registerPresenter = new RegisterPresenter();
    registerPresenter.init();
  }
}

class RegisterPresenter {
  constructor() {
    this.form = document.getElementById('register-form');
    this.nameInput = document.getElementById('register-name');
    this.emailInput = document.getElementById('register-email');
    this.passwordInput = document.getElementById('register-password');
    this.errorDiv = document.getElementById('register-error');
    this.successDiv = document.getElementById('register-success');
    this.buttonText = document.getElementById('register-button-text');
    this.spinner = document.getElementById('register-spinner');
  }

  init() {
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    this.nameInput.addEventListener('input', this.clearMessages.bind(this));
    this.emailInput.addEventListener('input', this.clearMessages.bind(this));
    this.passwordInput.addEventListener('input', this.clearMessages.bind(this));
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
  }

  showSuccess(message) {
    this.successDiv.textContent = message;
    this.successDiv.style.display = 'block';
  }

  setLoading(loading) {
    if (loading) {
      this.buttonText.textContent = 'Memproses...';
      this.spinner.style.display = 'inline-block';
      this.form.querySelector('button[type="submit"]').disabled = true;
    } else {
      this.buttonText.textContent = 'Daftar';
      this.spinner.style.display = 'none';
      this.form.querySelector('button[type="submit"]').disabled = false;
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    this.clearMessages();

    const name = this.nameInput.value.trim();
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    if (!name || !email || !password) {
      this.showError('Semua field harus diisi');
      return;
    }

    if (password.length < 8) {
      this.showError('Password minimal 8 karakter');
      return;
    }

    this.setLoading(true);

    try {
      const { register } = await import('../../data/api.js');
      await register(name, email, password);
      
      this.showSuccess('Registrasi berhasil! Mengalihkan ke halaman login...');
      
      setTimeout(() => {
        window.location.hash = '#/login';
      }, 2000);
    } catch (error) {
      this.showError(error.message || 'Registrasi gagal. Silakan coba lagi.');
      this.setLoading(false);
    }
  }
}
