const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'regions.json');
const URLS_FILE = path.join(ROOT, 'data', 'generated-urls.txt');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');
const ROBOTS_FILE = path.join(ROOT, 'robots.txt');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absoluteUrl(origin, urlPath) {
  return `${origin.replace(/\/$/, '')}${urlPath}`;
}

function readUrlPaths() {
  const paths = fs.readFileSync(URLS_FILE, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return ['/', ...paths];
}

function main() {
  const { site } = readJson(DATA_FILE);
  const urls = readUrlPaths();
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((urlPath) => `  <url><loc>${escapeXml(absoluteUrl(site.origin, urlPath))}</loc></url>`),
    '</urlset>',
    ''
  ].join('\n');
  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl(site.origin, '/sitemap.xml')}`,
    ''
  ].join('\n');

  fs.writeFileSync(SITEMAP_FILE, sitemap, 'utf8');
  fs.writeFileSync(ROBOTS_FILE, robots, 'utf8');
  console.log(`wrote sitemap.xml (${urls.length} urls)`);
  console.log('wrote robots.txt');
}

main();
