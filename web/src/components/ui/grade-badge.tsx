import { GRADE_LABEL, GRADE_SOFT, GRADE_TEXT, type Grade } from '@/lib/grade'
import { IconArrowDown, IconArrowUp, IconMinus } from './icons'

const ICON = { low: IconArrowDown, mid: IconMinus, high: IconArrowUp }

/** 등급은 색만으로 나타내지 않는다: 화살표 모양 + 글자를 함께 쓴다 */
export function GradeBadge({ grade, size = 'md', label }: { grade: Grade; size?: 'sm' | 'md'; label?: string }) {
  const Icon = ICON[grade]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ${GRADE_SOFT[grade]} ${GRADE_TEXT[grade]} ${
        size === 'sm' ? 'px-2 py-0.5 text-[12px]' : 'px-2.5 py-1 text-cap'
      }`}
    >
      <Icon size={size === 'sm' ? 12 : 14} strokeWidth={2.4} />
      {label ?? `탄소 ${GRADE_LABEL[grade]}`}
    </span>
  )
}

export function GradeDot({ grade }: { grade: Grade }) {
  const Icon = ICON[grade]
  return (
    <span className={`grid size-5 shrink-0 place-items-center rounded-full ${GRADE_SOFT[grade]} ${GRADE_TEXT[grade]}`} aria-hidden="true">
      <Icon size={12} strokeWidth={2.6} />
    </span>
  )
}
