import { google } from 'googleapis'
import type { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/videos/stream/[fileId]'>
) {
  const { fileId } = await ctx.params

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

  const token = await auth.getAccessToken()
  if (!token.token) return new Response('Authentification Google échouée', { status: 500 })

  // Redirect directement vers Google Drive — les octets vidéo ne transitent pas par Vercel.
  // Cache-Control de 30 min : le token Drive expire en 1h, le CDN rafraîchira avant expiration.
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${encodeURIComponent(token.token)}`
  return new Response(null, {
    status: 302,
    headers: {
      Location: driveUrl,
      'Cache-Control': 'public, max-age=1800',
    },
  })
}
