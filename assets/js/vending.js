const PHONE_NUMBER = '01082681128';
const NAVER_FORM_URL = 'https://naver.me/GT6I7bE7';

function callNow() {
  const cleanNumber = PHONE_NUMBER.replace(/[^0-9+]/g, '');
  if (cleanNumber) window.location.href = 'tel:' + cleanNumber;
}

function openNaverForm() {
  window.open(NAVER_FORM_URL, '_blank', 'noopener,noreferrer');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.site-header').forEach((header) => {
    const button = header.querySelector('.nav-toggle');
    const nav = header.querySelector('.nav');
    const label = button ? button.querySelector('.sr-only') : null;
    if (!button || !nav) return;
    header.classList.add('has-nav-toggle');

    const setOpen = (open) => {
      header.classList.toggle('is-nav-open', open);
      button.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? '메뉴 닫기' : '메뉴 열기';
    };

    button.addEventListener('click', () => {
      setOpen(!header.classList.contains('is-nav-open'));
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });
  });
});

// Load support only on the public site; keep the unfinished solution page empty.
(() => {
  if (location.origin !== 'https://tsvend.com' || /^\/startup-solution(?:\/|$)/.test(location.pathname)) return;

  const start = () => {
    if (document.getElementById('unified-support-loader') || document.querySelector('unified-support-chat')) return;
    const script = document.createElement('script');
    script.id = 'unified-support-loader';
    script.src = 'https://lxrjy-92bbd.web.app/widget.js';
    script.dataset.config = 'https://lxrjy-92bbd.web.app/config.json';
    script.dataset.siteId = 'tsvend';
    script.async = true;
    script.addEventListener('load', () => {
      const widget = document.querySelector('unified-support-chat');
      if (!widget) return;
      let frame;
      const place = () => {
        const footer = document.querySelector('.fixed-cta');
        const rect = footer?.getBoundingClientRect();
        const overlap = rect && rect.height > 0 && rect.width > 0 && rect.top < innerHeight && rect.bottom > 0
          ? Math.max(0, innerHeight - Math.max(0, rect.top)) : 0;
        widget.style.setProperty('--support-bottom', (overlap + 16) + 'px');

        const width = document.documentElement.clientWidth;
        const inset = width <= 480 ? 12 : 20;
        const contentRight = Math.min(width, document.body.getBoundingClientRect().right);
        widget.style.setProperty('--support-right', (Math.max(0, width - contentRight) + inset) + 'px');
      };
      const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); };
      const footer = document.querySelector('.fixed-cta');
      if (footer && 'ResizeObserver' in window) new ResizeObserver(schedule).observe(footer);
      addEventListener('resize', schedule, { passive: true });
      addEventListener('scroll', schedule, { passive: true });
      window.visualViewport?.addEventListener('resize', schedule, { passive: true });
      window.visualViewport?.addEventListener('scroll', schedule, { passive: true });
      place();
    }, { once: true });
    document.body.append(script);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
