const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'regions.json'), 'utf8'));
const generatedUrls = new Set(fs.readFileSync(path.join(ROOT, 'data', 'generated-urls.txt'), 'utf8')
  .split(/\r?\n/).filter(Boolean));

// Official codes place each city before its subordinate districts.
const districts = [...data.districts].sort((a, b) => a.code.localeCompare(b.code));
const sigunguUrls = [];
const dongUrls = [];

for (const district of districts) {
  const districtUrl = `/region/${district.provinceSlug}/${district.districtSlug}/`;
  sigunguUrls.push(districtUrl);
  for (const dong of district.dongs || []) {
    dongUrls.push(`${districtUrl}${dong.slug}/`);
  }
}

const detailUrls = [...sigunguUrls, ...dongUrls];
if (new Set(detailUrls).size !== detailUrls.length) {
  throw new Error('Duplicate regional URLs found');
}
for (const url of detailUrls) {
  if (!generatedUrls.has(url) || !fs.existsSync(path.join(ROOT, url, 'index.html'))) {
    throw new Error(`Regional page has not been generated: ${url}`);
  }
}
const generatedDetails = [...generatedUrls].filter(url => url.split('/').filter(Boolean).length >= 3);
if (generatedDetails.length !== detailUrls.length) {
  throw new Error('Export does not cover all generated regional detail pages');
}

for (const [filename, urls] of [
  ['generated-urls-sigungu.txt', sigunguUrls],
  ['generated-urls-dong.txt', dongUrls]
]) {
  const absoluteUrls = urls.map(url => new URL(url, data.site.origin).href);
  fs.writeFileSync(path.join(ROOT, 'data', filename), `${absoluteUrls.join('\n')}\n`, 'utf8');
  console.log(`wrote data/${filename} (${urls.length} urls)`);
}
