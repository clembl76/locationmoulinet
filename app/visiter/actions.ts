'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'

export type BookingResult =
  | { ok: true; visitorId: string }
  | { ok: false; error: string }

export async function createVisitorAction(data: {
  last_name: string
  first_name: string
  email: string
  phone: string
  visit_date: string
  visit_time: string
  desired_duration_months: number | null
  comments: string
  apartment_ids: string[]
  guarantor_type: 'none' | 'physical' | 'visale' | null
  situation: 'student' | 'other' | null
  total_income: number | null
}): Promise<BookingResult> {
  try {
    if (!data.last_name || !data.first_name || !data.email || !data.phone || !data.visit_date || !data.visit_time) {
      return { ok: false, error: 'Veuillez remplir tous les champs obligatoires.' }
    }
    if (data.apartment_ids.length === 0) {
      return { ok: false, error: 'Veuillez sélectionner au moins un appartement.' }
    }

    const admin = createAdminClient()

    const { data: visitor, error: vErr } = await admin
      .from('visitors')
      .insert({
        last_name: data.last_name.trim(),
        first_name: data.first_name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim() || null,
        visit_date: data.visit_date,
        visit_time: data.visit_time,
        desired_duration_months: data.desired_duration_months,
        comments: data.comments.trim() || null,
        guarantor_type: data.guarantor_type,
        situation: data.situation,
        total_income: data.total_income,
      })
      .select('id')
      .single()

    if (vErr || !visitor) throw new Error(vErr?.message ?? 'Erreur lors de la création')

    const rows = data.apartment_ids.map(apt_id => ({
      visitor_id: visitor.id,
      apartment_id: apt_id,
    }))

    const { error: aErr } = await admin.from('visitor_apartments').insert(rows)
    if (aErr) throw new Error(aErr.message)

    return { ok: true, visitorId: visitor.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
