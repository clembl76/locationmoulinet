import { getLinxoTransactions } from '@/lib/linxoImport'

export async function GET() {
  try {
    const rows = await getLinxoTransactions()
    return Response.json(rows)
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
