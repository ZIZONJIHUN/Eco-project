import type { Metadata, Viewport } from 'next'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'
import { ServiceWorker } from '@/components/service-worker'

export const metadata: Metadata = {
  title: { default: '효명 급식 탄소', template: '%s · 효명 급식 탄소' },
  description: '효명고 점심 급식 한 끼의 탄소 발자국을 날마다 보여 주는 앱. 메뉴별 재료와 남겼을 때 버려지는 탄소, 알레르기까지 한눈에.',
  applicationName: '효명 급식 탄소',
  appleWebApp: { capable: true, title: '급식탄소', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/pwa-icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f4f1' },
    { media: '(prefers-color-scheme: dark)', color: '#0d110f' },
  ],
}

// 첫 화면을 그리기 전에: 저장된 테마를 적용하고, 브라우저의 설치 요청을 React 보다 먼저 받아 둔다
const BOOT = `(function(){try{var t=JSON.parse(localStorage.getItem('hm-theme')||'"system"');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bip=e;window.dispatchEvent(new Event('hm:bip'))})})()`

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  )
}
