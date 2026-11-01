'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ALLERGENS } from '@/lib/allergens'
import { formatMedium } from '@/lib/date'
import { useMounted, useOnline } from '@/lib/client/hooks'
import { useApp, type ThemePref } from '../app-provider'
import { InstallPanel } from '../install/install-panel'
import { IconCheck, IconDevice, IconMoon, IconRefresh, IconSun } from '../ui/icons'
import { Segmented } from '../ui/segmented'
import { useToast } from '../ui/toast'

function Section({ id, title, desc, children, action }: { id: string; title: string; desc?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 rounded-card bg-surface p-5 shadow-[0_0_0_1px_var(--line)] md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-title`} className="text-title font-bold tight">
            {title}
          </h2>
          {desc && <p className="mt-1 text-cap text-ink-2">{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function timeAgo(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.round(h / 24)}일 전`
}

export function SettingsScreen() {
  const { allergies, setAllergies, theme, setTheme, data, refresh, refreshing } = useApp()
  const { toast } = useToast()
  const mounted = useMounted()
  const online = useOnline()

  const toggle = (n: number) => {
    const before = allergies
    const next = allergies.includes(n) ? allergies.filter((x) => x !== n) : [...allergies, n].sort((a, b) => a - b)
    setAllergies(next)
    toast({
      message: next.length > before.length ? `${ALLERGENS[n - 1]}을(를) 추가했어요` : `${ALLERGENS[n - 1]}을(를) 뺐어요`,
      tone: 'success',
      action: { label: '되돌리기', onClick: () => setAllergies(before) },
    })
  }

  const onRefresh = async () => {
    const r = await refresh()
    toast(
      r === 'updated'
        ? { message: '새 식단을 받았어요', tone: 'success' }
        : r === 'same'
          ? { message: '이미 최신이에요' }
          : { message: '나이스에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.', tone: 'error' },
    )
  }

  const liveText = {
    ok: '나이스에서 최신 식단을 받았어요',
    partial: '나이스에서 일부만 받았어요. 나머지는 저장된 식단이에요',
    failed: '나이스에 연결하지 못해 저장된 식단을 보여 줘요',
    skipped: '저장된 식단을 보여 줘요',
  }[data.live.status]

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-h1 font-bold tight">설정</h1>
        <p className="mt-1 text-cap text-ink-2">설정은 이 기기에만 저장돼요. 로그인은 필요 없어요.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-5">
          <Section
            id="allergy"
            title="내 알레르기"
            desc="고른 성분이 든 메뉴에 표시하고, 오늘 화면에서 알려 드려요. 누르면 바로 저장돼요."
            action={
              allergies.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const before = allergies
                    setAllergies([])
                    toast({ message: '알레르기를 모두 지웠어요', action: { label: '되돌리기', onClick: () => setAllergies(before) } })
                  }}
                  className="press min-h-10 shrink-0 rounded-btn px-3 text-cap font-semibold text-ink-2 hover:bg-surface-2"
                >
                  모두 지우기
                </button>
              ) : null
            }
          >
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {ALLERGENS.map((a, i) => {
                const n = i + 1
                const on = mounted && allergies.includes(n)
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(n)}
                    className={`press flex min-h-12 items-center justify-center gap-1 rounded-btn px-2 text-cap font-semibold transition-colors ${
                      on ? 'bg-alert text-white dark:text-[#1a0f0e]' : 'bg-surface-2 text-ink-2 shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink'
                    }`}
                  >
                    {on && <IconCheck size={15} strokeWidth={2.6} />}
                    {a}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-[12px] text-ink-3">나이스 급식의 알레르기 번호(1~19)를 기준으로 해요. 정확한 내용은 학교 공지를 확인해 주세요.</p>
          </Section>

          <Section id="theme" title="화면">
            <Segmented<ThemePref>
              label="화면 테마"
              value={mounted ? theme : 'system'}
              onChange={setTheme}
              options={[
                { value: 'system', label: '기기 설정', icon: <IconDevice size={16} /> },
                { value: 'light', label: '밝게', icon: <IconSun size={16} /> },
                { value: 'dark', label: '어둡게', icon: <IconMoon size={16} /> },
              ]}
            />
          </Section>
        </div>

        <div className="flex flex-col gap-5">
          <Section id="install" title="앱 설치" desc="홈 화면에 추가하면 앱처럼 열리고, 인터넷이 없어도 마지막 식단이 보여요.">
            <InstallPanel showQr="always" />
            <Link href="/install" className="press mt-4 inline-flex min-h-10 items-center text-cap font-semibold text-brand underline-offset-2 hover:underline">
              발표용 큰 QR 화면 열기
            </Link>
          </Section>

          <Section
            id="data"
            title="데이터"
            action={
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing || !online}
                aria-busy={refreshing}
                className="press flex min-h-10 w-[112px] shrink-0 items-center justify-center gap-1.5 rounded-btn bg-surface-2 text-cap font-semibold shadow-[inset_0_0_0_1px_var(--line)] disabled:opacity-50"
              >
                <IconRefresh size={16} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? '받는 중' : online ? '새로 받기' : '오프라인'}
              </button>
            }
          >
            <dl className="flex flex-col gap-3 text-cap">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">상태</dt>
                <dd className="text-right font-semibold">{liveText}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">마지막 갱신</dt>
                <dd className="text-right font-semibold" suppressHydrationWarning>
                  {mounted ? timeAgo(data.generatedAt) : formatMedium(data.generatedDay)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">식단 기간</dt>
                <dd className="tnum text-right font-semibold">
                  {data.days[0] ? `${formatMedium(data.days[0].d)} ~ ${formatMedium(data.days.at(-1)!.d)}` : '-'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">급식일 · 메뉴</dt>
                <dd className="tnum text-right font-semibold">
                  {data.days.length}일 · {Object.keys(data.menus).length}가지
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-[12px] text-ink-3">식단은 6시간마다 나이스에서 새로 받아요. 나이스에 올라오지 않은 달은 비어 있어요.</p>
          </Section>

          <Section id="about" title="정보">
            <p className="text-cap text-ink-2">
              효명고 1학년 환경 + 진로 탐구 프로젝트로 만들었어요. 급식 정보는 나이스 교육정보 개방 포털에서 받아요.
            </p>
            <Link href="/insights#method" className="press mt-3 inline-flex min-h-10 items-center text-cap font-semibold text-brand underline-offset-2 hover:underline">
              탄소를 어떻게 계산하는지 보기
            </Link>
          </Section>
        </div>
      </div>
    </div>
  )
}
