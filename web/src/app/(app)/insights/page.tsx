import type { Metadata } from 'next'
import { InsightsScreen } from '@/components/insights/insights-screen'

export const metadata: Metadata = { title: '분석' }

export default function InsightsPage() {
  return <InsightsScreen />
}
