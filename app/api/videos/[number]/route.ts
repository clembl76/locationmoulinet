import { getVideosForApartment } from '@/lib/drivePhotos'
import type { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/videos/[number]'>
) {
  const { number } = await ctx.params
  const videos = await getVideosForApartment(number)
  return Response.json({ videos })
}
