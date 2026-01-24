/**
 * Bokashi Admin - Main JavaScript
 */

// ============================================
// API Helper
// ============================================
const API = {
  async fetch(endpoint, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin'
    };

    const response = await fetch(endpoint, { ...defaultOptions, ...options });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  },

  auth: {
    verify: () => API.fetch('/api/auth/verify'),
    logout: () => API.fetch('/api/auth/logout', { method: 'POST' })
  },

  pages: {
    list: () => API.fetch('/api/pages/list'),
    read: (path) => API.fetch(`/api/pages/read?path=${encodeURIComponent(path)}`),
    update: (path, content, sha) => API.fetch('/api/pages/update', {
      method: 'POST',
      body: JSON.stringify({ path, content, sha })
    }),
    create: (data) => API.fetch('/api/pages/create', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  media: {
    list: () => API.fetch('/api/media/list'),
    upload: (filename, content) => API.fetch('/api/media/upload', {
      method: 'POST',
      body: JSON.stringify({ filename, content })
    }),
    delete: (path) => API.fetch('/api/media/delete', {
      method: 'POST',
      body: JSON.stringify({ path })
    })
  }
};

// ============================================
// Auth Guard
// ============================================
async function checkAuth() {
  try {
    const data = await API.auth.verify();
    if (!data.authenticated) {
      window.location.href = '/admin/login.html';
      return null;
    }
    return data;
  } catch (e) {
    window.location.href = '/admin/login.html';
    return null;
  }
}

// ============================================
// Toast Notifications
// ============================================
const Toast = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },

  show(message, type = 'info', duration = 4000) {
    this.init();

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icons[type]}</span>
      <span class="toast__message">${message}</span>
      <button class="toast__close" aria-label="Fermer">×</button>
    `;

    this.container.appendChild(toast);

    // Close button
    toast.querySelector('.toast__close').addEventListener('click', () => {
      this.remove(toast);
    });

    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }

    return toast;
  },

  remove(toast) {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  },

  success(message) { return this.show(message, 'success'); },
  error(message) { return this.show(message, 'error'); },
  warning(message) { return this.show(message, 'warning'); },
  info(message) { return this.show(message, 'info'); }
};

// Add slideOut animation
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes slideOut {
    to {
      opacity: 0;
      transform: translateX(20px);
    }
  }
`;
document.head.appendChild(toastStyle);

// ============================================
// Modal
// ============================================
const Modal = {
  show(options) {
    const { title, content, actions = [], onClose } = options;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal__header">
          <h3 class="modal__title">${title}</h3>
          <button class="modal__close" aria-label="Fermer">×</button>
        </div>
        <div class="modal__body">${content}</div>
        ${actions.length ? `<div class="modal__footer"></div>` : ''}
      </div>
    `;

    // Add action buttons
    if (actions.length) {
      const footer = overlay.querySelector('.modal__footer');
      actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = `btn ${action.class || 'btn--secondary'}`;
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
          if (action.onClick) action.onClick();
          if (action.closeOnClick !== false) this.close(overlay);
        });
        footer.appendChild(btn);
      });
    }

    // Close handlers
    overlay.querySelector('.modal__close').addEventListener('click', () => {
      if (onClose) onClose();
      this.close(overlay);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (onClose) onClose();
        this.close(overlay);
      }
    });

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    return overlay;
  },

  close(overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 200);
  },

  confirm(message, onConfirm) {
    return this.show({
      title: 'Confirmation',
      content: `<p>${message}</p>`,
      actions: [
        { label: 'Annuler', class: 'btn--secondary' },
        { label: 'Confirmer', class: 'btn--primary', onClick: onConfirm }
      ]
    });
  }
};

// ============================================
// Sidebar Tree
// ============================================
function initSidebarTree() {
  const toggles = document.querySelectorAll('.sidebar__tree-toggle');

  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('expanded');
      const children = toggle.nextElementSibling;
      if (children) {
        children.classList.toggle('expanded');
      }
    });
  });
}

// ============================================
// Page Loading
// ============================================
function showLoading(container) {
  const loader = document.createElement('div');
  loader.className = 'loading-overlay';
  loader.innerHTML = '<div class="loading-spinner"></div>';
  container.style.position = 'relative';
  container.appendChild(loader);
  return loader;
}

function hideLoading(loader) {
  if (loader) loader.remove();
}

// ============================================
// Logout Handler
// ============================================
async function handleLogout() {
  try {
    await API.auth.logout();
  } catch (e) {
    // Ignore errors
  }
  window.location.href = '/admin/login.html';
}

// ============================================
// Local Storage Drafts (Auto-save)
// ============================================
const Drafts = {
  prefix: 'bokashi_draft_',

  save(path, data) {
    const key = this.prefix + btoa(path);
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  },

  get(path) {
    const key = this.prefix + btoa(path);
    const item = localStorage.getItem(key);
    if (!item) return null;

    try {
      const { data, timestamp } = JSON.parse(item);
      // Expire after 24 hours
      if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
        this.remove(path);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  },

  remove(path) {
    const key = this.prefix + btoa(path);
    localStorage.removeItem(key);
  },

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => localStorage.removeItem(k));
  }
};

// ============================================
// File Reader Helper
// ============================================
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================
// Debounce Helper
// ============================================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================
// Keyboard Shortcuts
// ============================================
function initKeyboardShortcuts(handlers = {}) {
  document.addEventListener('keydown', (e) => {
    // Ctrl+S / Cmd+S - Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (handlers.save) handlers.save();
    }

    // Escape - Cancel / Close
    if (e.key === 'Escape') {
      if (handlers.escape) handlers.escape();
    }
  });
}

// ============================================
// Format relative time
// ============================================
function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'à l\'instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours} h`;
  if (days < 7) return `il y a ${days} j`;

  return new Date(date).toLocaleDateString('fr-FR');
}

// ============================================
// Slugify helper
// ============================================
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================
// Export for global use
// ============================================
window.BokashiAdmin = {
  API,
  Toast,
  Modal,
  Drafts,
  checkAuth,
  handleLogout,
  showLoading,
  hideLoading,
  initSidebarTree,
  initKeyboardShortcuts,
  readFileAsDataURL,
  debounce,
  formatRelativeTime,
  slugify
};
