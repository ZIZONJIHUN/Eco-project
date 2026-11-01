import type { Metadata } from 'next'
import { RecordsScreen } from '@/components/records/records-screen'

export const metadata: Metadata = { title: '내 기록' }

export default function RecordsPage() {
  return <RecordsScreen />
}
