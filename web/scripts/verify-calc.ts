// 앱의 탄소 계산이 기존 Python 결과(data/results-2026.json)와 같은지 날마다 대조한다.
// 사용: npm run verify-calc
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import snapshot from '../src/data/meals-snapshot.json'
import { buildDataset, type RawRow } from '../src/lib/build-dataset'

const results = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'data', 'results-2026.json'), 'utf8')) as {
  days: { date: string; total_kgCO2e: number; estimated_kcal: number; menus: { name: string; kgCO2e: number; alternative: { kgCO2e: number } | null }[] }[]
}

const ds = buildDataset(snapshot as RawRow[], {
  generatedAt: new Date().toISOString(),
  generatedDay: '2026-11-01',
  live: { status: 'skipped', from: '', to: '', failedChunks: 0 },
  snapshotUntil: '2026-11-30',
})
const byDay = new Map(ds.days.map((d) => [d.d, d]))

let dayDiffs = 0
let menuDiffs = 0
let maxDiff = 0
for (const want of results.days) {
  const got = byDay.get(want.date)
  if (!got) {
    console.log('빠진 날', want.date)
    dayDiffs++
    continue
  }
  const diff = Math.abs(got.kg - want.total_kgCO2e)
  maxDiff = Math.max(maxDiff, diff)
  if (diff > 0.005) {
    dayDiffs++
    console.log(`${want.date}: 기존 ${want.total_kgCO2e.toFixed(3)} / 앱 ${got.kg.toFixed(3)}`)
  }
  if (Math.abs(got.kcalE - want.estimated_kcal) > 0.2) console.log(`${want.date} 열량: 기존 ${want.estimated_kcal} / 앱 ${got.kcalE}`)
  for (const m of want.menus) {
    const info = ds.menus[m.name]
    if (!info || info.src !== 'table' || Math.abs(info.kg - m.kgCO2e) > 0.001) {
      menuDiffs++
      console.log(`  메뉴 다름: ${m.name}`, info?.src, info?.kg, m.kgCO2e)
    }
    if (Boolean(info?.alt) !== Boolean(m.alternative) || (info?.alt && Math.abs(info.alt.kg - m.alternative!.kgCO2e) > 0.001)) {
      menuDiffs++
      console.log(`  대체 계산 다름: ${m.name}`)
    }
  }
}
console.log(`대조한 날 ${results.days.length}일 · 다른 날 ${dayDiffs} · 다른 메뉴 ${menuDiffs} · 최대 차이 ${maxDiff.toFixed(4)}kg`)
console.log(`하루 등급 기준: ${ds.dayBands.low}kg 미만 낮음 · ${ds.dayBands.high}kg 이상 높음`)
const counts = { low: 0, mid: 0, high: 0 }
for (const d of ds.days) counts[d.kg < ds.dayBands.low ? 'low' : d.kg >= ds.dayBands.high ? 'high' : 'mid']++
console.log('등급별 날 수', counts)
if (dayDiffs || menuDiffs) process.exit(1)
