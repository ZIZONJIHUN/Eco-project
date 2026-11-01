'use client'

/** 클립보드 복사. https 가 아니거나 권한이 막힌 환경에서도 되도록 예전 방식으로 한 번 더 시도한다 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/** 휴대폰 공유 창을 띄우고, 없으면 링크를 복사한다 */
export async function shareOrCopy(data: { title: string; text: string; url: string }): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled'
    }
  }
  return (await copyText(data.url)) ? 'copied' : 'failed'
}
