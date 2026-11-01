'use client'

import { useState, type ReactNode } from 'react'
import { copyText } from '@/lib/client/share'
import { useMounted } from '@/lib/client/hooks'
import { openExternalUrl, useInstall, type InstallEnv } from '@/lib/client/install'
import { IconCheck, IconCopy, IconDownload, IconExternal, IconMore, IconPlusSquare, IconShare } from '../ui/icons'
import { useToast } from '../ui/toast'
import { QrCode } from './qr-code'

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-body">
          <span className="tnum grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-cap font-bold text-brand">{i + 1}</span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  )
}

const Key = ({ children }: { children: ReactNode }) => (
  <span className="mx-0.5 inline-flex items-center gap-1 rounded-[8px] bg-surface-3 px-1.5 py-0.5 align-[-2px] text-cap font-semibold">{children}</span>
)

function Guide({ env, canPrompt, onPrompt }: { env: InstallEnv; canPrompt: boolean; onPrompt: () => void }) {
  if (env.inApp) {
    const external = openExternalUrl(env, window.location.href)
    const app = { kakao: '카카오톡', naver: '네이버 앱', instagram: '인스타그램', facebook: '페이스북', line: '라인', other: '앱' }[env.inApp]
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-2">{app} 안에서 열린 화면에서는 설치할 수 없어요. 기본 브라우저로 열어 주세요.</p>
        {external && (
          <a href={external} className="press flex min-h-12 items-center justify-center gap-2 rounded-btn bg-ink px-5 text-body font-semibold text-bg">
            <IconExternal size={18} />
            {env.platform === 'ios' ? 'Safari로 열기' : '기본 브라우저로 열기'}
          </a>
        )}
        <Steps
          items={[
            <>
              화면 오른쪽 위나 아래의 <Key><IconMore size={14} /></Key> 메뉴를 눌러요
            </>,
            env.platform === 'ios' ? <>&quot;Safari로 열기&quot;를 골라요</> : <>&quot;다른 브라우저로 열기&quot;를 골라요</>,
          ]}
        />
      </div>
    )
  }
  if (canPrompt) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-body text-ink-2">버튼 한 번이면 홈 화면과 앱 목록에 생겨요. 인터넷이 끊겨도 마지막으로 본 식단은 열려요.</p>
        <button type="button" onClick={onPrompt} className="press flex min-h-12 items-center justify-center gap-2 rounded-btn bg-brand px-5 text-body font-semibold text-brand-ink">
          <IconDownload size={19} />앱 설치하기
        </button>
      </div>
    )
  }
  if (env.platform === 'ios') {
    if (env.iosBrowser === 'other') {
      return <p className="text-body text-ink-2">아이폰에서는 Safari나 Chrome에서 설치할 수 있어요. 아래 주소를 복사해 Safari에서 열어 주세요.</p>
    }
    return (
      <Steps
        items={[
          env.iosBrowser === 'chrome' ? (
            <>
              주소창 오른쪽의 <Key><IconShare size={14} />공유</Key> 버튼을 눌러요
            </>
          ) : (
            <>
              화면 아래 가운데의 <Key><IconShare size={14} />공유</Key> 버튼을 눌러요
            </>
          ),
          <>
            목록을 내려 <Key><IconPlusSquare size={14} />홈 화면에 추가</Key>를 눌러요
          </>,
          <>오른쪽 위 &quot;추가&quot;를 누르면 홈 화면에 앱이 생겨요</>,
        ]}
      />
    )
  }
  if (env.platform === 'android') {
    return (
      <Steps
        items={[
          <>
            브라우저 오른쪽 위(삼성 인터넷은 아래)의 <Key><IconMore size={14} className="rotate-90" /></Key> 메뉴를 눌러요
          </>,
          <>
            <Key>홈 화면에 추가</Key> 또는 <Key>앱 설치</Key>를 눌러요
          </>,
        ]}
      />
    )
  }
  return (
    <p className="text-body text-ink-2">
      PC에서는 Chrome이나 Edge 주소창 오른쪽의 설치 아이콘으로 설치할 수 있어요. 폰에 설치하려면 카메라로 QR을 찍어 주세요.
    </p>
  )
}

/** 지금 쓰는 기기와 브라우저에 맞춰 설치 방법을 보여 준다. showQr 이면 다른 기기용 QR 도 함께 */
export function InstallPanel({ showQr = 'auto' }: { showQr?: 'auto' | 'always' | 'never' }) {
  const mounted = useMounted()
  const { env, canPrompt, installed, prompt } = useInstall()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  if (!mounted || !env) return <div className="h-40 animate-pulse rounded-card bg-surface-2" aria-hidden="true" />

  const url = `${window.location.origin}/install`
  const qr = showQr === 'always' || (showQr === 'auto' && env.platform === 'desktop')

  const onPrompt = async () => {
    const r = await prompt()
    if (r === 'accepted') toast({ message: '설치했어요. 홈 화면에서 열어 보세요.', tone: 'success' })
  }
  const onCopy = async () => {
    const ok = await copyText(url)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } else toast({ message: '복사하지 못했어요. 주소를 길게 눌러 복사해 주세요.', tone: 'error' })
  }

  return (
    <div className={`grid gap-6 ${qr ? 'md:grid-cols-[auto_minmax(0,1fr)] md:items-center' : ''}`}>
      {qr && (
        <div className="flex flex-col items-center gap-2">
          <QrCode url={url} size={200} label="앱 설치 페이지로 가는 QR 코드" />
          <span className="text-cap text-ink-3">폰 카메라로 찍으면 열려요</span>
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-4">
        {installed ? (
          <p className="flex items-center gap-2 text-body font-semibold text-low">
            <IconCheck size={20} strokeWidth={2.4} />
            {env.standalone ? '지금 앱으로 열려 있어요' : '이 기기에 설치했어요'}
          </p>
        ) : (
          <Guide env={env} canPrompt={canPrompt} onPrompt={onPrompt} />
        )}
        <div className="flex items-center gap-2 rounded-btn bg-surface-2 py-1.5 pr-1.5 pl-3.5">
          <span className="tnum min-w-0 flex-1 truncate text-cap text-ink-2">{url.replace(/^https?:\/\//, '')}</span>
          <button
            type="button"
            onClick={onCopy}
            aria-label={copied ? '복사했어요' : '주소 복사'}
            className="press flex min-h-10 shrink-0 items-center gap-1.5 rounded-[10px] bg-surface px-3 text-cap font-semibold shadow-[0_0_0_1px_var(--line)]"
          >
            {copied ? <IconCheck size={16} className="text-low" strokeWidth={2.4} /> : <IconCopy size={16} />}
            {copied ? '복사함' : '복사'}
          </button>
          <span className="sr-only" aria-live="polite">
            {copied ? '주소를 복사했어요' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
