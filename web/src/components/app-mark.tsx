/** 앱 아이콘 (Codex 로 만든 3D 그릇과 새싹 그림) */
export function AppMark({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 작은 정적 아이콘이라 그대로 쓴다
    <img src="/icons/icon-192.png" alt="" width={size} height={size} className="shrink-0 rounded-[22%] shadow-[0_2px_6px_rgb(0_0_0/0.18)]" draggable={false} />
  )
}
