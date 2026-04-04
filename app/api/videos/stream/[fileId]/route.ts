import { google } from 'googleapis'
import type { NextRequest } from 'next/server'

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/videos/stream/[fileId]'>
) {
  const { fileId } = await ctx.params

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

  const token = await auth.getAccessToken()

  // Get file metadata for content-type and size
  const drive = google.drive({ version: 'v3', auth })
  const meta = await drive.files.get({ fileId, fields: 'mimeType, size' })
  const mimeType = meta.data.mimeType ?? 'video/mp4'
  const fileSize = meta.data.size ? parseInt(meta.data.size) : undefined

  const rangeHeader = req.headers.get('range')

  const upstreamHeaders: Record<string, string> = {
    Authorization: `Bearer ${token.token}`,
  }
  if (rangeHeader) {
    upstreamHeaders['Range'] = rangeHeader
  }

  const upstream = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: upstreamHeaders }
  )

  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Not found', { status: 404 })
  }

  const responseHeaders: Record<string, string> = {
    'Content-Type': mimeType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
  }

  // Forward content-range and content-length from upstream
  const contentRange = upstream.headers.get('content-range')
  const contentLength = upstream.headers.get('content-length')
  if (contentRange) responseHeaders['Content-Range'] = contentRange
  if (contentLength) responseHeaders['Content-Length'] = contentLength
  else if (fileSize) responseHeaders['Content-Length'] = String(fileSize)

  return new Response(upstream.body, {
    status: rangeHeader ? 206 : 200,
    headers: responseHeaders,
  })
}
