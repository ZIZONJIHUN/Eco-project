'use client'

import { ALLERGENS, allergenIcon } from '@/lib/allergens'
import { IconCheck } from './ui/icons'
import { Fluent } from './ui/visual'

/** 알레르기 19가지를 그림과 함께 고르는 칸. 고르면 빨간 바탕과 체크로 바뀐다 */
export function AllergyPicker({ value, onToggle, compact = false }: { value: number[]; onToggle: (n: number) => void; compact?: boolean }) {
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5'}`}>
      {ALLERGENS.map((a, i) => {
        const n = i + 1
        const on = value.includes(n)
        return (
          <button
            key={a}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(n)}
            className={`press relative flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-[16px] px-1.5 py-2 text-cap font-semibold transition-[background-color,box-shadow,color] duration-150 ${
              on ? 'bg-alert-soft text-alert shadow-[inset_0_0_0_2px_var(--alert)]' : 'bg-surface-2 text-ink-2 shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-3 hover:text-ink'
            }`}
          >
            <Fluent name={allergenIcon(n)} size={30} className={`transition-transform duration-200 ${on ? 'scale-110' : ''}`} />
            {a}
            {on && (
              <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-alert text-white dark:text-[#1a0f0e]">
                <IconCheck size={12} strokeWidth={3} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
