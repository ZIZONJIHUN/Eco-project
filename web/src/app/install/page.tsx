import type { Metadata } from 'next'
import { InstallScreen } from '@/components/install/install-screen'

export const metadata: Metadata = {
  title: '앱 설치',
  description: '효명 급식 탄소를 폰 홈 화면에 추가하는 방법',
}

export default function InstallPage() {
  return <InstallScreen />
}
