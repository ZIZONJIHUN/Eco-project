'use client'

import { useState } from 'react'
import { formatMedium } from '@/lib/date'
import { KG_PER_CAR_KM, TONE_TEXT, formatKg, menuTone, type Tone } from '@/lib/grade'
import { BASELINE_WASTE, WASTE_LEVELS, dayResult, type DayLog, type WasteLevel } from '@/lib/meal-log'
import { useApp } from './app-provider'
import { IconCheck } from './ui/icons'
import { Sheet } from './ui/sheet'
import { useToast } from './ui/toast'
import { InfoTip } from './ui/tooltip'
import { Fluent, FoodImg, PlateIcon } from './ui/visual'

const LEVEL_TONE: Record<WasteLevel, Tone> = { 0: 1, 25: 2, 50: 3, 100: 5 }
const ON: Record<WasteLevel, string> = {
  0: 'bg-t1-bar text-white',
  25: 'bg-t2-bar text-[#1f2d06]',
  50: 'bg-t3-bar text-[#2b1a00]',
  100: 'bg-t5-bar text-white',
}

export function LogSheet() {
  const { logDay, closeLog, log } = useApp()
  return (
    <Sheet
      open={Boolean(logDay)}
      onClose={closeLog}
      title="먹은 양 기록하기"
      subtitle={logDay ? `${formatMedium(logDay)} 점심 · 메뉴마다 얼마나 먹었는지 눌러 주세요` : null}
      leading={<Fluent name="memo" size={52} className="shrink-0" />}
    >
      {logDay && <LogBody key={logDay} day={logDay} initial={log[logDay]} />}
    </Sheet>
  )
}

function LogBody({ day, initial }: { day: string; initial?: DayLog }) {
  const { byDay, data, saveLog, closeLog } = useApp()
  const { toast } = useToast()
  const meal = byDay.get(day)
  const [entry, setEntry] = useState<DayLog>(() => initial ?? Object.fromEntries((meal?.m ?? []).map(([n]) => [n, 0 as WasteLevel])))
  if (!meal) return <p className="text-body text-ink-2">이날 급식 정보가 없어요.</p>

  const r = dayResult(meal, data.menus, entry)
  const allClean = meal.m.every(([n]) => (entry[n] ?? 0) === 0)
  const setAll = (v: WasteLevel) => setEntry(Object.fromEntries(meal.m.map(([n]) => [n, v])))

  const save = () => {
    saveLog(day, entry)
    closeLog()
    toast({
      message: r.saved > 0 ? `기록했어요 · 탄소 ${formatKg(r.saved)}kg을 줄였어요` : '기록했어요 · 다음엔 조금 더 먹어 봐요',
      tone: 'success',
    })
  }

  return (
    <div className="flex flex-col gap-4 pt-1">
      <button
        type="button"
        onClick={() => setAll(0)}
        aria-pressed={allClean}
        className={`press flex min-h-14 items-center justify-center gap-2 rounded-btn text-body font-semibold transition-colors ${
          allClean ? 'bg-t1-bar text-white shadow-lift' : 'bg-t1-soft text-t1 hover:brightness-[0.98]'
        }`}
      >
        {allClean ? <IconCheck size={20} strokeWidth={2.6} /> : <Fluent name="sparkles" size={22} />}
        모두 다 먹었어요
      </button>

      <ul className="flex flex-col gap-2">
        {meal.m.map(([name]) => {
          const kg = data.menus[name]?.kg ?? 0
          const v = (entry[name] ?? 0) as WasteLevel
          return (
            <li key={name} className="rounded-[18px] bg-surface-2 p-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-surface shadow-card">
                  <FoodImg name={name} size={30} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold">{name}</span>
                  <span className={`tnum text-[12px] font-semibold ${TONE_TEXT[menuTone(kg)]}`}>{formatKg(kg)}kg</span>
                </span>
              </div>
              <div role="radiogroup" aria-label={`${name} 먹은 양`} className="mt-2.5 grid grid-cols-4 gap-1.5">
                {WASTE_LEVELS.map((l) => {
                  const on = l.value === v
                  return (
                    <button
                      key={l.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setEntry({ ...entry, [name]: l.value })}
                      className={`press flex min-h-11 items-center justify-center gap-1 rounded-[12px] text-[13px] font-semibold transition-colors duration-150 ${
                        on ? ON[l.value] : `bg-surface ${TONE_TEXT[LEVEL_TONE[l.value]]} shadow-card hover:bg-surface-3`
                      }`}
                    >
                      <PlateIcon fraction={l.value / 100} size={16} />
                      <span className={on ? '' : 'text-ink-2'}>{l.short}</span>
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="sticky bottom-0 -mx-1 rounded-card bg-surface p-4 shadow-lift">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="flex items-center gap-1 text-[12px] font-semibold text-ink-3">
              줄인 탄소
              <InfoTip label="줄인 탄소 설명">한 끼의 {Math.round(BASELINE_WASTE * 100)}%를 남기는 학생(가정)과 비교해, 덜 남긴 만큼의 탄소예요.</InfoTip>
            </span>
            <b className={`tnum text-h2 font-bold ${r.saved >= 0 ? 'text-t1' : 'text-t5'}`}>
              {r.saved >= 0 ? '+' : ''}
              {formatKg(r.saved)}
              <small className="ml-0.5 text-cap text-ink-3">kg</small>
            </b>
          </div>
          <div>
            <span className="text-[12px] font-semibold text-ink-3">버린 탄소</span>
            <b className={`tnum block text-h2 font-bold ${r.wasted === 0 ? 'text-t1' : TONE_TEXT[menuTone(r.wasted)]}`}>
              {formatKg(r.wasted)}
              <small className="ml-0.5 text-cap text-ink-3">kg</small>
            </b>
          </div>
        </div>
        {r.saved > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-2">
            <Fluent name="automobile" size={18} />
            승용차 <b className="tnum font-bold text-ink">{(r.saved / KG_PER_CAR_KM).toFixed(1)}km</b>만큼 줄였어요
          </p>
        )}
        <button type="button" onClick={save} className="press mt-3 flex min-h-12 w-full items-center justify-center rounded-btn bg-ink text-body font-semibold text-bg">
          {initial ? '기록 고치기' : '기록 저장'}
        </button>
        {initial && (
          <button
            type="button"
            onClick={() => {
              const before = initial
              saveLog(day, null)
              closeLog()
              toast({ message: '이날 기록을 지웠어요', action: { label: '되돌리기', onClick: () => saveLog(day, before) } })
            }}
            className="press mt-1 min-h-10 w-full rounded-btn text-cap font-semibold text-ink-3 hover:text-alert"
          >
            이날 기록 지우기
          </button>
        )}
      </div>
    </div>
  )
}
