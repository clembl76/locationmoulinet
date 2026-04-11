'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { revalidatePath } from 'next/cache'

const REVALIDATE = () => revalidatePath('/admin/visites')

// ── Helper : récupère l'id de la ligne visit_settings (il n'en existe qu'une) ─

async function getSettingsId(): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('visit_settings')
    .select('id')
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data.id as string
}

// ── Paramètres globaux ────────────────────────────────────────────────────────

export async function setVisitActiveAction(active: boolean): Promise<{ ok: boolean; error?: string }> {
  const id = await getSettingsId()
  if (!id) return { ok: false, error: 'Ligne visit_settings introuvable.' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('visit_settings')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id)
  REVALIDATE()
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function setSlotDurationAction(minutes: number): Promise<{ ok: boolean; error?: string }> {
  const id = await getSettingsId()
  if (!id) return { ok: false, error: 'Ligne visit_settings introuvable.' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('visit_settings')
    .update({ slot_duration_minutes: minutes, updated_at: new Date().toISOString() })
    .eq('id', id)
  REVALIDATE()
  return error ? { ok: false, error: error.message } : { ok: true }
}

// ── Règles récurrentes ────────────────────────────────────────────────────────

export async function addRuleAction(dayOfWeek: number, startTime: string, endTime: string) {
  const admin = createAdminClient()
  await admin.from('visit_availability_rules').insert({
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
  })
  REVALIDATE()
}

export async function deleteRuleAction(id: string) {
  const admin = createAdminClient()
  await admin.from('visit_availability_rules').delete().eq('id', id)
  REVALIDATE()
}

// ── Exceptions ────────────────────────────────────────────────────────────────

export async function addExceptionAction(
  date: string,
  label: string | null,
  startTime: string | null,
  endTime: string | null
) {
  const admin = createAdminClient()
  await admin.from('visit_availability_exceptions').insert({
    date,
    label: label || null,
    start_time: startTime || null,
    end_time: endTime || null,
  })
  REVALIDATE()
}

export async function deleteExceptionAction(id: string) {
  const admin = createAdminClient()
  await admin.from('visit_availability_exceptions').delete().eq('id', id)
  REVALIDATE()
}

// ── Contact gestion locative ──────────────────────────────────────────────────

export async function updateContactAction(contact: {
  contact_name: string
  contact_phone: string
  contact_email: string
  contact_website: string
}): Promise<{ ok: boolean; error?: string }> {
  const id = await getSettingsId()
  if (!id) return { ok: false, error: 'Ligne visit_settings introuvable.' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('visit_settings')
    .update({
      contact_name: contact.contact_name || null,
      contact_phone: contact.contact_phone || null,
      contact_email: contact.contact_email || null,
      contact_website: contact.contact_website || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  REVALIDATE()
  return error ? { ok: false, error: error.message } : { ok: true }
}
