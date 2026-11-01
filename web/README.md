# 효명 급식 탄소 (웹앱 · PWA)

효명고 점심 급식 한 끼의 탄소 발자국을 날마다 보여 주는 앱. Next.js 16 (App Router, Cache Components) · Tailwind CSS 4.

## 화면

| 경로 | 내용 |
|---|---|
| `/` | 오늘(또는 다음) 급식의 탄소, 메뉴별 탄소, 알레르기 경고, 줄이기 팁. `?d=YYYY-MM-DD` 로 날짜 지정 |
| `/meals` | 주간 목록 · 월간 달력(탄소 색 칸, 주 평균) · 메뉴 검색 |
| `/records` | 먹은 양 기록으로 쌓인 "줄인 탄소"와 1학년 순위 (예시 학생은 가상 데이터) |
| `/insights` | 기간 평균, 식품 분류별 비율, 달별 추이, 탄소가 많은 메뉴, 계산 방법과 출처 |
| `/settings` | 내 알레르기, 화면 테마, 앱 설치(QR), 데이터 상태 |
| `/install` | 발표·교실용 큰 QR 과 기기별 설치 안내 |

## 먹은 양 기록과 순위

- 메뉴마다 남긴 비율(0·25·50·100%)을 이 기기에 저장한다 (`src/lib/meal-log.ts`).
- "줄인 탄소" = (한 끼의 25%를 남기는 학생(가정) - 내가 남긴 양) × 메뉴 탄소.
- 순위의 다른 학생 11명은 화면을 보여 주기 위한 예시 데이터다 (`src/lib/demo-students.ts`). 서버가 없어 실제 학생끼리 겨루지는 않는다.

## 그림

- 음식·알레르기 그림: Microsoft Fluent Emoji 3D (MIT, `public/img/fluent/LICENSE.txt`). 메뉴 이름 → 그림 규칙은 `src/lib/food-image.ts`.
- 앱 아이콘(`public/icons/`)과 공유 이미지(`public/og.jpg`) 그림은 Codex 로 만들고, 공유 이미지의 글자는 Pretendard 로 얹었다.

## 데이터 흐름

1. `src/data/meals-snapshot.json` (받아 둔 나이스 식단) + 나이스 API 에서 최근 2주~다음 달 말까지 새로 받은 식단을 합친다 (`src/lib/server/dataset.ts`, 6시간마다 다시 만든다).
2. 메뉴마다 `src/data/recipes.json` 의 1인분 재료로 탄소·열량을 계산한다. 재료표에 없는 새 메뉴는 AI 없이 규칙으로 추정한다 (`src/lib/carbon/estimate.ts`).
3. 하루 등급은 급식 분포의 하위·상위 30% 로 나눈다.

`src/data/*.json` 은 저장소 루트 `data/` 에서 만든다. 루트 `data/` 를 고쳤다면 `npm run sync-data` 후 함께 커밋한다.

## 명령

```bash
npm install
npm run dev            # 개발 서버 (서비스 워커는 배포 빌드에서만 켜진다)
npm run build && npm start
npm run lint && npm run typecheck
npm run verify-calc    # 탄소 계산이 기존 Python 결과(data/results-2026.json)와 같은지 대조
npm run eval-estimator # 재료표에 없는 메뉴 추정 규칙의 정확도
npm run sync-data      # 루트 data/ → src/data/
npx tsx scripts/check-food-images.ts  # 모든 메뉴에 그림이 붙는지
```

환경 변수는 `.env.example` 참고. 모두 선택이다.

## 배포

Vercel 에 이 폴더(`web/`)를 프로젝트 루트로 올린다. `vercel.json` 이 함수 지역을 서울(`icn1`)로 정한다.
