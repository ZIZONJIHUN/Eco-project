/** 나이스 급식 알레르기 번호 1~19 */
export const ALLERGENS = [
  '난류',
  '우유',
  '메밀',
  '땅콩',
  '대두',
  '밀',
  '고등어',
  '게',
  '새우',
  '돼지고기',
  '복숭아',
  '토마토',
  '아황산류',
  '호두',
  '닭고기',
  '쇠고기',
  '오징어',
  '조개류',
  '잣',
] as const

export const allergenName = (n: number): string => ALLERGENS[n - 1] ?? `${n}번`

/** 알레르기 번호별 그림 (public/img/fluent) */
export const ALLERGEN_ICON = [
  'egg',
  'glass-of-milk',
  'sheaf-of-rice',
  'peanuts',
  'beans',
  'bread',
  'fish',
  'crab',
  'shrimp',
  'pig-face',
  'peach',
  'tomato',
  'test-tube',
  'chestnut',
  'chicken',
  'cow-face',
  'squid',
  'oyster',
  'evergreen-tree',
] as const
export const allergenIcon = (n: number): string => ALLERGEN_ICON[n - 1] ?? 'warning'

/** 메뉴의 알레르기 번호 중 내가 고른 것 */
export const myHits = (allergens: number[], mine: number[]): number[] => allergens.filter((n) => mine.includes(n))
