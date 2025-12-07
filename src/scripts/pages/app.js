import { getPageForRoute } from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this.#setupDrawer();
    this.#checkViewTransitionSupport();
  }

  #checkViewTransitionSupport() {
    // Check if View Transitions API is supported
    if (!document.startViewTransition) {
      console.warn('View Transitions API not supported. Using fallback.');
    }
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      const isOpen = this.#navigationDrawer.classList.toggle('open');
      this.#drawerButton.setAttribute('aria-expanded', isOpen);
    });

    // Close on outside click
    document.body.addEventListener('click', (event) => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
      }

      // Close on link click
      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
          this.#drawerButton.setAttribute('aria-expanded', 'false');
        }
      });
    });

    // Keyboard navigation: close on Escape
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.#navigationDrawer.classList.contains('open')) {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
        this.#drawerButton.focus();
      }
    });
  }

  async renderPage() {
    const url = getActiveRoute();
    const page = getPageForRoute(url);

    if (!page) {
      console.error('Page not found for route:', url);
      console.log('Available routes:', Object.keys(routes));
      // Fallback to login
      window.location.hash = '#/login';
      return;
    }

    console.log('Rendering page for route:', url);

    // Custom View Transition
    if (document.startViewTransition) {
      document.startViewTransition(async () => {
        this.#content.innerHTML = await page.render();
        await page.afterRender();
      });
    } else {
      // Fallback with CSS animation
      this.#content.style.opacity = '0';
      
      setTimeout(async () => {
        this.#content.innerHTML = await page.render();
        await page.afterRender();
        this.#content.style.opacity = '1';
      }, 150);
    }

    // Focus main content for accessibility
    this.#content.setAttribute('tabindex', '-1');
    this.#content.focus();
  }
}

export default App;
