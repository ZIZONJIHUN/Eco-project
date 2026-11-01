import { ImageResponse } from 'next/og'

// 앱 아이콘 PNG. 그림은 components/app-mark.tsx 와 같다.
// any: 둥근 모서리 / maskable·apple: 꽉 찬 정사각형 (기기가 알아서 모양을 깎는다)
const ICONS: Record<string, { size: number; bleed: boolean }> = {
  'icon-192.png': { size: 192, bleed: false },
  'icon-512.png': { size: 512, bleed: false },
  'maskable-512.png': { size: 512, bleed: true },
  'apple-touch-icon.png': { size: 180, bleed: true },
}

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }))
}

export async function GET(_req: Request, ctx: RouteContext<'/pwa-icons/[name]'>) {
  const { name } = await ctx.params
  const icon = ICONS[name]
  if (!icon) return new Response('Not found', { status: 404 })
  const { size, bleed } = icon
  // maskable 은 가운데 80% 안전 영역에 그림이 들어가도록 조금 줄인다
  const scale = bleed ? 0.84 : 1
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bleed ? '#1c6b4f' : 'transparent' }}>
        <svg width={size} height={size} viewBox="0 0 512 512">
          {!bleed && <rect width="512" height="512" rx="112" fill="#1c6b4f" />}
          <g transform={`translate(${256 - 256 * scale} ${256 - 256 * scale}) scale(${scale})`}>
            <path d="M256 250c-3-62 36-108 104-118-2 66-40 110-104 118Z" fill="#c9ee7a" />
            <path d="M250 252c-44-6-76-38-80-84 48 2 78 34 80 84Z" fill="#9fdc7c" />
            <path d="M128 262h256a128 128 0 0 1-256 0Z" fill="#ffffff" />
            <rect x="200" y="400" width="112" height="20" rx="10" fill="#ffffff" />
          </g>
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { 'Cache-Control': 'public, max-age=604800, immutable' } },
  )
}
