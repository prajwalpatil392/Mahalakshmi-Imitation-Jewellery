// ===== SMOOTH INTERACTIONS & USER-FRIENDLY FEATURES =====

// Scroll reveal animation
function initScrollReveal() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all sections
  document.querySelectorAll('section').forEach(section => {
    section.classList.add('scroll-reveal');
    observer.observe(section);
  });
}

// Smooth scroll to anchor links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      
      if (target) {
        const offsetTop = target.offsetTop - 70;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
        
        // Update URL without jumping
        history.pushState(null, null, href);
      }
    });
  });
}

// Parallax effect for hero section
function initParallax() {
  const hero = document.querySelector('#hero');
  if (!hero) return;
  
  const heroPattern = hero.querySelector('.hero-bg-pattern');
  if (!heroPattern) return;
  
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const rate = scrolled * 0.3;
    
    if (scrolled < window.innerHeight) {
      heroPattern.style.transform = `translateY(${rate}px)`;
    }
  });
}

// Add ripple effect to buttons
function addRippleEffect(button, e) {
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.add('ripple');
  
  button.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
}

// Initialize ripple effects
function initRippleEffects() {
  const buttons = document.querySelectorAll('.btn-cart, .btn-rent, .btn-primary, .btn-outline, .btn-checkout');
  
  buttons.forEach(button => {
    button.addEventListener('click', function(e) {
      addRippleEffect(this, e);
    });
  });
}

// Lazy load images
function initLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
}

// Add loading state to buttons
function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.classList.add('btn-loading');
    button.disabled = true;
  } else {
    button.classList.remove('btn-loading');
    button.disabled = false;
  }
}

// Smooth number counter animation
function animateCounter(element, target, duration = 2000) {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target + '+';
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current) + '+';
    }
  }, 16);
}

// Initialize counter animations when visible
function initCounterAnimations() {
  const stats = document.querySelectorAll('.stat-num');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.textContent);
        animateCounter(entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  stats.forEach(stat => observer.observe(stat));
}

// Add smooth hover effect to product cards
function initProductCardEffects() {
  const cards = document.querySelectorAll('.product-card');
  
  cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });
}

// Smooth cart badge update
function updateCartBadgeSmooth(count) {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  
  if (count > 0) {
    badge.textContent = count;
    badge.classList.add('visible');
    
    // Add pulse animation
    badge.style.animation = 'none';
    setTimeout(() => {
      badge.style.animation = 'badgePulse 0.5s ease';
    }, 10);
  } else {
    badge.classList.remove('visible');
  }
}

// Smooth toast notification
function showToastSmooth(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = 'toast show';
  
  if (type === 'error') {
    toast.classList.add('error-toast');
  }
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.classList.remove('error-toast');
    }, 400);
  }, 3000);
}

// Smooth modal open/close
function openModalSmooth(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  
  // Focus trap
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }
}

function closeModalSmooth(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

// Keyboard navigation support
function initKeyboardNavigation() {
  // Close modals with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('.modal-overlay.open');
      openModals.forEach(modal => {
        modal.classList.remove('open');
      });
      
      const cartDrawer = document.querySelector('.cart-drawer.open');
      if (cartDrawer) {
        closeCart();
      }
      
      document.body.style.overflow = '';
    }
  });
  
  // Tab navigation for cart drawer
  const cartDrawer = document.querySelector('.cart-drawer');
  if (cartDrawer) {
    cartDrawer.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const focusableElements = cartDrawer.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }
}

// Add loading skeleton for products
function showProductSkeleton() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  
  grid.innerHTML = Array(6).fill(0).map(() => `
    <div class="product-card product-skeleton" style="height: 400px;">
      <div style="height: 240px; background: #f0f0f0;"></div>
      <div style="padding: 20px;">
        <div style="height: 20px; background: #e0e0e0; margin-bottom: 10px; border-radius: 4px;"></div>
        <div style="height: 15px; background: #e0e0e0; width: 60%; margin-bottom: 10px; border-radius: 4px;"></div>
        <div style="height: 25px; background: #e0e0e0; width: 40%; margin-bottom: 15px; border-radius: 4px;"></div>
        <div style="height: 40px; background: #e0e0e0; border-radius: 4px;"></div>
      </div>
    </div>
  `).join('');
}

// Smooth form validation
function validateFormField(input) {
  const value = input.value.trim();
  const type = input.type;
  const required = input.required;
  
  if (required && !value) {
    input.style.borderColor = '#ff6b6b';
    return false;
  }
  
  if (type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      input.style.borderColor = '#ff6b6b';
      return false;
    }
  }
  
  if (type === 'tel' && value) {
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(value.replace(/\D/g, ''))) {
      input.style.borderColor = '#ff6b6b';
      return false;
    }
  }
  
  input.style.borderColor = 'var(--gold)';
  return true;
}

// Initialize form validation
function initFormValidation() {
  const inputs = document.querySelectorAll('input, textarea, select');
  
  inputs.forEach(input => {
    input.addEventListener('blur', () => validateFormField(input));
    input.addEventListener('input', () => {
      if (input.style.borderColor === 'rgb(255, 107, 107)') {
        validateFormField(input);
      }
    });
  });
}

// Back to top button
function initBackToTop() {
  const backToTop = document.createElement('button');
  backToTop.innerHTML = '↑';
  backToTop.className = 'back-to-top';
  backToTop.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 24px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--gold);
    color: var(--maroon-deep);
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s;
    z-index: 199;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;
  
  document.body.appendChild(backToTop);
  
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 500) {
      backToTop.style.opacity = '1';
      backToTop.style.pointerEvents = 'all';
    } else {
      backToTop.style.opacity = '0';
      backToTop.style.pointerEvents = 'none';
    }
  });
  
  backToTop.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// Initialize all smooth interactions
function initSmoothInteractions() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    initScrollReveal();
    initSmoothScroll();
    initParallax();
    initRippleEffects();
    initLazyLoading();
    initCounterAnimations();
    initProductCardEffects();
    initKeyboardNavigation();
    initFormValidation();
    initBackToTop();
    
    console.log('✨ Smooth interactions initialized');
  }
}

// Auto-initialize
initSmoothInteractions();

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
  window.smoothInteractions = {
    showToast: showToastSmooth,
    openModal: openModalSmooth,
    closeModal: closeModalSmooth,
    setButtonLoading,
    updateCartBadge: updateCartBadgeSmooth,
    showProductSkeleton
  };
}
