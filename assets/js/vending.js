const PHONE_NUMBER = '01082681128';
const NAVER_FORM_URL = 'https://naver.me/GT6I7bE7';

function callNow() {
  const cleanNumber = PHONE_NUMBER.replace(/[^0-9+]/g, '');
  if (cleanNumber) window.location.href = 'tel:' + cleanNumber;
}

function openNaverForm() {
  window.open(NAVER_FORM_URL, '_blank', 'noopener,noreferrer');
}

function normalizeKeyword(value) {
  return (value || '').toString().replace(/\s+/g, '').toLowerCase();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-region-search-scope]').forEach((scope) => {
    const input = scope.querySelector('[data-region-search-input]');
    const items = Array.from(scope.querySelectorAll('[data-region-search-item]'));
    const count = scope.querySelector('[data-region-search-count]');
    const empty = scope.querySelector('[data-region-search-empty]');
    if (!input || !items.length) return;

    const update = () => {
      const keyword = normalizeKeyword(input.value);
      let visible = 0;
      items.forEach((item) => {
        const target = normalizeKeyword(item.getAttribute('data-region-search-text') || item.textContent);
        const show = Boolean(keyword) && target.includes(keyword);
        item.classList.toggle('is-hidden', !show);
        if (show) visible += 1;
      });
      if (count) count.textContent = String(visible);
      if (empty) {
        empty.hidden = Boolean(keyword && visible);
        empty.textContent = keyword ? '검색 결과가 없습니다. 지역명을 줄여서 다시 입력해보세요.' : '동 이름을 입력하면 해당하는 상세 페이지가 표시됩니다.';
      }
    };

    input.addEventListener('input', update);
    update();
  });
});
