'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** 주소를 QR 로 그린다. 어두운 화면에서도 잘 찍히도록 늘 흰 바탕에 검은 점이다 */
export function QrCode({ url, size = 220, label }: { url: string; size?: number; label?: string }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    QRCode.toString(url, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#161b18', light: '#ffffff' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [url])

  return (
    <figure className="flex flex-col items-center gap-3">
      <div
        role="img"
        aria-label={label ?? `QR 코드: ${url}`}
        className="overflow-hidden rounded-[18px] bg-white p-2 shadow-[0_0_0_1px_rgb(0_0_0/0.08)]"
        style={{ width: size, height: size }}
      >
        {svg ? (
          // eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 만든 SVG 데이터라 next/image 최적화 대상이 아니다
          <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="" className="block size-full" />
        ) : (
          <div className={`size-full rounded-[12px] ${failed ? '' : 'animate-pulse bg-black/5'}`} />
        )}
      </div>
      {failed && <figcaption className="text-cap text-alert">QR을 만들지 못했어요. 아래 주소를 직접 입력해 주세요.</figcaption>}
    </figure>
  )
}
