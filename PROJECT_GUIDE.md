# TS밴딩시스템 자판기렌탈 프로젝트 가이드

이 문서는 새 자판기 전용 저장소에서 같은 기준으로 작업을 이어가기 위한 인수인계 문서입니다.

## 프로젝트 개요

- 사이트명: TS밴딩시스템
- 상품명: 자판기렌탈
- 현재 위치: 새 자판기 전용 저장소 루트
- 경로 기준: HTML, CSS, JS, 이미지 링크는 저장소 루트 `/` 기준
- 현재 색인 정책: 실제 도메인 공개 전까지 모든 페이지는 `noindex,nofollow`
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
/region/seoul/eunpyeong-gu/
/region/seoul/eunpyeong-gu/{dong-slug}/
```

HTML, CSS, JS, 이미지 링크는 모두 `/` 기준 경로를 사용합니다.

## 현재 샘플 페이지

현재까지 만든 샘플 범위는 서울 은평구 전체입니다.

- 홈 1개
- 은평구 구단위 페이지 1개
- 은평구 하위 동단위 페이지 11개

하위 동 목록:

- 녹번동
- 불광동
- 갈현동
- 구산동
- 대조동
- 응암동
- 역촌동
- 신사동
- 증산동
- 수색동
- 진관동

현재 URL 목록 파일:

```text
vending-test-eunpyeong-page-urls.txt
```

## 지역 페이지 생성 기준

지역 확장은 관리지역 기준으로 진행합니다.

- 기존 POS 사이트에서 사용한 `관리지역.txt` 방식을 자판기 프로젝트에도 적용
- 관리지역에 없는 지역은 생성하지 않음
- 구/시/군 단위 페이지와 하위 읍/면/동 페이지를 함께 생성
- `~1동`, `~2동`, `~제1동`, `~1.2동`처럼 숫자로 나뉜 행정동은 생활권 기준으로 통합
- 동단위 페이지는 고객이 볼 가능성이 높으므로 구단위보다 상세하고 자연스러운 문구 사용

현재 저장소의 확장 기준 파일:

```text
data/regions.json
scripts/generate-regions.js
```

사용 방식:

```text
node scripts/generate-regions.js
node scripts/generate-regions.js --write
```

- 첫 번째 명령은 생성될 파일만 확인하는 dry-run
- 두 번째 명령은 `data/regions.json` 기준으로 구/동 페이지 생성 또는 갱신
- 새 지역은 `data/regions.json`에 시도명, slug, 구/시/군명, 하위 동 목록과 지역 문구를 추가한 뒤 생성
- 공개 전까지 생성 페이지의 `noindex,nofollow`는 유지

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

새 저장소에서 실제 도메인으로 공개하기 전까지는 `noindex,nofollow`를 유지합니다.

공개 직전 작업:

- canonical 도메인 최종 확인
- `og:url` 도메인 최종 확인
- `og:image` 절대 URL 최종 확인
- `noindex,nofollow` 제거
- `robots.txt` 생성 또는 수정
- `sitemap.xml` 생성
- 생성된 전체 URL 목록 파일 저장
- 메인 홈/지역 홈/샘플 동페이지 브라우저 확인

## 지역 확장 순서

권장 순서:

1. 관리지역 기준 원본 목록 확인
2. 숫자로 나뉜 행정동은 생활권 기준으로 통합
3. `data/regions.json`에 구/시/군과 하위 동 정보 추가
4. `node scripts/generate-regions.js`로 생성 대상 확인
5. `node scripts/generate-regions.js --write`로 페이지 생성
6. 생성된 URL 목록 파일 저장
7. 홈/지역 홈/대표 동페이지 로컬 확인
8. `noindex` 상태로 전체 검수
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
