'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { runSqlAdmin } from '@/lib/adminData'
import { createVisitCalendarEvent } from '@/lib/quittance'
import { generateSlots, jsDayToRule, filterSlotsForToday } from '@/lib/visitSlotUtils'

// ── Action publique : créneaux disponibles pour une date ──────────────────────

export async function getAvailableSlotsAction(date: string): Promise<string[]> {
  try {
    // 1. Paramètres globaux
    const settings = await runSqlAdmin<{ active: boolean; slot_duration_minutes: number }>(
      `SELECT active, slot_duration_minutes FROM visit_settings LIMIT 1`
    )
    if (!settings[0]?.active) return []

    const slotDuration = settings[0].slot_duration_minutes

    // 2. Exceptions pour cette date (journée entière ou plages horaires)
    const exceptions = await runSqlAdmin<{ start_time: string | null; end_time: string | null }>(
      `SELECT start_time::text, end_time::text
       FROM visit_availability_exceptions
       WHERE date = '${date}'::date`
    )
    // Exception journée entière (start_time IS NULL)
    if (exceptions.some(e => e.start_time === null)) return []

    // 3. Règles pour ce jour de la semaine
    const d = new Date(date + 'T12:00:00')
    const dayOfWeek = jsDayToRule(d.getDay())
    const rules = await runSqlAdmin<{ start_time: string; end_time: string }>(
      `SELECT start_time::text, end_time::text
       FROM visit_availability_rules
       WHERE day_of_week = ${dayOfWeek}
       ORDER BY start_time`
    )
    if (rules.length === 0) return []

    // 4. Générer tous les créneaux possibles
    const allSlots: string[] = []
    for (const rule of rules) {
      allSlots.push(...generateSlots(rule.start_time, rule.end_time, slotDuration))
    }

    // 5. Créneaux bloqués par des exceptions horaires
    const blockedByException = new Set<string>()
    for (const ex of exceptions) {
      if (ex.start_time && ex.end_time) {
        for (const slot of generateSlots(ex.start_time, ex.end_time, slotDuration)) {
          blockedByException.add(slot)
        }
      }
    }

    // 6. Créneaux déjà réservés ce jour
    const booked = await runSqlAdmin<{ visit_time: string }>(
      `SELECT visit_time::text FROM visitors WHERE visit_date = '${date}'::date`
    )
    const bookedSet = new Set(booked.map(r => r.visit_time.slice(0, 5)))

    // 7. Pour le jour courant : exclure les créneaux avant heure actuelle + 2h (heure de Paris)
    const parisNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
    const todayStr = `${parisNow.getFullYear()}-${String(parisNow.getMonth() + 1).padStart(2, '0')}-${String(parisNow.getDate()).padStart(2, '0')}`
    const nowMins = parisNow.getHours() * 60 + parisNow.getMinutes()

    let available = allSlots.filter(s => !bookedSet.has(s) && !blockedByException.has(s))
    if (date === todayStr) {
      available = filterSlotsForToday(available, nowMins, 120)
    }
    return available
  } catch {
    return []
  }
}

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
  studies_at: string | null
}): Promise<BookingResult> {
  try {
    if (!data.last_name || !data.first_name || !data.email || !data.phone || !data.visit_date || !data.visit_time) {
      return { ok: false, error: 'Veuillez remplir tous les champs obligatoires.' }
    }
    if (data.apartment_ids.length === 0) {
      return { ok: false, error: 'Veuillez sélectionner au moins un appartement.' }
    }

    // Vérification cross-building côté serveur
    const aptBuildings = await runSqlAdmin<{ building_address: string }>(
      `SELECT DISTINCT b.address AS building_address
       FROM apartments a
       JOIN buildings b ON b.id = a.building_id
       WHERE a.id IN (${data.apartment_ids.map(id => `'${id}'`).join(',')})`
    )
    if (aptBuildings.length > 1) {
      return { ok: false, error: 'Vous ne pouvez pas réserver une visite pour des appartements dans des immeubles différents.' }
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
        studies_at: data.studies_at,
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

    // Créer l'événement Google Calendar (best-effort, non bloquant)
    try {
      const [buildingInfo, aptNumbers, settings] = await Promise.all([
        runSqlAdmin<{ building_short_name: string; building_address: string }>(
          `SELECT DISTINCT b.short_name AS building_short_name, b.address AS building_address
           FROM apartments a JOIN buildings b ON b.id = a.building_id
           WHERE a.id IN (${data.apartment_ids.map(id => `'${id}'`).join(',')}) LIMIT 1`
        ),
        runSqlAdmin<{ number: string }>(
          `SELECT a.number FROM apartments a
           WHERE a.id IN (${data.apartment_ids.map(id => `'${id}'`).join(',')})
           ORDER BY a.number`
        ),
        runSqlAdmin<{ slot_duration_minutes: number; contact_name: string | null; contact_email: string | null; contact_phone: string | null; contact_website: string | null }>(
          `SELECT slot_duration_minutes, contact_name, contact_email, contact_phone, contact_website
           FROM visit_settings LIMIT 1`
        ),
      ])

      if (buildingInfo[0] && settings[0]) {
        await createVisitCalendarEvent({
          visitorEmail: data.email.trim().toLowerCase(),
          visitDate: data.visit_date,
          visitTime: data.visit_time,
          slotDurationMinutes: settings[0].slot_duration_minutes,
          buildingShortName: buildingInfo[0].building_short_name,
          buildingAddress: buildingInfo[0].building_address,
          apartmentNumbers: aptNumbers.map(r => r.number),
          contact: settings[0],
        })
      }
    } catch {
      // non-bloquant — la réservation est déjà enregistrée
    }

    return { ok: true, visitorId: visitor.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
