import { createAdminClient } from '@/lib/supabaseAdmin'
import { learnMapping } from '@/lib/linxoCategorization'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const admin = createAdminClient()

    // If we're validating (validated = true), learn from this transaction
    if (body.validated === true) {
      // Fetch current state to get libelle + supplier + type
      const { data: current } = await admin
        .from('transactions_linxo')
        .select('libelle, supplier, type')
        .eq('id', id)
        .single()

      const supplier = body.supplier ?? current?.supplier
      const type = body.type ?? current?.type
      const libelle = current?.libelle

      if (libelle && supplier && type) {
        await learnMapping(libelle, supplier, type)
      }
    }

    const { error } = await admin
      .from('transactions_linxo')
      .update(body)
      .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
