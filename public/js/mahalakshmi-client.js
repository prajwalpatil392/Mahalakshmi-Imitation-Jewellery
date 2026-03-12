// Mobile menu toggle
function toggleMobileMenu() {
  const nav = document.getElementById('mainNav');
  const navLinks = document.getElementById('navLinks');
  const hamburger = document.getElementById('hamburger');

  if (navLinks && hamburger && nav) {
    navLinks.classList.toggle('active');
    hamburger.classList.toggle('active');
    nav.classList.toggle('mobile-nav-open');
  }
}

function closeMobileMenu() {
  const nav = document.getElementById('mainNav');
  const navLinks = document.getElementById('navLinks');
  const hamburger = document.getElementById('hamburger');

  if (navLinks && hamburger && nav) {
    navLinks.classList.remove('active');
    hamburger.classList.remove('active');
    nav.classList.remove('mobile-nav-open');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  if (!hamburger) return;
  hamburger.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMobileMenu();
  });
});

// Razorpay lazy loader (wraps existing initiateOnlinePayment if present)
function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Wrap initiateOnlinePayment - must run after mahalakshmi-client.core.js defines it.
// If not yet defined (defer/async edge case), retry next tick up to 5 times.
function wrapInitiateOnlinePayment(retriesLeft) {
  if (retriesLeft === undefined) retriesLeft = 5;
  const original = window.initiateOnlinePayment;
  if (typeof original !== 'function') {
    if (retriesLeft > 0) setTimeout(() => wrapInitiateOnlinePayment(retriesLeft - 1), 0);
    return;
  }
  window.initiateOnlinePayment = async function (orderData) {
    try {
      await loadRazorpay();
      return original(orderData);
    } catch (error) {
      console.error('Failed to load Razorpay:', error);
      if (typeof window.showToast === 'function') {
        window.showToast('Payment system unavailable. Please try another method.', 'error');
      }
      const btn = document.getElementById('placeOrderBtn');
      if (btn) {
        btn.textContent = '✦ Place Order';
        btn.disabled = false;
      }
    }
  };
}
wrapInitiateOnlinePayment();

