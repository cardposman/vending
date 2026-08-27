const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REGIONS_FILE = path.join(ROOT, 'data', 'regions.json');
const OUT_FILE = path.join(ROOT, 'data', 'osm-local-pois.json');
const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'Codex vending local SEO test/1.0';

const selectors = [
  'node["railway"="station"](area.searchArea);',
  'way["railway"="station"](area.searchArea);',
  'node["amenity"="university"](area.searchArea);',
  'way["amenity"="university"](area.searchArea);',
  'node["amenity"="hospital"](area.searchArea);',
  'way["amenity"="hospital"](area.searchArea);',
  'node["tourism"="attraction"](area.searchArea);',
  'way["tourism"="attraction"](area.searchArea);',
  'node["tourism"="museum"](area.searchArea);',
  'way["tourism"="museum"](area.searchArea);',
  'node["leisure"="park"](area.searchArea);',
  'way["leisure"="park"](area.searchArea);',
  'node["natural"="peak"](area.searchArea);',
  'way["natural"="peak"](area.searchArea);',
  'node["shop"="mall"](area.searchArea);',
  'way["shop"="mall"](area.searchArea);'
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyPoiGroup() {
  return {
    stations: [],
    campuses: [],
    hospitals: [],
    nature: [],
    parks: [],
    landmarks: [],
    commerce: []
  };
}

function overpassQuery(code) {
  return `[out:json][timeout:25];
relation["ref:KR:mois:legal"="${code}"];
map_to_area->.searchArea;
(
  ${selectors.join('\n  ')}
);
out tags center 80;`;
}

async function fetchOverpass(query) {
  const url = `${ENDPOINT}?data=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Overpass ${response.status} ${response.statusText}`);
  const text = await response.text();
  if (/rate_limited|Too Many Requests/i.test(text)) throw new Error('Overpass rate limited');
  return JSON.parse(text);
}

function cleanName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\(.*?\)/g, '')
    .trim();
}

function bestName(tags = {}) {
  return cleanName(tags['name:ko'] || tags.loc_name || tags.name);
}

function isUsableName(name) {
  if (!name || name.length < 2) return false;
  if (!/[가-힣]/.test(name)) return false;
  if (/놀이터|어린이공원|소공원|마을마당|공영주차장|주차장|쉼터/.test(name)) return false;
  return true;
}

function categoryFor(tags = {}, name) {
  if (tags.railway === 'station' || tags.public_transport === 'station') return 'stations';
  if (tags.amenity === 'university' || /대학교$/.test(name)) return 'campuses';
  if (tags.amenity === 'hospital' || /병원$/.test(name)) return 'hospitals';
  if (tags.natural === 'peak' || /산$|봉$/.test(name)) return 'nature';
  if (tags.leisure === 'park' || /공원$/.test(name)) return 'parks';
  if (tags.shop === 'mall' || /몰$|시장$|백화점$/.test(name)) return 'commerce';
  return 'landmarks';
}

function normalizeName(name, category) {
  if (category === 'stations' && /[가-힣]$/.test(name) && !name.endsWith('역')) return `${name}역`;
  return name;
}

function add(group, category, item) {
  if (!group[category].some((existing) => existing.name === item.name)) group[category].push(item);
}

function parseElements(elements = []) {
  const group = emptyPoiGroup();
  for (const element of elements) {
    const rawName = bestName(element.tags);
    if (!isUsableName(rawName)) continue;
    const category = categoryFor(element.tags, rawName);
    const name = normalizeName(rawName, category);
    add(group, category, {
      name,
      osmType: element.type,
      osmId: element.id
    });
  }

  for (const key of Object.keys(group)) group[key] = group[key].slice(0, 8);
  return group;
}

async function main() {
  const regions = readJson(REGIONS_FILE);
  const output = fs.existsSync(OUT_FILE) ? readJson(OUT_FILE) : {
    source: {
      name: 'OpenStreetMap Overpass API',
      url: 'https://overpass-api.de/',
      fetchedAt: null,
      note: '지역 페이지 테스트용 좌표 기반 POI 보강 데이터'
    },
    districts: {}
  };

  const todo = regions.districts.filter((district) => !output.districts[district.officialName]);
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : todo.length;
  const selected = todo.slice(0, limit);

  for (const [index, district] of selected.entries()) {
    try {
      console.log(`fetching ${index + 1}/${selected.length} ${district.officialName}`);
      const data = await fetchOverpass(overpassQuery(district.code));
      output.districts[district.officialName] = parseElements(data.elements);
      output.source.fetchedAt = new Date().toISOString();
      fs.writeFileSync(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
      await sleep(2200);
    } catch (error) {
      console.warn(`skipped ${district.officialName}: ${error.message}`);
      output.districts[district.officialName] = emptyPoiGroup();
      output.source.fetchedAt = new Date().toISOString();
      fs.writeFileSync(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
      await sleep(5000);
    }
  }

  console.log(`wrote ${path.relative(ROOT, OUT_FILE)} (${Object.keys(output.districts).length})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
