import { runCategorization } from '@/lib/linxoCategorization'

export const maxDuration = 60

export async function POST() {
  try {
    const result = await runCategorization()
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
