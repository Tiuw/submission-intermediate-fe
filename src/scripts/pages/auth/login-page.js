// Auth Pages
export default class LoginPage {
  async render() {
    return `
      <div class="auth-container">
        <div class="auth-card">
          <h1 class="auth-title">Login to Story Map</h1>
          <p class="auth-subtitle">Masuk untuk melihat dan berbagi cerita</p>
          
          <form id="login-form" class="auth-form">
            <div class="form-group">
              <label for="login-email">Email</label>
              <input 
                type="email" 
                id="login-email" 
                name="email" 
                required 
                placeholder="your@email.com"
                autocomplete="email"
                aria-required="true"
              />
            </div>
            
            <div class="form-group">
              <label for="login-password">Password</label>
              <input 
                type="password" 
                id="login-password" 
                name="password" 
                required 
                placeholder="Masukkan password"
                autocomplete="current-password"
                aria-required="true"
                minlength="8"
              />
            </div>
            
            <div id="login-error" class="error-message" role="alert" aria-live="polite"></div>
            
            <button type="submit" class="btn btn-primary btn-block">
              <span id="login-button-text">Login</span>
              <span id="login-spinner" class="spinner" style="display: none;"></span>
            </button>
          </form>
          
          <p class="auth-footer">
            Belum punya akun? <a href="#/register">Daftar di sini</a>
          </p>
        </div>
      </div>
    `;
  }

  async afterRender() {
    const loginPresenter = new LoginPresenter();
    loginPresenter.init();
  }
}

class LoginPresenter {
  constructor() {
    this.form = document.getElementById('login-form');
    this.emailInput = document.getElementById('login-email');
    this.passwordInput = document.getElementById('login-password');
    this.errorDiv = document.getElementById('login-error');
    this.buttonText = document.getElementById('login-button-text');
    this.spinner = document.getElementById('login-spinner');
  }

  init() {
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    this.emailInput.addEventListener('input', this.clearError.bind(this));
    this.passwordInput.addEventListener('input', this.clearError.bind(this));
  }

  clearError() {
    this.errorDiv.textContent = '';
    this.errorDiv.style.display = 'none';
  }

  showError(message) {
    this.errorDiv.textContent = message;
    this.errorDiv.style.display = 'block';
  }

  setLoading(loading) {
    if (loading) {
      this.buttonText.textContent = 'Memproses...';
      this.spinner.style.display = 'inline-block';
      this.form.querySelector('button[type="submit"]').disabled = true;
    } else {
      this.buttonText.textContent = 'Login';
      this.spinner.style.display = 'none';
      this.form.querySelector('button[type="submit"]').disabled = false;
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    this.clearError();

    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    if (!email || !password) {
      this.showError('Email dan password harus diisi');
      return;
    }

    if (password.length < 8) {
      this.showError('Password minimal 8 karakter');
      return;
    }

    this.setLoading(true);

    try {
      const { login } = await import('../../data/api.js');
      await login(email, password);
      
      // Login function already verifies token is saved
      // Force page reload to trigger auth guard
      window.location.href = window.location.origin + window.location.pathname + '#/';
      window.location.reload();
    } catch (error) {
      this.showError(error.message || 'Login gagal. Silakan coba lagi.');
      this.setLoading(false);
    }
  }
}
