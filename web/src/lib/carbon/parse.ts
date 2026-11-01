// 나이스 급식 문자열을 메뉴 이름·알레르기·영양으로 나눈다. scripts/build.py, estimate.py 와 같은 규칙.

/** "돈육김치찌개(5.9.10)" → 이름 "돈육김치찌개", 알레르기 [5, 9, 10] */
export function parseDishes(raw: string): [name: string, allergens: number[]][] {
  const out: [string, number[]][] = []
  for (const part of raw.split('<br/>')) {
    const m = part.match(/\(([\d.]+)\)\s*$/)
    const allergens = m
      ? m[1]
          .split('.')
          .filter(Boolean)
          .map(Number)
          .filter((n) => n >= 1 && n <= 19)
      : []
    const name = cleanName(part)
    if (name) out.push([name, allergens])
  }
  return out
}

export function cleanName(text: string): string {
  return text
    .replace(/\(\s*[\d.\s]+\)/g, '')
    .replaceAll('*', '')
    .replaceAll('#', '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "948.5 Kcal" → 948.5 */
export function parseKcal(raw: string | undefined): number | null {
  const m = raw?.match(/[\d.]+/)
  return m ? Number.parseFloat(m[0]) : null
}

/** "탄수화물(g) : 130.5<br/>단백질(g) : 40.1 ..." → 단백질 g */
export function parseProtein(raw: string | undefined): number | null {
  if (!raw) return null
  for (const part of raw.split('<br/>')) {
    const [key, value] = part.split(':')
    if (key?.trim().startsWith('단백질')) {
      const v = Number.parseFloat(value)
      return Number.isFinite(v) ? v : null
    }
  }
  return null
}
