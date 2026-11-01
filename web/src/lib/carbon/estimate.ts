// 메뉴 이름 → 1인분 재료 → 탄소·열량.
// 재료표에 있으면 그대로 쓰고, 없으면 AI 없이 규칙으로 추정한다.
//   1) 이름이 비슷한 메뉴의 재료를 빌린다 (글자 2개씩 겹치는 정도 + 끝말이 같은지)
//   2) 그것도 없으면 메뉴 종류(국, 볶음, 튀김 ...)의 대표 재료를 쓴다
//   3) 이름에 고기·해산물 단서가 있으면 그 종류로 바꾼다 (예: 참치김치찌개 → 생선)
import { FOODS, SWAP_FOODS, isFoodKey, type FoodKey } from './foods'
import type { EstimateSource, Ingredient, MenuInfo } from '../types'

export type Recipe = [FoodKey, number][]
export type RecipeTable = Record<string, [string, number][]>

const MEATS: readonly FoodKey[] = ['beef', 'pork', 'chicken', 'duck', 'shrimp', 'fish']

// 순서가 우선순위다. 더 구체적인 단서를 먼저 둔다.
const PROTEIN_HINTS: [FoodKey, RegExp][] = [
  ['shrimp', /새우|쉬림프/],
  ['fish', /생선|고등어|삼치|갈치|연어|가자미|동태|명태|코다리|대구|조기|꽁치|참치|오징어|낙지|주꾸미|쭈꾸미|문어|조개|바지락|홍합|게살|꽃게|어묵|멸치|황태|북어|임연수|장어|전복|굴(?!소스)|해물|씨푸드|피쉬|피시/],
  ['duck', /오리(?!엔탈)/],
  ['chicken', /닭|치킨|계육|윙|텐더|너겟|순살|찜닭|다리살|가슴살|통다리/],
  ['pork', /돼지|돈육|돈까스|돈가스|제육|삼겹|오삼|목살|보쌈|족발|탕수육|햄(?!버거)|베이컨|소시지|소세지|순대|동그랑땡|등갈비|폭찹|수육|돈사태|앞다리|두루치기|고추장불고기/],
  // 쇠고기는 마지막: "돼지불고기", "치킨버거" 처럼 다른 단서가 있으면 그쪽이 먼저 잡힌다
  ['beef', /한우|소고기|쇠고기|우육|차돌|양지|사골|우삼겹|육개장|소불고기|소갈비|우둔|홍두깨|갈비탕|육회|불고기|버거|패티|미트/],
]

const TYPE_RULES: [string, RegExp][] = [
  ['덮밥', /(볶음밥|덮밥|비빔밥|카레라이스|라이스|오므라이스|주먹밥|김밥|리조또|필라프|컵밥|국밥)$/],
  ['밥', /밥$/],
  ['죽', /죽$/],
  ['면', /(국수|우동|라면|짬뽕|짜장면|짜장|파스타|스파게티|냉면|쫄면|소바|면)$/],
  ['찌개', /(찌개|전골)$/],
  ['국', /(국|탕|스프|수프)$/],
  ['김치', /(김치|깍두기|석박지|섞박지|겉절이)$/],
  ['튀김', /(튀김|까스|가스|커틀릿|강정|탕수육|너겟|텐더|치킨|프라이)$/],
  ['구이', /(구이|스테이크|떡갈비|함박|바베큐|bbq)$/],
  ['볶음', /볶음$/],
  ['조림', /조림$/],
  ['찜', /찜$/],
  ['전', /(전|부침|부침개|동그랑땡|산적)$/],
  ['무침', /(무침|나물|생채|샐러드|숙채|쌈)$/],
  ['떡', /(떡볶이|떡|떡꼬치)$/],
  ['빵', /(빵|케이크|쿠키|머핀|와플|토스트|도넛|브레드|타르트|츄러스|핫도그|피자|버거|샌드위치|만두)$/],
  ['음료', /(우유|요구르트|요거트|주스|쥬스|에이드|라떼|스무디|음료|식혜|차)$/],
  ['과일', /(사과|배|귤|오렌지|포도|딸기|수박|참외|바나나|키위|파인애플|멜론|복숭아|자두|망고|토마토|과일|한라봉|천혜향)$/],
  ['후식', /(아이스크림|푸딩|젤리|빙수|화채|약과)$/],
]

/** 이름이 이만큼 비슷해야 그 메뉴의 재료를 빌린다. scripts/evaluate-estimator.ts 결과로 정했다 */
export const SIMILAR_THRESHOLD = 0.55

const GENERIC: Recipe = [
  ['veg', 60],
  ['sauce', 5],
  ['oil', 3],
]

/** 비교용으로 이름을 다듬는다: 괄호 속 설명, 기호, 띄어쓰기를 뺀다 */
export function normalizeName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, '')
    .split('/')[0]
    .replace(/[^0-9A-Za-z가-힣]/g, '')
    .toLowerCase()
}

function bigrams(s: string): Map<string, number> {
  const out = new Map<string, number>()
  if (s.length === 1) out.set(s, 1)
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2)
    out.set(g, (out.get(g) ?? 0) + 1)
  }
  return out
}

function dice(a: Map<string, number>, b: Map<string, number>, sa: number, sb: number): number {
  if (!sa || !sb) return 0
  let common = 0
  for (const [g, n] of a) common += Math.min(n, b.get(g) ?? 0)
  return (2 * common) / (sa + sb)
}

function commonSuffix(a: string, b: string): number {
  let n = 0
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++
  return n
}

export function detectProtein(name: string): FoodKey | null {
  const n = normalizeName(name)
  for (const [key, re] of PROTEIN_HINTS) if (re.test(n)) return key
  return null
}

function mainMeat(recipe: Recipe): FoodKey | null {
  let best: FoodKey | null = null
  let grams = 0
  for (const [k, g] of recipe) {
    if (MEATS.includes(k) && g > grams) {
      best = k
      grams = g
    }
  }
  return best
}

/** 이름의 고기 단서와 빌려 온 재료의 고기가 다르면 같은 양으로 바꾼다 */
function adjustProtein(recipe: Recipe, name: string, addIfMissing: number): Recipe {
  const want = detectProtein(name)
  if (!want || !MEATS.includes(want)) return recipe
  const have = mainMeat(recipe)
  if (have === want) return recipe
  if (have) {
    const merged = new Map<FoodKey, number>()
    for (const [k, g] of recipe) {
      const key = k === have ? want : k
      merged.set(key, (merged.get(key) ?? 0) + g)
    }
    return [...merged.entries()]
  }
  return addIfMissing > 0 ? [...recipe, [want, addIfMissing]] : recipe
}

export function toRecipe(raw: [string, number][]): Recipe {
  return raw.filter(([k, g]) => isFoodKey(k) && g > 0) as Recipe
}

export interface Estimate {
  recipe: Recipe
  src: EstimateSource
  base?: string
}

export interface Estimator {
  estimate(name: string, opts?: { exclude?: string }): Estimate
}

export function createEstimator(table: RecipeTable, { threshold = SIMILAR_THRESHOLD } = {}): Estimator {
  const entries = Object.entries(table).map(([name, raw]) => {
    const n = normalizeName(name)
    const grams = bigrams(n)
    let size = 0
    for (const v of grams.values()) size += v
    return { name, n, grams, size, recipe: toRecipe(raw) }
  })
  const byNorm = new Map<string, (typeof entries)[number]>()
  for (const e of entries) if (!byNorm.has(e.n)) byNorm.set(e.n, e)

  // 메뉴 종류마다 탄소가 가운데쯤인 메뉴를 대표로 고른다
  const typeIndex = TYPE_RULES.map(([label, re]) => {
    const members = entries.filter((e) => re.test(e.n)).map((e) => ({ e, kg: recipeKg(e.recipe) }))
    members.sort((a, b) => a.kg - b.kg)
    return { label, re, members }
  })

  function pickType(n: string, exclude?: string) {
    for (const t of typeIndex) {
      if (!t.re.test(n)) continue
      const pool = t.members.filter((m) => m.e.name !== exclude)
      if (pool.length) return pool[Math.floor(pool.length / 2)].e
    }
    return null
  }

  const SRC_RANK: EstimateSource[] = ['table', 'similar', 'type', 'generic']

  function estimate(name: string, opts: { exclude?: string } = {}): Estimate {
      const { exclude } = opts
      if (exclude !== name && table[name]) return { recipe: toRecipe(table[name]), src: 'table' }

      // "언양식불고기&파채무침" 처럼 두 요리를 묶은 이름은 나눠서 더한다
      const parts = name.replace(/\([^)]*\)/g, '').split(/[&+]/).map((p) => p.trim()).filter((p) => normalizeName(p))
      if (parts.length > 1) {
        const merged = new Map<FoodKey, number>()
        let src: EstimateSource = 'table'
        const bases: string[] = []
        for (const part of parts) {
          const e = estimate(part, opts)
          for (const [k, g] of e.recipe) merged.set(k, (merged.get(k) ?? 0) + g)
          if (SRC_RANK.indexOf(e.src) > SRC_RANK.indexOf(src)) src = e.src
          bases.push(e.base ?? part)
        }
        return { recipe: [...merged.entries()], src: src === 'table' ? 'similar' : src, base: bases.join(' + ') }
      }

      const n = normalizeName(name)
      const same = byNorm.get(n)
      if (same && same.name !== exclude) return { recipe: same.recipe, src: 'similar', base: same.name }

      const grams = bigrams(n)
      let size = 0
      for (const v of grams.values()) size += v
      let best: (typeof entries)[number] | null = null
      let bestScore = 0
      for (const e of entries) {
        if (e.name === exclude) continue
        const score = 0.65 * dice(grams, e.grams, size, e.size) + 0.35 * (Math.min(commonSuffix(n, e.n), 3) / 3)
        if (score > bestScore) {
          bestScore = score
          best = e
        }
      }
      if (best && bestScore >= threshold) {
        return { recipe: adjustProtein(best.recipe, name, 40), src: 'similar', base: best.name }
      }
      const type = pickType(n, exclude)
      if (type) return { recipe: adjustProtein(type.recipe, name, 50), src: 'type', base: type.name }
      return { recipe: adjustProtein(GENERIC, name, 40), src: 'generic' }
  }

  return { estimate }
}

export function recipeKg(recipe: Recipe): number {
  let kg = 0
  for (const [k, g] of recipe) kg += (g / 1000) * FOODS[k].factor
  return kg
}

const r3 = (x: number) => Math.round(x * 1000) / 1000
const r1 = (x: number) => Math.round(x * 10) / 10

/** 재료 → 화면에 넘길 메뉴 정보 */
export function describe(est: Estimate): MenuInfo {
  let kg = 0
  let kcal = 0
  const ing: Ingredient[] = []
  const groups: Record<string, number> = {}
  for (const [k, g] of est.recipe) {
    const f = FOODS[k]
    const c = (g / 1000) * f.factor
    kg += c
    kcal += (g / 100) * f.kcal100
    if (k !== 'water') ing.push([f.label, g, r3(c)])
    if (f.group !== 'none') groups[f.group] = (groups[f.group] ?? 0) + c
  }
  let alt: MenuInfo['alt'] = null
  const swapped = est.recipe.filter(([k]) => SWAP_FOODS.includes(k)).map(([k]) => k)
  if (kg >= 1 && swapped.length) {
    const altRecipe: Recipe = est.recipe.map(([k, g]) => [SWAP_FOODS.includes(k) ? 'tofu' : k, g])
    alt = { kg: r3(recipeKg(altRecipe)), foods: [...new Set(swapped.map((k) => FOODS[k].label))] }
  }
  for (const key of Object.keys(groups)) groups[key] = r3(groups[key])
  return { kg: r3(kg), kcal: r1(kcal), ing, groups, alt, src: est.src, ...(est.base ? { base: est.base } : {}) }
}
