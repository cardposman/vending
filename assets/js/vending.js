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
