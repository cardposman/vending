# TS밴딩시스템 자판기렌탈 프로젝트 가이드

이 문서는 새 자판기 전용 저장소에서 같은 기준으로 작업을 이어가기 위한 인수인계 문서입니다.

## 프로젝트 개요

- 사이트명: TS밴딩시스템
- 상품명: 자판기렌탈
- 현재 위치: 새 자판기 전용 저장소 루트
- 경로 기준: HTML, CSS, JS, 이미지 링크는 저장소 루트 `/` 기준
- 현재 색인 정책: 지역 확장 작업 기준으로 모든 페이지는 `index,follow`
- 현재 sitemap 정책: 공개 전까지 sitemap은 생성하지 않음

## 핵심 키워드

상품 키워드:

- 무인자판기
- 멀티자판기
- 냉동자판기
- 자판기
- 냉장형/냉동형 멀티자판기
- 픽업블록기능

타깃 업종:

- 학교
- 학원
- 병원
- 골프장
- 사무실
- 회사
- 스터디카페
- 볼링장
- 헬스장
- 체육관
- 모텔
- 세차장
- 무인샵

## 현재 URL 구조

현재 구조:

```text
/
/region/
/region/{province-slug}/
/region/{province-slug}/{district-slug}/
/region/{province-slug}/{district-slug}/{dong-slug}/
```

HTML, CSS, JS, 이미지 링크는 모두 `/` 기준 경로를 사용합니다.

## 현재 생성 페이지

현재 1차 확장은 전국 시/구/군 단위까지, 2차 확장은 서울 전체와 경기 하위 지역까지 생성되어 있습니다.

- 홈 1개
- 테스트용 전체 지역 카테고리 1개
- 테스트용 시도별 카테고리 16개
- 전국 시/구/군 페이지 269개
- 서울 하위 지역 페이지 467개
- 경기 하위 지역 페이지 747개

전체 지역 URL 목록 파일:

```text
data/generated-urls.txt
```

현재 하위 지역 상세 생성 범위:

- 서울 25개 구 전체
- 경기 47개 시/군/일반구 전체
- 총 1,214개 하위 지역 페이지
- 은평구 11개 동은 기존 수동 샘플 문구를 보존
- 나머지 하위 지역 페이지는 공식 하위 지역명, 인접 지역명, 시/구/군 단위 POI를 조합한 자동 문구 사용

## 지역 페이지 생성 기준

지역 확장은 관리지역 기준으로 진행합니다.

- 현재 `/region/`, `/region/{province-slug}/` 카테고리 페이지는 테스트 확인용 내부 링크 허브
- 테스트가 끝나면 생성기에서 카테고리 출력과 홈/헤더 링크를 제거할 수 있음
- 1차: 공식 법정동코드 기준 전국 시/구/군 단위 페이지 생성
- 2차: 필요한 지역부터 하위 읍/면/동 페이지 확장
- 시/구/군 페이지는 동 목록이 없어도 생성 가능
- 하위 지역 목록이 있는 구/시/군 페이지에만 검색 기능 표시
- `~1동`, `~2동`, `~제1동`, `~1.2동`처럼 숫자로 나뉜 지역명은 생활권 기준으로 통합 여부를 검토
- 하위 지역 페이지는 고객이 볼 가능성이 높으므로 구단위보다 상세하고 자연스러운 문구 사용

현재 저장소의 확장 기준 파일:

```text
data/official-sigungu.json
data/official-sigungu.txt
data/regions.json
scripts/generate-regions.js
scripts/extract-official-sigungu.js
scripts/sync-regions-from-official.js
scripts/sync-local-units-from-official.js
scripts/enhance-region-local-info.js
scripts/fetch-wikidata-direct-pois.js
scripts/fetch-osm-local-pois.js
```

1차 전국 시/구/군 확장 기준:

- 원본: 행정표준코드관리시스템 법정동코드 전체자료
- 다운로드 위치: `data/source/code-go-kr-regcode-full-download.bin`
- 추출 결과: `data/official-sigungu.json`, `data/official-sigungu.txt`
- 추출 기준: 현존 법정동코드 중 `시도 2자리 + 시군구 3자리 + 00000` 형식
- 이 기준에는 `수원시`와 `수원시 장안구`처럼 시와 일반구가 함께 포함될 수 있음
- 기존 `지역명_시군구300.txt`는 `data/source/seo-region-candidates-300.txt`에 SEO 후보 원본으로 보존

지역 고유정보 보강 기준:

- 기본 생활권 신호: 공식 원본의 하위 읍/면/동 또는 일반구 이름
- POI 보강 데이터: `data/wikidata-local-pois.json`
- 보조 POI 데이터: `data/osm-local-pois.json`
- `fetch-wikidata-direct-pois.js`는 Wikidata Query Service에서 시/구/군별 역, 대학, 병원, 공원, 산, 박물관, 상업시설 등 직접 소속 POI를 수집
- `fetch-osm-local-pois.js`는 OpenStreetMap Overpass API 기반 보조 수집 스크립트이며, API 제한이 잦으므로 필요 지역만 천천히 재시도
- `enhance-region-local-info.js`는 하위 일반구가 있는 시 페이지에 하위 구 POI도 함께 병합
- POI 데이터는 공개 데이터 품질에 따라 노이즈가 섞일 수 있으므로 생성 전 필터링 규칙을 유지
- 고객 페이지 본문에는 `법정동` 같은 행정 데이터 용어를 노출하지 않음
- 고객용 표현은 `주요 생활권`, `역세권`, `주요 시설`, `인근 상권`, `이동 동선`처럼 자연스러운 상담 문구 사용

사용 방식:

```text
node scripts/extract-official-sigungu.js
node scripts/sync-regions-from-official.js
node scripts/fetch-wikidata-direct-pois.js
node scripts/enhance-region-local-info.js
node scripts/sync-local-units-from-official.js --province=seoul
node scripts/sync-local-units-from-official.js --province=gyeonggi-do
node scripts/generate-regions.js
node scripts/generate-regions.js --write
```

- `extract-official-sigungu.js`는 공식 법정동코드 원본에서 1차 시/구/군 목록을 재생성
- `sync-regions-from-official.js`는 공식 시/구/군 목록을 `data/regions.json`에 반영하고 기존 동단위 데이터는 보존
- `fetch-wikidata-direct-pois.js`는 이미 수집된 지역은 건너뛰며, `--province=seoul`, `--limit=10`처럼 범위를 좁혀 재실행 가능
- `enhance-region-local-info.js`는 공식 하위 읍/면/동 또는 일반구 이름과 POI를 각 시/구/군의 고유 생활권 문구로 반영하고 `index,follow`를 적용
- `sync-local-units-from-official.js`는 지정한 시도 단위의 하위 읍/면/동 목록을 `data/regions.json`에 반영하고, 은평구 수동 샘플 문구는 보존
- `generate-regions.js` 첫 번째 명령은 생성될 파일만 확인하는 dry-run
- `generate-regions.js --write`는 `data/regions.json` 기준으로 시/구/군 및 동단위 페이지 생성 또는 갱신
- 새 하위 지역은 `data/regions.json`의 해당 시/구/군 `dongs`에 slug, 지역 문구, 인근 상권 문구를 추가한 뒤 생성
- 생성 페이지는 현재 `index,follow` 기준으로 출력

## 메타설명문 규칙

지역 페이지의 meta description, `og:description`, JSON-LD description은 아래 규칙을 사용합니다.

```text
### 어디라도 방문상담 @@@ 담당자가 무인자판기 관련 무료상담을 진행합니다. 냉장형/냉동형 멀티자판기. 픽업블록기능. 학교, 학원, 병원, 골프장, 사무실, 모텔 등 다양한 업종에 맞춤형으로 세팅 가능합니다.
```

치환 규칙:

- `@@@`: 현재 페이지의 지역명
- `###`: 현재 지역의 바로 윗단계 지역명

예시:

```text
서울 어디라도 방문상담 은평구 담당자가 무인자판기 관련 무료상담을 진행합니다. ...
은평구 어디라도 방문상담 진관동 담당자가 무인자판기 관련 무료상담을 진행합니다. ...
```

주의:

- 상위지역명은 바로 윗단계만 사용
- 예: `진관동 > 은평구`, `은평구 > 서울`
- `서울 은평구 어디라도...`처럼 두 단계 이상을 동시에 넣지 않음

## 페이지 제목 규칙

지역 페이지의 `<title>`, `og:title`, JSON-LD `name`은 아래 조합으로 생성합니다.

```text
구성 1: 지역명
구성 2: 무인자판기, 멀티자판기, 냉동자판기, 자판기 중 1개
구성 3: 렌탈, 임대, 설치 중 2개를 공백없이 조합
구성 4: 골프장, 병원, 사무실, 회사, 스터디카페, 볼링장, 헬스장, 체육관, 모텔, 세차장 중 2개
구성 5: 연동, 구성, 시공 중 1개
구성 6: 상담, 문의, 안내 중 2개를 공백없이 조합
```

예시:

```text
은평구 자판기 렌탈설치 볼링장 병원 연동 상담안내 | TS밴딩시스템
불광동 멀티자판기 설치임대 골프장 모텔 구성 문의상담 | TS밴딩시스템
```

운영 기준:

- 페이지마다 고정되는 랜덤값을 사용
- 새로고침할 때 제목이 바뀌면 안 됨
- 같은 URL은 항상 같은 제목을 가져야 함

## 본문 지역명 반복 기준

지역명은 과도하게 반복하지 않습니다.

지역명을 남길 위치:

- `<title>`
- meta description
- `og:title`, `og:description`
- JSON-LD WebPage/FAQ 일부
- H1
- 첫 문단
- 주요 CTA
- FAQ 질문 일부
- 대표 이미지 alt 일부

지역명을 줄일 위치:

- 반복 섹션 제목
- 제품 이미지 예시 제목
- 이미지 캡션 대부분
- 일반 설명 문단
- 상담 기준 문단
- FAQ 답변 대부분

대체 표현:

- 이 지역
- 매장 위치
- 상권 특성
- 은평구 일대
- 인근 생활권
- 설치 공간
- 운영 장소
- 사업장 조건

## 페이지 구성

구단위 페이지:

- hero
- 동단위 검색 기능
- 지역 소개
- 인근 상권/생활권
- 마케팅 안내 이미지
- 제품이미지예시
- 상담 기준
- FAQ
- CTA

동단위 페이지:

- hero
- 지역 소개
- 인근 상권/생활권
- 마케팅 안내 이미지
- 제품이미지예시
- 상담 기준
- FAQ
- CTA

메인 상단 메뉴에는 동단위 메뉴를 넣지 않습니다.
구단위 페이지 내부에는 동단위 검색 기능을 넣습니다.

## 이미지 사용 규칙

공통 마케팅 이미지:

- 원본: `C:/vmshere/자판기/new자판기1.png`
- 원본: `C:/vmshere/자판기/new자판기2.png`
- 현재 웹용 변환본:
  - `assets/images/vending-marketing-1.webp`
  - `assets/images/vending-marketing-2.webp`

사용 위치:

- 모든 지역 페이지의 상세 마케팅 섹션에 두 장 모두 삽입
- 첫 화면 대표 이미지로는 사용하지 않음

첫 화면 대표 이미지:

- 원본: `C:/vmshere/자판기/썸원본모음/`
- 현재 웹용 변환본:
  - `assets/images/vending-hero-thumb-01.webp`
  - `assets/images/vending-hero-thumb-02.webp`
  - `assets/images/vending-hero-thumb-03.webp`
  - `assets/images/vending-hero-thumb-04.webp`
  - `assets/images/vending-hero-thumb-05.webp`
  - `assets/images/vending-hero-thumb-06.webp`
  - `assets/images/vending-hero-thumb-07.webp`

사용 기준:

- 페이지별로 랜덤 고정 삽입
- 이미지가 잘리지 않도록 `object-fit: contain` 또는 원본 비율 유지 방식 사용
- `og:image`도 해당 페이지의 대표 이미지와 맞춤

제품 이미지:

- 원본: `C:/Users/82108/Downloads/자판기제품사진/`
- 현재 웹용 변환본:
  - `assets/images/vending-product-01.webp` ~ `vending-product-18.webp`

사용 기준:

- 각 지역 페이지마다 제품 이미지 4장 랜덤 고정 삽입
- 캡션은 `설치예시 #1` ~ `설치예시 #4` 형식으로 작성
- alt도 일반적인 “무인자판기 제품 이미지 예시” 중심으로 작성

이미지 리포트 파일:

```text
vending-test-image-report.txt
vending-test-hero-thumb-report.txt
```

## 상담 링크

전화 상담:

```text
01082681128
tel:01082681128
```

상담예약:

```text
https://naver.me/GT6I7bE7
```

자바스크립트 위치:

```text
assets/js/vending.js
```

## SEO 공개 전환 체크리스트

현재 지역 확장 작업 기준으로는 `index,follow`를 사용합니다.

공개 직전 작업:

- canonical 도메인 최종 확인
- `og:url` 도메인 최종 확인
- `og:image` 절대 URL 최종 확인
- `index,follow` 반영 확인
- `robots.txt` 생성 또는 수정
- `sitemap.xml` 생성
- 생성된 전체 URL 목록 파일 저장
- 메인 홈/지역 홈/샘플 동페이지 브라우저 확인

## 지역 확장 순서

권장 순서:

1. 관리지역 기준 원본 목록 확인
2. 숫자로 나뉜 지역명은 생활권 기준으로 통합 여부 확인
3. `data/regions.json`에 구/시/군과 하위 동 정보 추가
4. `node scripts/generate-regions.js`로 생성 대상 확인
5. `node scripts/generate-regions.js --write`로 페이지 생성
6. 생성된 URL 목록 파일 저장
7. 홈/지역 홈/대표 동페이지 로컬 확인
8. `index,follow` 상태로 전체 검수
9. 도메인 연결 직전에 SEO 공개 전환 체크리스트 수행

## 현재 로컬 확인 방법

로컬 서버 루트 기준으로 확인합니다.

```text
http://127.0.0.1:{port}/
```

```text
http://127.0.0.1:{port}/region/seoul/eunpyeong-gu/
```

## 작업 시 주의사항

- 파일은 UTF-8로 저장
- 새 프로젝트에서는 POS 사이트의 `assets`, `sitemap.xml`, URL 목록 파일과 섞지 않음
- 지역명 반복을 늘리지 않음
- 페이지 제목은 SEO용 `<title>`에 적용하고, 화면 H1은 짧고 자연스럽게 유지
- 검색엔진 공개 전까지 sitemap에 테스트 URL을 넣지 않음
- 생성 결과가 생기면 URL 목록 파일을 반드시 남김
