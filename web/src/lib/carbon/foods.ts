// 식품 코드별 배출계수(kgCO2e/kg)와 열량(kcal/100g). scripts/estimate.py 의 FOODS 와 같은 값이다.

export type FoodKey =
  | 'rice' | 'beef' | 'pork' | 'chicken' | 'duck' | 'shrimp' | 'fish' | 'egg' | 'tofu' | 'bean'
  | 'milk' | 'butter' | 'cheese' | 'wheat' | 'starch' | 'veg' | 'root' | 'fruit' | 'kimchi'
  | 'sugar' | 'sauce' | 'oil' | 'water'

/** 분석 화면에서 "탄소가 어디서 나오는지" 묶어 보여 줄 때 쓰는 큰 분류 */
export type FoodGroup = 'beef' | 'meat' | 'seafood' | 'rice' | 'dairy' | 'grain' | 'plant' | 'seasoning' | 'none'

export interface Food {
  label: string
  factor: number
  kcal100: number
  note: string
  group: FoodGroup
}

export const FOODS: Record<FoodKey, Food> = {
  rice: { label: '쌀·잡곡·떡', factor: 4.45, kcal100: 365, note: '쌀', group: 'rice' },
  beef: { label: '쇠고기', factor: 58.15, kcal100: 200, note: '쇠고기(국내산)', group: 'beef' },
  pork: { label: '돼지고기', factor: 13.36, kcal100: 260, note: '돼지고기(국내산)', group: 'meat' },
  chicken: { label: '닭고기', factor: 5.36, kcal100: 170, note: '닭·오리고기(국내산)', group: 'meat' },
  duck: { label: '오리고기', factor: 5.36, kcal100: 250, note: '닭·오리고기(국내산)', group: 'meat' },
  shrimp: { label: '새우', factor: 26.87, kcal100: 85, note: '새우', group: 'seafood' },
  fish: { label: '생선·수산물', factor: 13.63, kcal100: 110, note: '생선(양식) 대용', group: 'seafood' },
  egg: { label: '달걀', factor: 4.67, kcal100: 143, note: '달걀', group: 'dairy' },
  tofu: { label: '두부', factor: 3.16, kcal100: 85, note: '두부·콩', group: 'plant' },
  bean: { label: '콩·견과', factor: 3.16, kcal100: 450, note: '두부·콩 대용', group: 'plant' },
  milk: { label: '우유·요거트', factor: 3.15, kcal100: 65, note: '우유·유제품', group: 'dairy' },
  butter: { label: '버터·크림', factor: 3.15, kcal100: 717, note: '우유·유제품 대용', group: 'dairy' },
  cheese: { label: '치즈', factor: 23.88, kcal100: 300, note: '치즈', group: 'dairy' },
  wheat: { label: '밀가루·면·빵', factor: 1.57, kcal100: 350, note: '밀', group: 'grain' },
  starch: { label: '당면·전분·묵', factor: 1.57, kcal100: 350, note: '밀 대용', group: 'grain' },
  veg: { label: '채소·버섯·해조', factor: 0.53, kcal100: 28, note: '채소(일반)', group: 'plant' },
  root: { label: '감자·고구마·무', factor: 0.46, kcal100: 80, note: '뿌리채소·감자', group: 'plant' },
  fruit: { label: '과일', factor: 0.7, kcal100: 55, note: '과일(일반)', group: 'plant' },
  kimchi: { label: '김치·절임', factor: 0.53, kcal100: 30, note: '김치·절임채소', group: 'plant' },
  sugar: { label: '설탕', factor: 3.2, kcal100: 400, note: '설탕·음료', group: 'seasoning' },
  sauce: { label: '양념·소스', factor: 3.2, kcal100: 120, note: '설탕·음료 대용', group: 'seasoning' },
  oil: { label: '식용유', factor: 3.2, kcal100: 884, note: '설탕·음료 대용', group: 'seasoning' },
  water: { label: '물', factor: 0, kcal100: 0, note: '0 가정', group: 'none' },
}

export const GROUP_LABEL: Record<Exclude<FoodGroup, 'none'>, string> = {
  beef: '쇠고기',
  meat: '돼지·닭·오리',
  seafood: '생선·새우',
  rice: '쌀·떡',
  dairy: '유제품·달걀',
  grain: '밀가루·면',
  plant: '채소·콩·과일',
  seasoning: '양념·기름·설탕',
}

/** 두부로 바꿔 보는 가상 계산의 대상 (estimate.py 의 SWAP) */
export const SWAP_FOODS: readonly FoodKey[] = ['beef', 'pork', 'shrimp', 'fish']

export const isFoodKey = (k: string): k is FoodKey => k in FOODS
