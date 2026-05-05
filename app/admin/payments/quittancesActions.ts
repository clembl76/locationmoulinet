'use server'

import { getRentsForLeaseYear } from '@/lib/adminData'
import { getQuittanceData, generateQuittancePdf, createGmailDraft } from '@/lib/quittance'

export type QuittanceMonthResult =
  | { month: number; ok: true; filename: string }
  | { month: number; ok: false; error: string }

export async function generateQuittancesForMonthsAction(
  leaseId: string,
  aptNumber: string,
  year: number,
  months: number[],
): Promise<QuittanceMonthResult[]> {
  const qData = await getQuittanceData(leaseId)
  if (!qData) return months.map(m => ({ month: m, ok: false, error: 'Données du bail introuvables' }))

  const rents = await getRentsForLeaseYear(leaseId, year)
  const rentByMonth = new Map(rents.map(r => [r.month, r]))

  const results: QuittanceMonthResult[] = []

  for (const month of months) {
    try {
      const rent = rentByMonth.get(month)
      if (!rent) {
        results.push({ month, ok: false, error: 'Aucun loyer enregistré pour ce mois' })
        continue
      }
      const amount = rent.amount_received ?? rent.amount_expected
      const { pdfBytes, filename } = await generateQuittancePdf(qData, year, month, amount)
      await createGmailDraft(qData, year, month, pdfBytes, filename)
      results.push({ month, ok: true, filename })
    } catch (e) {
      results.push({ month, ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' })
    }
  }

  return results
}

export async function getRentsForYearAction(
  leaseId: string,
  year: number,
): Promise<{ month: number; amount_expected: number; amount_received: number | null; is_prorata: boolean }[]> {
  const rents = await getRentsForLeaseYear(leaseId, year)
  return rents.map(r => ({
    month: r.month,
    amount_expected: r.amount_expected,
    amount_received: r.amount_received,
    is_prorata: r.is_prorata,
  }))
}
