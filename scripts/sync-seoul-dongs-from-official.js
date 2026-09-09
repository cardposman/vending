const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const ROOT = path.resolve(__dirname, '..');
const REGIONS_FILE = path.join(ROOT, 'data', 'regions.json');
const SOURCE_FILE = path.join(ROOT, 'data', 'source', 'code-go-kr-regcode-full', '법정동코드 전체자료.txt');

const cho = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const jung = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const jong = ['', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lk', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 'h'];

const dongSlugOverrides = {
  '녹번동': 'nokbeondong',
  '불광동': 'bulgwangdong',
  '갈현동': 'galhyeondong',
  '구산동': 'gusandong',
  '대조동': 'daejodong',
  '응암동': 'eungamdong',
  '역촌동': 'yeokchondong',
  '신사동': 'sinsadong',
  '증산동': 'jeungsandong',
  '수색동': 'susaekdong',
  '진관동': 'jingwandong'
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadLegalRows() {
  const text = new TextDecoder('euc-kr').decode(fs.readFileSync(SOURCE_FILE));
  return text.split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('\t'))
    .filter(([code, , status]) => status === '존재' && /^\d{10}$/.test(code));
}

function romanizeText(value) {
  return Array.from(value).map((char) => {
    const code = char.charCodeAt(0);
    if (/[0-9a-zA-Z]/.test(char)) return char.toLowerCase();
    if (code < 0xac00 || code > 0xd7a3) return '-';
    const offset = code - 0xac00;
    const initial = Math.floor(offset / 588);
    const medial = Math.floor((offset % 588) / 28);
    const final = offset % 28;
    return `${cho[initial]}${jung[medial]}${jong[final]}`;
  }).join('');
}

function slugForDong(name, used) {
  const base = dongSlugOverrides[name] || romanizeText(name)
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  let slug = base || 'dong';
  let index = 2;
  while (used.has(slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }
  used.add(slug);
  return slug;
}

function stripDistrictPrefix(fullName, districtOfficialName) {
  return fullName.replace(`${districtOfficialName} `, '').trim();
}

function dongNamesForDistrict(district, legalRows) {
  return legalRows
    .filter(([code]) => code.startsWith(district.pathCode) && code !== district.code && code.slice(8) === '00')
    .map(([, fullName]) => stripDistrictPrefix(fullName, district.officialName))
    .filter((name) => name && !name.includes(' '))
    .filter((name) => !/^\d/.test(name));
}

function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')}, ${names.at(-1)}`;
}

function nearbyNames(names, index) {
  const selected = [
    names[index - 1],
    names[index],
    names[index + 1]
  ].filter(Boolean);
  return [...new Set(selected)];
}

function hash(value) {
  let result = 0;
  for (const char of value) result = ((result << 5) - result + char.charCodeAt(0)) | 0;
  return Math.abs(result);
}

function pick(list, seed) {
  return list[seed % list.length];
}

function flattenPois(localPois) {
  const priority = ['stations', 'commerce', 'campuses', 'hospitals', 'landmarks', 'nature', 'parks'];
  const names = [];
  for (const key of priority) {
    for (const item of localPois?.[key] || []) {
      if (item.name && !names.includes(item.name)) names.push(item.name);
    }
  }
  return names.slice(0, 4);
}

function buildDongCopy(district, dongName, allDongNames, index) {
  const seed = hash(`${district.officialName} ${dongName}`);
  const neighbors = nearbyNames(allDongNames, index);
  const neighborText = joinNames(neighbors);
  const poiNames = flattenPois(district.localPois);
  const poiText = joinNames(poiNames);
  const focusText = poiNames.length ? `${poiText} 방면 이동 동선` : `${neighborText} 주변 생활권`;
  const leads = [
    `${neighborText} 일대와 이어지는 생활권을 기준으로 주거지, 상가, 업무 공간의 무인자판기 설치 목적을 나눠 검토하기 좋습니다.`,
    `${district.districtName} 안에서도 ${neighborText} 일대는 생활 동선과 근린 상권이 맞물려 냉장형·냉동형 멀티자판기 구성을 검토하기 좋습니다.`,
    `${dongName} 주변은 반복 방문 수요와 매장 체류 시간이 달라질 수 있어 운영 상품과 보충 동선을 먼저 나눠 보는 편이 좋습니다.`
  ];
  const contexts = [
    `${dongName}에서는 고객 대기 공간, 직원 복지 공간, 생활편의 판매 위치를 나눠 보면 필요한 자판기 온도 조건과 결제 방식을 잡기 좋습니다.`,
    `${district.districtName} 내 다른 생활권과 비교해 ${dongName} 일대는 매장 규모, 출입 동선, 관리 가능 시간에 맞춘 구성이 중요합니다.`,
    `${focusText}을 함께 보면 소형 매장, 학원, 병원, 사무실처럼 반복 방문이 있는 공간의 운영 방식을 더 구체적으로 정리할 수 있습니다.`
  ];
  const nearbys = [
    `${focusText}과 ${neighborText} 인근 상권을 함께 확인하면 전원 위치, 문 열림 공간, 상품 보충 동선을 현실적으로 좁힐 수 있습니다.`,
    `${neighborText} 주변의 출퇴근·생활 동선과 고객 체류 시간을 함께 보면 상온형, 냉장형, 냉동형 중 우선 검토할 구성이 선명해집니다.`,
    `${dongName} 상담에서는 ${focusText}을 기준으로 고객 대기 공간, 직원 복지 공간, 생활편의 판매 위치를 구분해 볼 수 있습니다.`
  ];
  return {
    lead: pick(leads, seed),
    context: pick(contexts, seed + 2),
    nearby: pick(nearbys, seed + 1)
  };
}

function main() {
  const regions = readJson(REGIONS_FILE);
  const legalRows = loadLegalRows();
  let touchedDistricts = 0;
  let createdDongs = 0;
  let preservedDongs = 0;

  regions.districts = regions.districts.map((district) => {
    if (district.provinceSlug !== 'seoul') return district;
    const names = dongNamesForDistrict(district, legalRows);
    if (!names.length) return district;

    const existingByName = new Map((district.dongs || []).map((dong) => [dong.name, dong]));
    const usedSlugs = new Set();
    const dongs = names.map((name, index) => {
      const existing = existingByName.get(name);
      const slug = existing?.slug || slugForDong(name, usedSlugs);
      if (existing?.slug) usedSlugs.add(existing.slug);
      if (existing && district.officialName === '서울특별시 은평구') {
        preservedDongs += 1;
        return existing;
      }
      if (!existing) createdDongs += 1;
      return {
        name,
        slug,
        ...buildDongCopy(district, name, names, index)
      };
    });

    touchedDistricts += 1;
    return {
      ...district,
      dongs
    };
  });

  fs.writeFileSync(REGIONS_FILE, `${JSON.stringify(regions, null, 2)}\n`, 'utf8');
  console.log(`Synced Seoul dongs for ${touchedDistricts} districts.`);
  console.log(`Created ${createdDongs} dongs, preserved ${preservedDongs} existing dongs.`);
}

main();
