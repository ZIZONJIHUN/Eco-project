import { AppProvider } from '@/components/app-provider'
import { Shell } from '@/components/shell'
import { getDataset } from '@/lib/server/dataset'

/** 네 화면(오늘·식단·분석·설정)이 같은 데이터를 쓴다. 데이터는 6시간마다 새로 만든다 */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const data = await getDataset()
  return (
    <AppProvider initial={data}>
      <Shell>{children}</Shell>
    </AppProvider>
  )
}
