const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REGIONS_FILE = path.join(ROOT, 'data', 'regions.json');
const OUT_FILE = path.join(ROOT, 'data', 'wikidata-local-pois.json');
const ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'Codex vending local SEO test/1.0';

const classIds = ['wd:Q55488', 'wd:Q928830', 'wd:Q3918', 'wd:Q16917', 'wd:Q22698', 'wd:Q8502', 'wd:Q33506', 'wd:Q570116', 'wd:Q11315'];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyPoiGroup() {
  return { stations: [], campuses: [], hospitals: [], nature: [], parks: [], landmarks: [], commerce: [] };
}

function sparqlString(value) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"@ko`;
}

function labelCandidates(district) {
  const labels = new Set([district.districtName.trim()]);
  const tokens = district.districtName.trim().split(/\s+/);
  if (tokens.length > 1) labels.add(tokens.at(-1));
  return [...labels];
}

function queryForDistrict(district) {
  const labels = labelCandidates(district).map(sparqlString).join(' ');
  return `SELECT ?poi ?poiLabel ?typeLabel WHERE {
  ?province rdfs:label ${sparqlString(district.provinceOfficialName)}.
  ?district wdt:P131* ?province; rdfs:label ?districtLabel.
  FILTER(LANG(?districtLabel) = "ko")
  VALUES ?districtLabel { ${labels} }
  ?poi wdt:P131 ?district.
  ?poi wdt:P31 ?type.
  ?type wdt:P279* ?class.
  VALUES ?class { ${classIds.join(' ')} }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en". }
}
LIMIT 80`;
}

async function fetchSparql(query) {
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Wikidata ${response.status} ${response.statusText}`);
  return response.json();
}

function cleanName(value) {
  return String(value || '').replace(/\s+/g, ' ').replace(/\(.*?\)/g, '').trim();
}

function isUsableKoreanName(name) {
  if (!name || name.length < 2) return false;
  if (!/[가-힣]/.test(name)) return false;
  if (/^Q\d+$/.test(name)) return false;
  return true;
}

function categoryFor(typeLabel, name) {
  if (/역$/.test(name) || /철도역|도시철도역|지하역|station/i.test(typeLabel)) return 'stations';
  if (/대학교|대학|university/i.test(typeLabel) || /대학교$/.test(name)) return 'campuses';
  if (/병원|hospital/i.test(typeLabel) || /병원$/.test(name)) return 'hospitals';
  if (/산$|봉$/.test(name) || /산|mountain|peak/i.test(typeLabel)) return 'nature';
  if (/공원|park/i.test(typeLabel) || /공원$/.test(name)) return 'parks';
  if (/몰|시장|백화점|상가|shopping|business/i.test(typeLabel)) return 'commerce';
  return 'landmarks';
}

function add(group, category, item) {
  if (!group[category].some((existing) => existing.name === item.name)) group[category].push(item);
}

function parseRows(rows = []) {
  const group = emptyPoiGroup();
  for (const row of rows) {
    const name = cleanName(row.poiLabel?.value);
    if (!isUsableKoreanName(name)) continue;
    const type = cleanName(row.typeLabel?.value);
    const category = categoryFor(type, name);
    add(group, category, { name, type, source: row.poi?.value });
  }
  for (const key of Object.keys(group)) group[key] = group[key].slice(0, 8);
  return group;
}

async function main() {
  const regions = readJson(REGIONS_FILE);
  const output = fs.existsSync(OUT_FILE) ? readJson(OUT_FILE) : {
    source: {
      name: 'Wikidata Query Service',
      url: 'https://query.wikidata.org/',
      fetchedAt: null,
      note: '지역 페이지 테스트용 직접 행정구역 POI 보강 데이터'
    },
    districts: {}
  };

  const provinceArg = process.argv.find((arg) => arg.startsWith('--province='));
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const province = provinceArg?.split('=')[1];
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
  const todo = regions.districts
    .filter((district) => !province || district.provinceSlug === province || district.provinceName === province || district.provinceOfficialName === province)
    .filter((district) => !output.districts[district.officialName])
    .slice(0, limit);

  for (const [index, district] of todo.entries()) {
    try {
      console.log(`fetching ${index + 1}/${todo.length} ${district.officialName}`);
      const data = await fetchSparql(queryForDistrict(district));
      output.districts[district.officialName] = parseRows(data.results.bindings);
      output.source.fetchedAt = new Date().toISOString();
      fs.writeFileSync(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
      await sleep(1200);
    } catch (error) {
      console.warn(`skipped ${district.officialName}: ${error.message}`);
      await sleep(3000);
    }
  }

  console.log(`wrote ${path.relative(ROOT, OUT_FILE)} (${Object.keys(output.districts).length})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
