import { google } from 'googleapis'

export type DrivePhoto = {
  id: string
  name: string
  src: string
  thumb: string
}

function matchesApartment(folderName: string, number: string): boolean {
  if (folderName === number) return true
  const padded = number.padStart(2, '0')
  if (folderName === `Lot-${padded}`) return true
  if (new RegExp(`Lot-${padded}(/|$)`, 'i').test(folderName)) return true
  if (new RegExp(`Lot-${padded}(?!\\d)`, 'i').test(folderName)) return true
  return false
}

function makeAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return auth
}

export type DriveVideo = {
  id: string
  name: string
  src: string      // /api/videos/stream/{id}
  mimeType: string
}

async function getFolderForApartment(
  folderId: string,
  number: string,
  drive: ReturnType<typeof google.drive>
): Promise<string | null> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 100,
  }).catch(() => null)
  return res?.data.files?.find(f => matchesApartment(f.name ?? '', number))?.id ?? null
}

export async function getPhotosForApartment(number: string): Promise<DrivePhoto[]> {
  const folderId = process.env.GDRIVE_PHOTOS_FOLDER_ID
  const auth = makeAuth()
  const drive = google.drive({ version: 'v3', auth })

  const subfolderId = await getFolderForApartment(folderId!, number, drive)
  if (!subfolderId) return []

  const filesRes = await drive.files.list({
    q: `'${subfolderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: 'files(id, name)',
    orderBy: 'name',
  })

  return (filesRes.data.files ?? []).map(f => ({
    id: f.id!,
    name: f.name!,
    src: `/api/photos/img/${f.id}`,
    thumb: `/api/photos/img/${f.id}?size=thumb`,
  }))
}

export async function getVideosForApartment(number: string): Promise<DriveVideo[]> {
  const folderId = process.env.GDRIVE_VIDEOS_FOLDER_ID
  if (!folderId) return []

  const auth = makeAuth()
  const drive = google.drive({ version: 'v3', auth })

  const subfolderId = await getFolderForApartment(folderId, number, drive)
  if (!subfolderId) return []

  const filesRes = await drive.files.list({
    q: `'${subfolderId}' in parents and mimeType contains 'video/' and trashed = false`,
    fields: 'files(id, name, mimeType)',
    orderBy: 'name',
  })

  return (filesRes.data.files ?? []).map(f => ({
    id: f.id!,
    name: f.name!,
    src: `/api/videos/stream/${f.id}`,
    mimeType: f.mimeType ?? 'video/mp4',
  }))
}

export async function streamFileWithAuth(fileId: string, isThumb: boolean): Promise<Response> {
  const auth = makeAuth()
  const token = await auth.getAccessToken()

  if (isThumb) {
    const drive = google.drive({ version: 'v3', auth })
    const meta = await drive.files.get({ fileId, fields: 'thumbnailLink' })
    const thumbnailLink = meta.data.thumbnailLink

    // thumbnailLink can be null for some files — fall back to full image
    if (thumbnailLink) {
      const res = await fetch(thumbnailLink, {
        headers: { Authorization: `Bearer ${token.token}` },
      })
      if (res.ok) {
        const contentType = res.headers.get('content-type') ?? 'image/jpeg'
        return new Response(res.body, {
          headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
        })
      }
    }
    // Fall through to full image
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token.token}` } }
  )
  if (!res.ok) return new Response('Not found', { status: 404 })
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  return new Response(res.body, {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
  })
}
