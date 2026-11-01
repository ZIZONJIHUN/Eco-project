/** 앱 아이콘과 같은 모양: 초록 바탕에 그릇과 새싹 */
export function AppMark({ size = 40, rounded = true }: { size?: number; rounded?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false" className="shrink-0">
      <rect width="512" height="512" rx={rounded ? 120 : 0} fill="#1c6b4f" />
      <path d="M256 250c-3-62 36-108 104-118-2 66-40 110-104 118Z" fill="#c9ee7a" />
      <path d="M250 252c-44-6-76-38-80-84 48 2 78 34 80 84Z" fill="#9fdc7c" />
      <path d="M128 262h256a128 128 0 0 1-256 0Z" fill="#ffffff" />
      <rect x="200" y="400" width="112" height="20" rx="10" fill="#ffffff" />
    </svg>
  )
}
