'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { allergenIcon, allergenName } from '@/lib/allergens'
import { useMounted, useStoredState } from '@/lib/client/hooks'
import { useApp } from './app-provider'
import { AllergyPicker } from './allergy-picker'
import { AppMark } from './app-mark'
import { IconArrowRight } from './ui/icons'
import { Sheet } from './ui/sheet'
import { Fluent } from './ui/visual'

const FEATURES = [
  { icon: 'pot-of-food', title: '오늘 점심 탄소를 한눈에', desc: '메뉴마다 탄소가 얼마나 나오는지 색으로 보여 줘요' },
  { icon: 'wastebasket', title: '남기면 버려지는 탄소', desc: '남긴 양에 따라 버려지는 탄소를 바로 계산해요' },
  { icon: 'trophy', title: '먹은 양 기록과 순위', desc: '다 먹은 만큼 줄인 탄소가 쌓이고 순위에 올라가요' },
]

/** 처음 온 사람에게: 소개 → 알레르기 고르기 → 끝. 언제든 닫으면 건너뛴다 (설정에서 다시 고칠 수 있음) */
export function Onboarding() {
  const mounted = useMounted()
  const path = usePathname()
  const { allergies, setAllergies } = useApp()
  const [done, setDone] = useStoredState('hm-onboarded', false)
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<number[] | null>(null)

  if (!mounted || done || path.startsWith('/install')) return null
  const sel = picked ?? allergies
  const toggle = (n: number) => setPicked(sel.includes(n) ? sel.filter((x) => x !== n) : [...sel, n].sort((a, b) => a - b))
  const finish = () => setDone(true)

  const titles = ['효명 급식 탄소', '알레르기가 있나요?', '준비됐어요']
  const subtitles = [
    '효명고 점심 한 끼의 탄소를 보고, 덜 남기는 습관을 만들어요',
    '고른 성분이 든 메뉴를 빨갛게 알려 드려요. 이 기기에만 저장돼요',
    '설정에서 언제든 바꿀 수 있어요',
  ]

  return (
    <Sheet
      open
      onClose={finish}
      title={titles[step]}
      subtitle={
        <span className="flex flex-col gap-2">
          {subtitles[step]}
          <span className="flex gap-1.5" aria-label={`3단계 중 ${step + 1}단계`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-brand' : i < step ? 'w-1.5 bg-brand/60' : 'w-1.5 bg-line-strong'}`} />
            ))}
          </span>
        </span>
      }
      leading={step === 0 ? <AppMark size={56} /> : step === 1 ? <Fluent name="warning" size={52} /> : <Fluent name="party-popper" size={52} />}
    >
      {step === 0 && (
        <div className="flex flex-col gap-3 pt-1">
          {FEATURES.map((f, i) => (
            <div key={f.icon} className="rise flex items-center gap-4 rounded-[18px] bg-surface-2 p-4" style={{ animationDelay: `${i * 60}ms` }}>
              <Fluent name={f.icon} size={44} />
              <div>
                <p className="text-body font-semibold">{f.title}</p>
                <p className="text-cap text-ink-2">{f.desc}</p>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setStep(1)} className="press mt-2 flex min-h-13 items-center justify-center gap-2 rounded-btn bg-brand text-body font-semibold text-brand-ink">
            시작하기
            <IconArrowRight size={18} />
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4 pt-1">
          <AllergyPicker value={sel} onToggle={toggle} compact />
          <div className="sticky bottom-0 -mx-1 grid grid-cols-[auto_1fr] gap-2 bg-surface pt-2">
            <button
              type="button"
              onClick={() => {
                setAllergies([])
                setPicked([])
                setStep(2)
              }}
              className="press min-h-13 rounded-btn bg-surface-3 px-4 text-body font-semibold text-ink-2"
            >
              알레르기 없어요
            </button>
            <button
              type="button"
              onClick={() => {
                setAllergies(sel)
                setStep(2)
              }}
              className="press min-h-13 rounded-btn bg-brand text-body font-semibold text-brand-ink disabled:opacity-40"
              disabled={sel.length === 0}
              aria-disabled={sel.length === 0}
            >
              {sel.length ? `${sel.length}개 선택 완료` : '하나 이상 골라 주세요'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4 pt-1">
          <div className="rounded-[18px] bg-surface-2 p-4">
            <p className="text-cap font-semibold text-ink-3">내 알레르기</p>
            {sel.length ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {sel.map((n) => (
                  <li key={n} className="inline-flex items-center gap-1.5 rounded-full bg-alert-soft py-1 pr-3 pl-1.5 text-cap font-semibold text-alert">
                    <span className="grid size-6 place-items-center rounded-full bg-surface">
                      <Fluent name={allergenIcon(n)} size={18} />
                    </span>
                    {allergenName(n)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-body font-semibold">없음</p>
            )}
          </div>
          <div className="flex items-center gap-3 rounded-[18px] bg-brand-soft p-4">
            <Fluent name="memo" size={40} />
            <p className="text-cap text-ink-2">
              점심을 먹고 <b className="font-semibold text-ink">먹은 양 기록하기</b>를 누르면 줄인 탄소가 쌓여요.
            </p>
          </div>
          <button type="button" onClick={finish} className="press flex min-h-13 items-center justify-center gap-2 rounded-btn bg-ink text-body font-semibold text-bg">
            오늘 급식 보기
            <IconArrowRight size={18} />
          </button>
        </div>
      )}
    </Sheet>
  )
}
