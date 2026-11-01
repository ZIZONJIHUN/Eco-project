// 서버가 만들어 클라이언트에 넘기는 데이터 모양

/** 재료 한 줄: [표시 이름, 1인분 g, kgCO2e] */
export type Ingredient = [label: string, grams: number, kg: number]

/**
 * 재료를 어떻게 알았는지
 * - table: 미리 만들어 둔 재료표에 있는 메뉴
 * - similar: 이름이 비슷한 메뉴의 재료를 빌려 씀 (고기 종류는 이름에 맞춰 바꿈)
 * - type: 메뉴 종류(국, 볶음, 튀김 등)의 대표 재료를 씀
 * - generic: 아무 단서가 없어 반찬 기본값을 씀
 */
export type EstimateSource = 'table' | 'similar' | 'type' | 'generic'

export interface MenuInfo {
  kg: number
  kcal: number
  ing: Ingredient[]
  /** 탄소를 그룹별로 나눈 값 (분석 화면용) */
  groups: Partial<Record<string, number>>
  /** 고기·해산물을 두부로 바꾸는 가상 계산 (1kg 이상 메뉴만) */
  alt: { kg: number; foods: string[] } | null
  src: EstimateSource
  /** similar/type 일 때 빌려 온 메뉴 이름 */
  base?: string
}

export interface Day {
  /** YYYY-MM-DD */
  d: string
  /** [메뉴 이름, 알레르기 번호들] */
  m: [name: string, allergens: number[]][]
  kg: number
  /** 나이스 공식 열량 */
  kcal: number | null
  /** 재료표로 다시 계산한 열량 */
  kcalE: number
  prot: number | null
}

export type LiveStatus = 'ok' | 'partial' | 'failed' | 'skipped'

export interface Dataset {
  /** 이 데이터를 만든 시각 (ISO) */
  generatedAt: string
  /** 만든 시각의 한국 날짜 (YYYY-MM-DD) */
  generatedDay: string
  live: { status: LiveStatus; from: string; to: string; failedChunks: number }
  snapshotUntil: string
  /** 하루 등급 기준: 이 값 미만은 낮음, high 이상은 높음 */
  dayBands: { low: number; high: number }
  days: Day[]
  menus: Record<string, MenuInfo>
}
