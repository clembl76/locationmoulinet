import { streamFileWithAuth } from '@/lib/drivePhotos'
import type { NextRequest } from 'next/server'

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/photos/img/[fileId]'>
) {
  const { fileId } = await ctx.params
  const isThumb = req.nextUrl.searchParams.get('size') === 'thumb'
  return streamFileWithAuth(fileId, isThumb)
}
