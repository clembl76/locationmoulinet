import { importLinxoCsvs } from '@/lib/linxoImport'

export const maxDuration = 60

export async function POST() {
  try {
    const result = await importLinxoCsvs()
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
