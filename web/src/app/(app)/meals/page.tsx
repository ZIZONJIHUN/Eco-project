import type { Metadata } from 'next'
import { MealsScreen } from '@/components/meals/meals-screen'

export const metadata: Metadata = { title: '식단' }

export default function MealsPage() {
  return <MealsScreen />
}
