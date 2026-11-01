import { getDataset } from '@/lib/server/dataset'

/** 앱을 오래 켜 두었을 때 새 식단을 받아 가는 주소. 서버에서 6시간 동안 같은 결과를 쓴다 */
export async function GET() {
  const data = await getDataset()
  return Response.json(data, {
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=21600' },
  })
}
