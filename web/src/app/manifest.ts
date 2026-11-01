import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: '효명 급식 탄소',
    short_name: '급식탄소',
    description: '효명고 점심 급식 한 끼의 탄소 발자국을 날마다 보여 주는 앱',
    lang: 'ko',
    dir: 'ltr',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#f3f4f1',
    theme_color: '#1c6b4f',
    categories: ['education', 'food', 'lifestyle'],
    icons: [
      { src: '/pwa-icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: '이번 주 식단', short_name: '식단', url: '/meals', icons: [{ src: '/pwa-icons/icon-192.png', sizes: '192x192' }] },
      { name: '분석', url: '/insights', icons: [{ src: '/pwa-icons/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
