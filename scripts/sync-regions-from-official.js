const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REGIONS_FILE = path.join(ROOT, 'data', 'regions.json');
const OFFICIAL_FILE = path.join(ROOT, 'data', 'official-sigungu.json');

const provinceSlugs = {
  '서울특별시': 'seoul',
  '부산광역시': 'busan',
  '대구광역시': 'daegu',
  '인천광역시': 'incheon',
  '대전광역시': 'daejeon',
  '울산광역시': 'ulsan',
  '세종특별자치시': 'sejong',
  '경기도': 'gyeonggi-do',
  '강원특별자치도': 'gangwon',
  '충청북도': 'chungcheongbuk-do',
  '충청남도': 'chungcheongnam-do',
  '전북특별자치도': 'jeonbuk',
  '전남광주통합특별시': 'gwangju-jeonnam',
  '경상북도': 'gyeongsangbuk-do',
  '경상남도': 'gyeongsangnam-do',
  '제주특별자치도': 'jeju'
};

const districtSlugOverrides = {
  '서울특별시 은평구': 'eunpyeong-gu',
  '서울특별시 종로구': 'jongno-gu',
  '서울특별시 중구': 'jung-gu',
  '서울특별시 용산구': 'yongsan-gu',
  '서울특별시 성동구': 'seongdong-gu',
  '서울특별시 광진구': 'gwangjin-gu',
  '서울특별시 동대문구': 'dongdaemun-gu',
  '서울특별시 중랑구': 'jungnang-gu',
  '서울특별시 성북구': 'seongbuk-gu',
  '서울특별시 강북구': 'gangbuk-gu',
  '서울특별시 도봉구': 'dobong-gu',
  '서울특별시 노원구': 'nowon-gu',
  '서울특별시 서대문구': 'seodaemun-gu',
  '서울특별시 마포구': 'mapo-gu',
  '서울특별시 양천구': 'yangcheon-gu',
  '서울특별시 강서구': 'gangseo-gu',
  '서울특별시 구로구': 'guro-gu',
  '서울특별시 금천구': 'geumcheon-gu',
  '서울특별시 영등포구': 'yeongdeungpo-gu',
  '서울특별시 동작구': 'dongjak-gu',
  '서울특별시 관악구': 'gwanak-gu',
  '서울특별시 서초구': 'seocho-gu',
  '서울특별시 강남구': 'gangnam-gu',
  '서울특별시 송파구': 'songpa-gu',
  '서울특별시 강동구': 'gangdong-gu',
  '부산광역시 중구': 'jung-gu',
  '대구광역시 중구': 'jung-gu',
  '인천광역시 중구': 'jung-gu'
};

const cho = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const jung = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const jong = ['', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lk', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 'h'];

const suffixes = [
  ['특별자치시', 'si'],
  ['특례시', 'si'],
  ['자치구', 'gu'],
  ['시', 'si'],
  ['군', 'gun'],
  ['구', 'gu']
];

const defaultTags = ['헬스장', '스터디카페', '사무실', '병원', '학교', '모텔'];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function romanizeText(value) {
  return Array.from(value).map((char) => {
    const code = char.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) return char.toLowerCase();
    const offset = code - 0xac00;
    const initial = Math.floor(offset / 588);
    const medial = Math.floor((offset % 588) / 28);
    const final = offset % 28;
    return `${cho[initial]}${jung[medial]}${jong[final]}`;
  }).join('');
}

function slugToken(token) {
  for (const [suffix, slugSuffix] of suffixes) {
    if (token.endsWith(suffix)) {
      const base = token.slice(0, -suffix.length);
      const baseSlug = romanizeText(base);
      return baseSlug ? `${baseSlug}-${slugSuffix}` : slugSuffix;
    }
  }
  return romanizeText(token);
}

function districtSlug(entry) {
  if (districtSlugOverrides[entry.officialName]) return districtSlugOverrides[entry.officialName];
  return entry.districtName
    .split(/\s+/)
    .filter(Boolean)
    .map(slugToken)
    .join('-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function keyFor(region) {
  return `${region.provinceName} ${region.districtName}`;
}

function officialKey(entry) {
  return `${entry.provinceShortName} ${entry.districtName}`;
}

function findExistingDistrict(existingByKey, entry) {
  return existingByKey.get(officialKey(entry)) || existingByKey.get(entry.officialName);
}

function genericLead(name) {
  return `${name} 일대의 주거지, 상업지, 업무 공간, 교육시설 조건을 함께 보며 무인자판기 설치 목적과 운영 방식을 검토하기 좋습니다.`;
}

function genericContext(name) {
  return `${name} 지역은 생활권과 업종 분포에 따라 냉장형·냉동형 멀티자판기, 픽업블록 기능, 일반 무인 판매 구성을 나눠 상담할 수 있습니다.`;
}

function genericNearby(name) {
  return `${name} 주요 생활권과 인근 상권의 유동 동선, 체류 시간, 관리 가능 시간을 함께 확인하면 설치 위치와 상품 구성을 현실적으로 좁힐 수 있습니다.`;
}

function buildRegions() {
  const current = readJson(REGIONS_FILE);
  const official = readJson(OFFICIAL_FILE);
  const existingByKey = new Map(current.districts.map((district) => [keyFor(district), district]));

  const districts = official.districts.map((entry) => {
    const existing = findExistingDistrict(existingByKey, entry);
    const displayName = (entry.displayName || entry.districtName).trim();
    return {
      code: entry.code,
      provinceCode: entry.provinceCode,
      pathCode: entry.pathCode,
      officialName: entry.officialName,
      provinceOfficialName: entry.provinceName,
      provinceName: entry.provinceShortName,
      provinceSlug: provinceSlugs[entry.provinceName] || slugToken(entry.provinceShortName),
      districtName: displayName,
      districtSlug: existing?.districtSlug || districtSlug(entry),
      lead: existing?.lead || genericLead(displayName),
      context: existing?.context || genericContext(displayName),
      nearby: existing?.nearby || genericNearby(displayName),
      tags: existing?.tags || defaultTags,
      dongs: existing?.dongs || []
    };
  });

  return {
    site: current.site,
    source: official.source,
    districts
  };
}

const nextRegions = buildRegions();
fs.writeFileSync(REGIONS_FILE, `${JSON.stringify(nextRegions, null, 2)}\n`, 'utf8');
console.log(`Synced ${nextRegions.districts.length} districts to ${path.relative(ROOT, REGIONS_FILE)}`);
