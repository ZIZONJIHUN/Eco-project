// 저장소 루트 data/ 의 재료표와 나이스 급식 원본을 앱이 바로 읽을 수 있는 JSON 으로 옮긴다.
// 사용: npm run sync-data   (루트 data/ 를 고친 뒤 한 번 돌리고, 바뀐 src/data/*.json 을 함께 커밋한다)
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT_DATA = join(WEB, '..', 'data')
const OUT = join(WEB, 'src', 'data')
mkdirSync(OUT, { recursive: true })

// 재료표: "메뉴이름<TAB>food=g,food=g" → { 메뉴이름: [[food, g], ...] } (0g 은 뺀다, estimate.py 와 같은 규칙)
const recipes = {}
for (const line of readFileSync(join(ROOT_DATA, 'recipes-claude.tsv'), 'utf8').split(/\r?\n/)) {
  if (!line.trim() || line.startsWith('#')) continue
  const [name, spec] = line.split('\t')
  recipes[name] = spec
    .split(',')
    .map((p) => p.split('='))
    .map(([k, v]) => [k, Number.parseInt(v, 10)])
    .filter(([, g]) => g > 0)
}
writeFileSync(join(OUT, 'recipes.json'), JSON.stringify(recipes) + '\n')

// 나이스 원본: 필요한 열만 남긴다 (날짜, 메뉴, 열량, 영양)
const rows = new Map()
for (const file of readdirSync(ROOT_DATA).filter((f) => /^neis-meals-\d{4}\.json$/.test(f)).sort()) {
  for (const r of JSON.parse(readFileSync(join(ROOT_DATA, file), 'utf8'))) {
    rows.set(r.MLSV_YMD, { ymd: r.MLSV_YMD, dish: r.DDISH_NM, cal: r.CAL_INFO, ntr: r.NTR_INFO })
  }
}
const snapshot = [...rows.values()].sort((a, b) => a.ymd.localeCompare(b.ymd))
writeFileSync(join(OUT, 'meals-snapshot.json'), JSON.stringify(snapshot) + '\n')

console.log(`재료표 ${Object.keys(recipes).length}개, 급식 ${snapshot.length}일 (${snapshot[0]?.ymd} ~ ${snapshot.at(-1)?.ymd})`)
