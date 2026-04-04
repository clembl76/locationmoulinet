import { getPhotosForApartment } from '@/lib/drivePhotos'
import type { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/photos/[number]'>
) {
  const { number } = await ctx.params
  const photos = await getPhotosForApartment(number)
  return Response.json({ photos })
}
