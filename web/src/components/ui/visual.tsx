import type { CSSProperties, ReactNode } from 'react'
import { foodImage, imageSrc } from '@/lib/food-image'
import { TONE_SOFT_VAR, TONE_TEXT, type Tone } from '@/lib/grade'

/** 문장 속 핵심 숫자·낱말: 굵게, 탄소 색, 형광펜 밑줄 */
export function Num({ children, tone, plain = false, className = '' }: { children: ReactNode; tone?: Tone; plain?: boolean; className?: string }) {
  return (
    <b
      className={`tnum font-bold whitespace-nowrap ${tone ? TONE_TEXT[tone] : 'text-ink'} ${plain ? '' : 'hl'} ${className}`}
      style={tone && !plain ? ({ '--hl': TONE_SOFT_VAR[tone] } as CSSProperties) : undefined}
    >
      {children}
    </b>
  )
}

/** Fluent 3D 그림 (장식용이라 alt 는 비운다) */
export function Fluent({ name, size = 24, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 160px 로 미리 줄인 작은 WebP 라 그대로 쓴다
    <img src={imageSrc(name)} alt="" width={size} height={size} loading="lazy" decoding="async" draggable={false} className={`shrink-0 select-none ${className}`} />
  )
}

/** 메뉴 이름에 어울리는 음식 그림 */
export function FoodImg({ name, size = 40, className = '' }: { name: string; size?: number; className?: string }) {
  return <Fluent name={foodImage(name)} size={size} className={className} />
}

/** 비율 도넛 (0~1) */
export function Donut({ value, size = 44, stroke = 6, color = 'var(--lime)', track = 'rgb(255 255 255 / 0.18)', children }: {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(Math.max(value, 0), 1))}
          style={{ transition: 'stroke-dashoffset 700ms var(--ease-out)' }}
        />
      </svg>
      {children && <span className="absolute inset-0 grid place-items-center">{children}</span>}
    </span>
  )
}

/** 남긴 양을 접시 위 조각으로: 0 은 빈 접시에 체크, 1 은 꽉 찬 접시 */
export function PlateIcon({ fraction, size = 22 }: { fraction: number; size?: number }) {
  const r = 7.5
  const cx = 12
  const cy = 12
  let wedge: ReactNode = null
  if (fraction >= 1) wedge = <circle cx={cx} cy={cy} r={r} fill="currentColor" />
  else if (fraction > 0) {
    const a = fraction * 2 * Math.PI
    const x = cx + r * Math.sin(a)
    const y = cy - r * Math.cos(a)
    wedge = <path d={`M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x} ${y} Z`} fill="currentColor" />
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx={cx} cy={cy} r={10.5} />
      {fraction === 0 ? <path d="m8 12.3 2.7 2.7L16 9.6" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /> : wedge}
    </svg>
  )
}
