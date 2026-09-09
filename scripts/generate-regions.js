const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'regions.json');
const WRITE = process.argv.includes('--write');

const titleKeywords = ['무인자판기', '멀티자판기', '냉동자판기', '자판기'];
const titleActions = ['렌탈임대', '렌탈설치', '임대설치', '설치렌탈', '설치임대', '임대렌탈'];
const titleIndustries = ['골프장', '병원', '사무실', '회사', '스터디카페', '볼링장', '헬스장', '체육관', '모텔', '세차장'];
const titleWork = ['연동', '구성', '시공'];
const titleContact = ['상담문의', '상담안내', '문의상담', '문의안내', '안내상담', '안내문의'];
const faqItems = [
  ['자판기 상담 전 무엇을 준비하면 좋나요?', '설치할 공간의 폭과 깊이, 전원 위치, 운영하려는 상품 종류, 관리 가능 시간을 먼저 정리하면 상담이 빠르게 진행됩니다.'],
  ['냉장형과 냉동형은 어떤 기준으로 선택하나요?', '음료나 간식 위주는 냉장·상온 구성이 적합하고, 아이스크림이나 냉동식품은 냉동형 멀티자판기를 우선 검토하는 편이 좋습니다.'],
  ['픽업블록 기능은 어떤 공간에 어울리나요?', '예약 상품, 도시락, 소형 물품처럼 결제 후 지정 칸에서 찾아가는 흐름이 필요한 매장 위치에 잘 맞습니다.']
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function hash(value) {
  let result = 0;
  for (const char of value) result = ((result << 5) - result + char.charCodeAt(0)) | 0;
  return Math.abs(result);
}

function pick(list, seed, offset = 0) {
  return list[(seed + offset) % list.length];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pagePath(district, dong) {
  const parts = ['region', district.provinceSlug, district.districtSlug];
  if (dong) parts.push(dong.slug);
  return `/${parts.join('/')}/`;
}

function regionHubPath() {
  return '/region/';
}

function provincePath(provinceSlug) {
  return `/region/${provinceSlug}/`;
}

function filePathFromUrl(urlPath) {
  const local = urlPath.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  return path.join(ROOT, ...local, 'index.html');
}

function absoluteUrl(site, urlPath) {
  return `${site.origin.replace(/\/$/, '')}${urlPath}`;
}

function imageName(prefix, number) {
  return `${prefix}-${String(number).padStart(2, '0')}.webp`;
}

function titleFor(name, seed) {
  const firstIndustry = pick(titleIndustries, seed, 1);
  let secondIndustry = pick(titleIndustries, seed, 5);
  if (secondIndustry === firstIndustry) secondIndustry = pick(titleIndustries, seed, 6);
  return `${name} ${pick(titleKeywords, seed)} ${pick(titleActions, seed, 2)} ${firstIndustry} ${secondIndustry} ${pick(titleWork, seed, 3)} ${pick(titleContact, seed, 4)} | TS밴딩시스템`;
}

function metaDescription(parentName, currentName) {
  return `${parentName} 어디라도 방문상담 ${currentName} 담당자가 무인자판기 관련 무료상담을 진행합니다. 냉장형/냉동형 멀티자판기. 픽업블록기능. 학교, 학원, 병원, 골프장, 사무실, 모텔 등 다양한 업종에 맞춤형으로 세팅 가능합니다.`;
}

function selectedProducts(seed) {
  const result = [];
  let cursor = seed;
  while (result.length < 4) {
    const next = (cursor % 18) + 1;
    if (!result.includes(next)) result.push(next);
    cursor += 5;
  }
  return result;
}

function head(site, page) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${site.origin}/#website`,
        url: `${site.origin}/`,
        name: site.name,
        inLanguage: 'ko-KR'
      },
      {
        '@type': 'WebPage',
        '@id': `${page.url}#webpage`,
        url: page.url,
        name: page.title,
        description: page.description,
        inLanguage: 'ko-KR',
        isPartOf: { '@id': `${site.origin}/#website` },
        mainEntity: { '@id': `${page.url}#faq` }
      },
      {
        '@type': 'FAQPage',
        '@id': `${page.url}#faq`,
        mainEntity: page.faq.map(([question, answer]) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer }
        }))
      }
    ]
  };

  return `<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.description)}"/>
<link rel="canonical" href="${escapeHtml(page.url)}"/>
<meta name="robots" content="${escapeHtml(site.robots)}"/>
<meta property="og:type" content="website"/>
<meta property="og:locale" content="ko_KR"/>
<meta property="og:title" content="${escapeHtml(page.title)}"/>
<meta property="og:description" content="${escapeHtml(page.description)}"/>
<meta property="og:url" content="${escapeHtml(page.url)}"/>
<meta property="og:image" content="${escapeHtml(page.ogImage)}"/>
<meta property="og:image:alt" content="TS밴딩시스템 무인자판기 상담 이미지"/>
<meta property="og:site_name" content="${escapeHtml(site.name)}"/>
<link rel="stylesheet" href="/assets/css/vending.css?v=20260805b"/>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>`;
}

function header(district, activeDistrict) {
  const districtCurrent = activeDistrict ? ' aria-current="page"' : '';
  return `<header class="site-header"><div class="wrap header-inner">
<a class="logo" href="/">TS밴딩시스템</a>
<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="nav-toggle-bars" aria-hidden="true"></span><span class="sr-only">메뉴 열기</span></button>
<nav id="site-nav" class="nav" aria-label="주요 메뉴"><a href="/">홈</a><a href="/region/">지역별 상담</a><a href="${pagePath(district)}"${districtCurrent}>${escapeHtml(district.districtName)}</a><a href="#contact">상담하기</a></nav>
</div></header>`;
}

function categoryHeader(activeRegion = false) {
  const regionCurrent = activeRegion ? ' aria-current="page"' : '';
  return `<header class="site-header"><div class="wrap header-inner">
<a class="logo" href="/">TS밴딩시스템</a>
<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="nav-toggle-bars" aria-hidden="true"></span><span class="sr-only">메뉴 열기</span></button>
<nav id="site-nav" class="nav" aria-label="주요 메뉴"><a href="/">홈</a><a href="/region/"${regionCurrent}>지역별 상담</a><a href="#contact">상담하기</a></nav>
</div></header>`;
}

function hero(page) {
  return `<section class="hero"><div class="wrap hero-grid"><div>
<span class="eyebrow">무인자판기 방문상담</span>
<h1>${escapeHtml(page.h1)}</h1>
<p class="lead">${escapeHtml(page.lead)}</p>
<div class="hero-actions"><button class="primary" type="button" onclick="callNow()">전화 상담하기</button><button class="secondary" type="button" onclick="openNaverForm()">상담예약하기</button></div>
<div class="hero-points"><span>방문설치 상담</span><span>무인 운영 검토</span><span>상품 구성 안내</span></div>
</div><aside class="hero-panel"><img src="/assets/images/${page.heroImage}" alt="${escapeHtml(page.heroAlt)}"/></aside></div></section>`;
}

function marketingSection() {
  return `<section class="section" aria-labelledby="marketing-title"><div class="wrap">
<div class="section-head"><span class="kicker">마케팅 안내</span><h2 id="marketing-title">공간에 맞는 자판기 운영 방식을 한 번에 검토합니다</h2>
<p>무인 운영, 냉장·냉동 상품, 픽업블록 기능, 광고형 디스플레이까지 설치 공간의 목적에 맞춰 상담할 수 있습니다.</p></div>
<div class="media-stack">
<figure class="long-media"><img src="/assets/images/vending-marketing-1.webp" alt="24시간 무인 판매 솔루션 안내" loading="lazy"/><figcaption>24시간 무인 판매 솔루션</figcaption></figure>
<figure class="long-media"><img src="/assets/images/vending-marketing-2.webp" alt="맞춤 배출 타입과 원격 운영 안내" loading="lazy"/><figcaption>맞춤 배출 타입과 원격 운영 안내</figcaption></figure>
</div></div></section>`;
}

function productSection(products) {
  const cards = products.map((number, index) => `<figure class="product-card"><img src="/assets/images/${imageName('vending-product', number)}" alt="무인자판기 제품 이미지 예시 ${index + 1}" loading="lazy"/><figcaption>설치예시 #${index + 1}</figcaption></figure>`).join('');
  return `<section class="section" aria-labelledby="product-example-title"><div class="wrap">
<div class="section-head"><span class="kicker">제품이미지예시</span><h2 id="product-example-title">제품 사진으로 보는 설치 예시</h2>
<p>사진은 상담 시 참고용 예시이며, 실제 모델과 상품 구성은 설치 공간과 운영 목적에 맞춰 조정됩니다.</p></div>
<div class="product-grid">${cards}</div>
</div></section>`;
}

function guideSection(tags) {
  return `<section class="section" aria-labelledby="guide-title"><div class="wrap">
<div class="section-head"><span class="kicker">상담 기준</span><h2 id="guide-title">사업장 조건별 자판기 구성 기준</h2><p>상담할 때는 모델명보다 운영하려는 공간과 상품 종류를 먼저 정리하는 것이 좋습니다.</p></div>
<div class="grid-2">
<article class="panel"><h3>추천 검토 업종</h3><div class="tags">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div><p>무인 운영이 필요한 공간, 직원 복지 공간, 고객 대기 공간, 야간 판매가 필요한 매장 위치에 우선 적용할 수 있습니다.</p></article>
<article class="panel"><h3>확인 항목</h3><ul class="check-list"><li>설치 공간의 폭, 깊이, 문 열림 공간</li><li>냉장형·냉동형·상온형 중 필요한 온도 조건</li><li>카드·간편결제·키오스크 화면 필요 여부</li><li>상품 보충과 원격 관리 방식</li></ul></article>
</div></div></section>`;
}

function faqSection(faq) {
  return `<section class="section" aria-labelledby="faq-title"><div class="wrap">
<div class="section-head"><span class="kicker">FAQ</span><h2 id="faq-title">자주 확인하는 내용</h2></div>
<div class="faq">${faq.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join('')}</div>
</div></section>`;
}

function finalCta(regionName) {
  return `<section class="final-cta" id="contact"><div class="wrap">
<h2>${escapeHtml(regionName)} 무인자판기 상담 문의</h2>
<p>매장 위치, 운영 상품, 고객 동선, 관리 방식에 맞춰 냉장형·냉동형 멀티자판기와 픽업블록 기능을 검토해보세요.</p>
<div class="cta-actions"><button class="primary" type="button" onclick="callNow()">전화 상담하기</button><button class="secondary" type="button" onclick="openNaverForm()">상담예약하기</button></div>
</div></section>`;
}

function footer() {
  return `<footer class="footer"><div class="wrap">
<strong>TS밴딩시스템</strong><br/>
무인자판기 렌탈 상담 안내 페이지입니다. 실제 상담 조건과 설치 가능 여부는 문의 과정에서 안내됩니다.
</div></footer>
<div class="fixed-cta" role="region" aria-label="하단 고정 상담 버튼">
<div class="wrap fixed-inner"><div class="fixed-title">무인자판기 상담 문의</div><div class="fixed-actions">
<button class="primary" type="button" onclick="callNow()">전화 상담</button>
<button class="secondary" type="button" onclick="openNaverForm()">상담예약</button>
</div></div></div>
<script src="/assets/js/vending.js"></script>`;
}

function districtSearch(district) {
  const dongs = district.dongs || [];
  const total = dongs.length;
  const links = dongs.map((dong) => `<a class="link-card is-hidden" data-region-search-item data-region-search-text="${escapeHtml(`${district.provinceName} ${district.districtName} ${dong.name}`)}" href="${pagePath(district, dong)}">${escapeHtml(dong.name)}</a>`).join('');
  const examples = dongs.slice(0, 3).map((dong) => dong.name).join(', ') || '지역명';
  return `<section class="section" aria-labelledby="dong-search-title"><div class="wrap">
<div class="search-box" data-region-search-scope>
<span class="kicker">동단위 검색</span>
<h2 id="dong-search-title">하위 상세 페이지 찾기</h2>
<p>지역명을 입력하면 해당 상담 페이지가 표시됩니다. 비슷한 생활권은 고객이 찾기 쉬운 이름을 기준으로 정리했습니다.</p>
<div class="search-row"><label class="sr-only" for="dong-search">하위 지역 검색</label><input id="dong-search" type="search" autocomplete="off" placeholder="예: ${escapeHtml(examples)}" data-region-search-input/><div class="search-meta">검색결과 <strong data-region-search-count>0</strong> / 전체 ${total}개</div></div>
<div class="link-grid">${links}</div>
<p class="empty" data-region-search-empty></p>
</div></div></section>`;
}

function contextSection(title, context, nearby) {
  return `<section class="section" aria-labelledby="context-title"><div class="wrap">
<div class="grid-2">
<article class="panel"><span class="kicker">지역 소개</span><h2 id="context-title">${escapeHtml(title)}</h2><p>${escapeHtml(context)}</p><p>이 지역은 운영 품목, 고객 체류 시간, 관리 가능 시간에 따라 적합한 모델이 달라질 수 있습니다.</p></article>
<article class="panel"><span class="kicker">인근 상권</span><h2>매장 위치와 생활권 확인</h2><p>${escapeHtml(nearby)}</p><ul class="check-list"><li>방문객 체류 시간과 피크 시간대 확인</li><li>냉장·냉동 상품과 일반 상품 분리 운영 검토</li><li>전원 위치, 문 열림 공간, 관리 동선 확인</li></ul></article>
</div></div></section>`;
}

function groupByProvince(districts) {
  const groups = new Map();
  for (const district of districts) {
    if (!groups.has(district.provinceSlug)) {
      groups.set(district.provinceSlug, {
        provinceName: district.provinceName,
        provinceSlug: district.provinceSlug,
        districts: []
      });
    }
    groups.get(district.provinceSlug).districts.push(district);
  }
  return [...groups.values()];
}

function categoryLinkGrid(items) {
  return `<div class="link-grid">${items.map((item) => `<a class="link-card" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`).join('')}</div>`;
}

function renderCategoryPage(site, page, content) {
  return `<!DOCTYPE html>
<html lang="ko">
${head(site, page)}
<body>
${categoryHeader(true)}
<main>
${content}
</main>
${footer()}
</body>
</html>
`;
}

function renderRegionHub(site, districts) {
  const groups = groupByProvince(districts);
  const urlPath = regionHubPath();
  const page = {
    title: '전국 무인자판기 지역별 상담 카테고리 | TS밴딩시스템',
    description: '전국 시도별 무인자판기 렌탈 상담 지역 페이지를 확인할 수 있습니다. 시/구/군 단위 상담 페이지로 이동해 설치 지역을 점검해보세요.',
    url: absoluteUrl(site, urlPath),
    ogImage: absoluteUrl(site, '/assets/images/vending-hero-thumb-04.webp'),
    faq: faqItems,
    h1: '전국 무인자판기 지역별 상담',
    lead: '테스트 확인용 지역 카테고리입니다. 시도별로 생성된 시/구/군 상담 페이지를 한 번에 확인할 수 있습니다.',
    heroImage: 'vending-hero-thumb-04.webp',
    heroAlt: '전국 무인자판기 지역별 상담 카테고리 이미지'
  };
  const links = groups.map((group) => ({
    href: provincePath(group.provinceSlug),
    label: `${group.provinceName} ${group.districts.length}개 지역`
  }));
  const content = [
    hero(page),
    `<section class="section" aria-labelledby="region-category-title"><div class="wrap">
<div class="section-head"><span class="kicker">지역 카테고리</span><h2 id="region-category-title">시도별 상담 지역</h2><p>현재 생성된 전국 시/구/군 페이지를 시도 단위로 묶었습니다.</p></div>
${categoryLinkGrid(links)}
</div></section>`,
    faqSection(page.faq),
    finalCta('전국')
  ].join('\n');
  return renderCategoryPage(site, page, content);
}

function renderProvinceHub(site, group) {
  const urlPath = provincePath(group.provinceSlug);
  const page = {
    title: `${group.provinceName} 무인자판기 지역별 상담 카테고리 | TS밴딩시스템`,
    description: `${group.provinceName} 시/구/군별 무인자판기 렌탈 상담 페이지를 확인할 수 있습니다. 설치 지역과 인근 생활권을 기준으로 상담 페이지를 선택해보세요.`,
    url: absoluteUrl(site, urlPath),
    ogImage: absoluteUrl(site, '/assets/images/vending-hero-thumb-05.webp'),
    faq: faqItems,
    h1: `${group.provinceName} 무인자판기 지역별 상담`,
    lead: `${group.provinceName} 안에서 생성된 시/구/군 상담 페이지를 모아둔 테스트용 카테고리입니다. 원하는 지역 페이지로 이동해 본문과 메타 정보를 확인할 수 있습니다.`,
    heroImage: 'vending-hero-thumb-05.webp',
    heroAlt: `${group.provinceName} 무인자판기 지역별 상담 카테고리 이미지`
  };
  const links = group.districts.map((district) => ({
    href: pagePath(district),
    label: district.districtName
  }));
  const content = [
    hero(page),
    `<section class="section" aria-labelledby="province-category-title"><div class="wrap">
<div class="section-head"><span class="kicker">시/구/군 카테고리</span><h2 id="province-category-title">${escapeHtml(group.provinceName)} 상담 지역</h2><p>테스트를 위해 현재 생성된 ${escapeHtml(group.provinceName)} 지역 페이지를 모두 연결했습니다.</p></div>
${categoryLinkGrid(links)}
</div></section>`,
    faqSection(page.faq),
    finalCta(group.provinceName)
  ].join('\n');
  return renderCategoryPage(site, page, content);
}

function renderPage(site, district, dong) {
  const urlPath = pagePath(district, dong);
  const seed = hash(urlPath);
  const regionName = dong ? dong.name : district.districtName;
  const parentName = dong ? district.districtName : district.provinceName;
  const heroImage = imageName('vending-hero-thumb', (seed % 7) + 1);
  const page = {
    title: titleFor(regionName, seed),
    description: metaDescription(parentName, regionName),
    url: absoluteUrl(site, urlPath),
    ogImage: absoluteUrl(site, `/assets/images/${heroImage}`),
    faq: faqItems,
    h1: `${regionName} 무인자판기 렌탈 상담`,
    lead: `${regionName} 일대의 매장 위치와 상권 특성에 맞춰 냉장형·냉동형 멀티자판기, 픽업블록 기능, 무인 운영 방식을 함께 검토합니다. ${dong ? dong.lead : district.lead}`,
    heroImage,
    heroAlt: `${parentName} ${regionName} 무인자판기 대표 상담 이미지`
  };

  const content = [
    hero(page),
    dong ? contextSection('상권 특성에 맞춘 설치 상담', dong.context || dong.lead, dong.nearby) : ((district.dongs || []).length ? districtSearch(district) : ''),
    !dong ? contextSection('상권 특성에 맞춘 설치 상담', district.context, district.nearby) : '',
    marketingSection(),
    productSection(selectedProducts(seed)),
    guideSection(district.tags),
    faqSection(page.faq),
    finalCta(regionName)
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
${head(site, page)}
<body>
${header(district, !dong)}
<main>
${content}
</main>
${footer()}
</body>
</html>
`;
}

function main() {
  const data = readJson(DATA_FILE);
  const files = [];
  const provinceGroups = groupByProvince(data.districts);

  files.push([filePathFromUrl(regionHubPath()), renderRegionHub(data.site, data.districts)]);
  for (const group of provinceGroups) {
    files.push([filePathFromUrl(provincePath(group.provinceSlug)), renderProvinceHub(data.site, group)]);
  }

  for (const district of data.districts) {
    files.push([filePathFromUrl(pagePath(district)), renderPage(data.site, district)]);
    for (const dong of district.dongs || []) {
      files.push([filePathFromUrl(pagePath(district, dong)), renderPage(data.site, district, dong)]);
    }
  }

  for (const [target, html] of files) {
    if (WRITE) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, html, 'utf8');
    }
    console.log(`${WRITE ? 'wrote' : 'would write'} ${path.relative(ROOT, target)}`);
  }

  if (WRITE) {
    const urls = files.map(([target]) => `/${path.relative(ROOT, target).replace(/\\/g, '/').replace(/\/index\.html$/, '/')}`);
    fs.writeFileSync(path.join(ROOT, 'data', 'generated-urls.txt'), `${urls.join('\n')}\n`, 'utf8');
    console.log(`wrote data${path.sep}generated-urls.txt (${urls.length})`);
  }

  if (!WRITE) console.log('\nDry run only. Re-run with --write to create or update region pages.');
}

main();
