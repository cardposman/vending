const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const ROOT = path.resolve(__dirname, '..');
const REGIONS_FILE = path.join(ROOT, 'data', 'regions.json');
const OFFICIAL_FILE = path.join(ROOT, 'data', 'official-sigungu.json');
const SOURCE_FILE = path.join(ROOT, 'data', 'source', 'code-go-kr-regcode-full', '법정동코드 전체자료.txt');
const OSM_POI_FILE = path.join(ROOT, 'data', 'osm-local-pois.json');
const WIKIDATA_POI_FILE = path.join(ROOT, 'data', 'wikidata-local-pois.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readOptionalJson(file) {
  return fs.existsSync(file) ? readJson(file) : null;
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

function hash(value) {
  let result = 0;
  for (const char of value) result = ((result << 5) - result + char.charCodeAt(0)) | 0;
  return Math.abs(result);
}

function pick(list, seed) {
  return list[seed % list.length];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function pickSpread(values, limit = 5) {
  const list = unique(values);
  if (list.length <= limit) return list;
  const indexes = [0, Math.floor((list.length - 1) * 0.25), Math.floor((list.length - 1) * 0.5), Math.floor((list.length - 1) * 0.75), list.length - 1];
  return unique(indexes.map((index) => list[index])).slice(0, limit);
}

function stripOfficialPrefix(fullName, officialName) {
  return fullName.replace(`${officialName} `, '').replace(officialName, '').trim();
}

function childDistrictNames(entry, officialDistricts) {
  const prefix = `${entry.officialName} `;
  return officialDistricts
    .filter((candidate) => candidate.officialName.startsWith(prefix))
    .map((candidate) => candidate.officialName.slice(prefix.length).trim())
    .filter((name) => name && !name.includes(' '));
}

function childDistrictEntries(entry, officialDistricts) {
  const prefix = `${entry.officialName} `;
  return officialDistricts
    .filter((candidate) => candidate.officialName.startsWith(prefix))
    .filter((candidate) => {
      const childName = candidate.officialName.slice(prefix.length).trim();
      return childName && !childName.includes(' ');
    });
}

function legalUnitNames(entry, legalRows) {
  return legalRows
    .filter(([code]) => code.startsWith(entry.pathCode) && code !== entry.code && code.slice(8) === '00')
    .map(([, fullName]) => stripOfficialPrefix(fullName, entry.officialName))
    .filter((name) => name && !name.includes(' '))
    .filter((name) => !/^\d/.test(name));
}

function signalScope(districtName, signals, hasChildDistricts) {
  if (hasChildDistricts) return '권역별 생활권';
  if (districtName.endsWith('군') || signals.some((name) => /[읍면]$/.test(name))) return '읍·면 생활권';
  if (districtName.endsWith('구')) return '주요 생활권';
  return '생활권';
}

function joinSignals(signals) {
  if (signals.length <= 1) return signals.join('');
  return `${signals.slice(0, -1).join(', ')}, ${signals.at(-1)}`;
}

function hasFinalConsonant(value) {
  const char = Array.from(value).at(-1);
  if (!char) return false;
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function topic(value) {
  return hasFinalConsonant(value) ? '은' : '는';
}

function objectParticle(value) {
  return hasFinalConsonant(value) ? '을' : '를';
}

function flattenPoiGroup(group) {
  if (!group) return [];
  const priority = ['stations', 'commerce', 'campuses', 'hospitals', 'landmarks', 'nature', 'parks'];
  const result = [];
  for (const key of priority) {
    for (const item of group[key] || []) {
      const name = typeof item === 'string' ? item : item.name;
      if (name && !result.includes(name)) result.push(name);
    }
  }
  return result;
}

function mergePoiGroups(...groups) {
  const merged = {};
  for (const key of ['stations', 'commerce', 'campuses', 'hospitals', 'landmarks', 'nature', 'parks']) {
    merged[key] = [];
    for (const group of groups) {
      for (const item of group?.[key] || []) {
        const name = typeof item === 'string' ? item : item.name;
        if (name && !merged[key].some((existing) => existing.name === name)) merged[key].push(typeof item === 'string' ? { name } : item);
      }
    }
    merged[key] = merged[key].slice(0, 8);
  }
  return merged;
}

function normalizePoiName(name) {
  return String(name || '').replace(/^지하철\s+/, '').trim();
}

function shortRegionName(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .at(-1)
    ?.replace(/(특별시|광역시|특별자치시|특별자치도|자치도|도|시|군|구)$/u, '') || '';
}

function officialNameParts(value) {
  return String(value || '').split(/\s+/).map(shortRegionName).filter((name) => name.length >= 2);
}

function isOutOfScopePoiName(name, allowedPrefixes, regionPrefixes) {
  const prefix = regionPrefixes.find((candidate) => name.startsWith(candidate));
  return Boolean(prefix && !allowedPrefixes.has(prefix));
}

function isBadPoiName(name, allowedPrefixes, regionPrefixes) {
  return !name
    || /세교리역|제천역/.test(name)
    || isOutOfScopePoiName(name, allowedPrefixes, regionPrefixes)
    || /\d+\s*F/i.test(name)
    || /대학$/.test(name)
    || /의원|한의원|치과|약국|동물병원/.test(name)
    || /어린이공원|소공원|마을마당|놀이터|주차장|쉼터/.test(name);
}

function buildCopy(district, signals, scope, poiGroup) {
  const name = district.districtName.trim();
  const signalText = joinSignals(signals);
  const poiNames = pickSpread(flattenPoiGroup(poiGroup), 5);
  const poiText = joinSignals(poiNames);
  const seed = hash(district.officialName);
  if (poiNames.length >= 2) {
    const stationNames = pickSpread((poiGroup.stations || []).map((item) => item.name), 3);
    const facilityNames = pickSpread([
      ...(poiGroup.commerce || []),
      ...(poiGroup.campuses || []),
      ...(poiGroup.hospitals || []),
      ...(poiGroup.landmarks || []),
      ...(poiGroup.nature || []),
      ...(poiGroup.parks || [])
    ].map((item) => item.name), 4);
    const stationText = joinSignals(stationNames);
    const facilityText = joinSignals(facilityNames);
    const leadFocus = stationNames.length ? `${stationText} 주변 역세권` : `${poiText} 주변 생활권`;
    const facilityFocus = facilityNames.length ? `${facilityText}${objectParticle(facilityText)} 함께 고려해` : `${signalText} 생활권을 함께 고려해`;
    return {
      lead: `${name}${topic(name)} ${leadFocus}과 ${signalText} 일대 매장 동선이 겹치는 곳이 많아 자판기 설치 목적을 공간별로 나눠 검토하기 좋습니다.`,
      context: `${facilityFocus} 고객 대기 공간, 직원 복지 공간, 생활편의 판매 위치를 구분하면 냉장형·냉동형 멀티자판기 구성 방향이 더 선명해집니다.`,
      nearby: `${poiText} 방면의 이동 동선과 ${signalText} 인근 상권을 함께 확인하면 전원 위치, 문 열림 공간, 보충 동선을 현실적으로 좁힐 수 있습니다.`
    };
  }

  const leads = [
    `${name}${topic(name)} ${signalText} 등 ${scope}이 이어져 주거지, 상가, 업무 공간별 무인자판기 설치 목적을 나눠 검토하기 좋습니다.`,
    `${signalText} 일대를 함께 보는 ${name} 상담은 고객 동선과 체류 시간, 상품 보충 동선을 기준으로 자판기 구성을 잡기 좋습니다.`,
    `${name} 일대는 ${signalText} 중심의 매장 위치가 서로 달라 냉장형·냉동형 멀티자판기와 픽업블록 기능을 공간별로 나눠 볼 수 있습니다.`
  ];
  const contexts = [
    `${signalText} 주변의 사업장 조건을 함께 보면 직원 복지 공간, 고객 대기 공간, 생활편의형 판매 위치를 구분해 상담할 수 있습니다.`,
    `${name}에서는 ${signalText} 생활권별로 유동 동선과 반복 방문 수요가 달라 운영 상품, 결제 방식, 보충 주기를 따로 검토하는 편이 좋습니다.`,
    `${signalText} 일대의 주거·상업·교육·업무 공간을 나눠 보면 상온형, 냉장형, 냉동형 자판기 중 우선 검토할 구성이 달라질 수 있습니다.`
  ];
  const nearbys = [
    `${signalText} 방면의 생활권과 인근 상권을 기준으로 전원 위치, 문 열림 공간, 관리 동선을 함께 확인하면 설치 가능성을 빠르게 좁힐 수 있습니다.`,
    `${name} 상담에서는 ${signalText} 주변의 방문 시간대와 매장 체류 흐름을 먼저 보고 상품 온도 조건과 배출 방식을 정리합니다.`,
    `${signalText} 일대의 사업장 밀도와 생활 동선을 함께 확인하면 무인 판매기 배치 위치, 상품 구성, 보충 주기를 현실적으로 잡기 좋습니다.`
  ];

  return {
    lead: pick(leads, seed),
    context: pick(contexts, seed + 1),
    nearby: pick(nearbys, seed + 2)
  };
}

function main() {
  const regions = readJson(REGIONS_FILE);
  const official = readJson(OFFICIAL_FILE);
  const legalRows = loadLegalRows();
  const osmPois = readOptionalJson(OSM_POI_FILE)?.districts || {};
  const wikidataPois = readOptionalJson(WIKIDATA_POI_FILE)?.districts || {};

  regions.site.robots = 'index,follow';

  const officialByName = new Map(official.districts.map((district) => [district.officialName, district]));
  const regionPrefixes = unique(official.districts
    .flatMap((district) => officialNameParts(district.officialName)))
    .filter((name) => name.length >= 2);
  let enhanced = 0;

  regions.districts = regions.districts.map((district) => {
    const entry = officialByName.get(district.officialName);
    if (!entry) return district;

    const childEntries = childDistrictEntries(entry, official.districts);
    const childDistricts = childEntries.map((candidate) => stripOfficialPrefix(candidate.officialName, entry.officialName));
    const legalUnits = legalUnitNames(entry, legalRows);
    const sourceSignals = childDistricts.length ? childDistricts : legalUnits;
    const signals = pickSpread(sourceSignals, 5);
    if (!signals.length) return district;

    const districtName = district.districtName.trim();
    const scope = signalScope(districtName, signals, childDistricts.length > 0);
    const childPoiGroups = childEntries.flatMap((candidate) => [osmPois[candidate.officialName], wikidataPois[candidate.officialName]]);
    const poiGroup = mergePoiGroups(osmPois[district.officialName], wikidataPois[district.officialName], ...childPoiGroups);
    const allowedPrefixes = new Set([
      ...officialNameParts(district.officialName),
      ...childEntries.flatMap((candidate) => officialNameParts(candidate.officialName)),
      shortRegionName(district.provinceName),
      shortRegionName(district.provinceOfficialName)
    ].filter((name) => name.length >= 2));
    for (const key of Object.keys(poiGroup)) {
      const seen = new Set();
      poiGroup[key] = poiGroup[key]
        .map((item) => ({ ...item, name: normalizePoiName(item.name) }))
        .filter((item) => {
          if (isBadPoiName(item.name, allowedPrefixes, regionPrefixes) || seen.has(item.name)) return false;
          seen.add(item.name);
          return true;
        });
    }
    const copy = buildCopy({ ...district, districtName }, signals, scope, poiGroup);
    enhanced += 1;

    const preserveSampleCopy = (district.dongs || []).length > 0;
    return {
      ...district,
      districtName,
      localSignals: signals,
      localPois: poiGroup,
      localSignalType: childDistricts.length ? 'child-districts' : 'legal-units',
      localSignalScope: scope,
      lead: preserveSampleCopy ? district.lead : copy.lead,
      context: preserveSampleCopy ? district.context : copy.context,
      nearby: preserveSampleCopy ? district.nearby : copy.nearby
    };
  });

  fs.writeFileSync(REGIONS_FILE, `${JSON.stringify(regions, null, 2)}\n`, 'utf8');
  console.log(`Enhanced ${enhanced} districts with official local signals.`);
  console.log(`Updated robots to ${regions.site.robots}.`);
}

main();
