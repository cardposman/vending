const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'data', 'source', 'code-go-kr-regcode-full');
const JSON_OUT = path.join(ROOT, 'data', 'official-sigungu.json');
const TXT_OUT = path.join(ROOT, 'data', 'official-sigungu.txt');

function findSourceFile() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Missing source directory: ${path.relative(ROOT, SOURCE_DIR)}`);
  }
  const files = fs.readdirSync(SOURCE_DIR)
    .map((name) => path.join(SOURCE_DIR, name))
    .filter((file) => fs.statSync(file).isFile());
  if (!files.length) throw new Error(`No source files found in ${path.relative(ROOT, SOURCE_DIR)}`);
  return files[0];
}

function shortProvinceName(name) {
  return name
    .replace('특별자치시', '')
    .replace('특별자치도', '')
    .replace('특별시', '')
    .replace('광역시', '')
    .replace('특별자치도', '')
    .replace('도', '');
}

function toRows(text) {
  const rows = text.split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('\t'));

  const provinces = new Map();
  for (const [code, name, status] of rows) {
    if (status === '존재' && /^\d{10}$/.test(code) && code.slice(2) === '00000000') {
      provinces.set(code.slice(0, 2), name);
    }
  }

  return rows
    .filter(([code, , status]) => status === '존재' && /^\d{10}$/.test(code) && code.slice(2, 5) !== '000' && code.slice(5) === '00000')
    .map(([code, officialName]) => {
      const provinceCode = `${code.slice(0, 2)}00000000`;
      const provinceName = provinces.get(code.slice(0, 2)) || officialName.split(/\s+/)[0];
      const districtName = officialName.replace(`${provinceName} `, '');
      return {
        code,
        provinceCode,
        provinceName,
        provinceShortName: shortProvinceName(provinceName),
        districtName,
        officialName,
        displayName: districtName,
        pathCode: code.slice(0, 5)
      };
    });
}

function main() {
  const sourceFile = findSourceFile();
  const text = new TextDecoder('euc-kr').decode(fs.readFileSync(sourceFile));
  const districts = toRows(text);
  const output = {
    source: {
      name: '행정표준코드관리시스템 법정동코드 전체자료',
      url: 'https://www.code.go.kr/stdcode/regCodeL.do',
      downloadedFrom: 'https://www.code.go.kr/etc/codeFullDown.do',
      sourceFile: path.relative(ROOT, sourceFile).replace(/\\/g, '/'),
      extractedAt: new Date().toISOString(),
      rule: '현존 법정동코드 중 시도 2자리 + 시군구 3자리 + 00000 형식',
      count: districts.length
    },
    districts
  };

  fs.writeFileSync(JSON_OUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  fs.writeFileSync(TXT_OUT, `${districts.map((row) => row.officialName).join('\n')}\n`, 'utf8');
  console.log(`wrote ${path.relative(ROOT, JSON_OUT)} (${districts.length})`);
  console.log(`wrote ${path.relative(ROOT, TXT_OUT)} (${districts.length})`);
}

main();
