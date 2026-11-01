'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ALLERGENS } from '@/lib/allergens'
import { formatMedium } from '@/lib/date'
import { useMounted, useOnline } from '@/lib/client/hooks'
import { useApp, type ThemePref } from '../app-provider'
import { AllergyPicker } from '../allergy-picker'
import { InstallPanel } from '../install/install-panel'
import { IconDevice, IconMoon, IconRefresh, IconSun } from '../ui/icons'
import { Tooltip } from '../ui/tooltip'
import { Fluent } from '../ui/visual'
import { Segmented } from '../ui/segmented'
import { useToast } from '../ui/toast'

function Section({ id, title, desc, children, action, icon }: { id: string; title: string; desc?: ReactNode; children: ReactNode; action?: ReactNode; icon?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mb-5 scroll-mt-6 break-inside-avoid rounded-card bg-surface p-5 shadow-card md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && <Fluent name={icon} size={36} className="mt-0.5" />}
          <div>
          <h2 id={`${id}-title`} className="text-title font-bold tight">
            {title}
          </h2>
          {desc && <p className="mt-1 text-cap text-ink-2">{desc}</p>}
          </div>
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

      {/* 화면이 넓어질수록 단이 늘어나고, 카드 높이가 달라도 빈칸이 생기지 않는다 */}
      <div className="columns-1 gap-5 lg:columns-2 3xl:columns-3">
        <div className="contents">
          <Section
            id="allergy"
            icon="warning"
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
            <AllergyPicker value={mounted ? allergies : []} onToggle={toggle} />
            <p className="mt-3 text-[12px] text-ink-3">나이스 급식의 알레르기 번호(1~19)를 기준으로 해요. 정확한 내용은 학교 공지를 확인해 주세요.</p>
          </Section>

          <Section id="theme" icon="desktop-computer" title="화면" desc="글자와 바탕의 밝기를 골라요">
            <Segmented<ThemePref>
              label="화면 테마"
              value={mounted ? theme : 'system'}
              onChange={setTheme}
              options={[
                { value: 'system', label: '기기 설정', icon: <IconDevice size={16} />, activeBg: 'bg-[#e4ebff] dark:bg-[#26304d]', activeText: 'text-[#3451b2] dark:text-[#a9bcff]' },
                { value: 'light', label: '밝게', icon: <IconSun size={16} />, activeBg: 'bg-[#fff1cc] dark:bg-[#4a3a12]', activeText: 'text-[#9a5f00] dark:text-[#ffd76a]' },
                { value: 'dark', label: '어둡게', icon: <IconMoon size={16} />, activeBg: 'bg-[#2a2f45] dark:bg-[#33395a]', activeText: 'text-[#d6dcff] dark:text-[#d6dcff]' },
              ]}
            />
          </Section>
        </div>

        <div className="contents">
          <Section id="install" icon="mobile-phone" title="앱 설치" desc="홈 화면에 추가하면 앱처럼 열리고, 인터넷이 없어도 마지막 식단이 보여요.">
            <InstallPanel showQr="always" />
            <Link href="/install" className="press mt-4 inline-flex min-h-10 items-center text-cap font-semibold text-brand underline-offset-2 hover:underline">
              발표용 큰 QR 화면 열기
            </Link>
          </Section>

          <Section
            id="data"
            icon="bar-chart"
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

          <Section id="about" icon="school" title="정보">
            <p className="text-cap text-ink-2">
              <b className="font-semibold text-ink">효명고 1학년 임지훈</b>이 환경 + 진로 탐구 프로젝트로 만들었어요. 급식 정보는 나이스 교육정보 개방 포털에서 받아요.
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
