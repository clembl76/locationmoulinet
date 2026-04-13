import { runSqlAdmin } from '@/lib/adminData'
import type { NextRequest } from 'next/server'

type LeaseRow = {
  apartment_number: string
  tenant_last_name: string
  tenant_first_name: string
  birth_date: string | null
  signing_date: string | null
  move_out_date: string | null
  rent_excluding_charges: number | null
  charges: number | null
  rent_including_charges: number | null
}

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear()))
  if (isNaN(year) || year < 2000 || year > 2100) {
    return new Response('Année invalide', { status: 400 })
  }

  const rows = await runSqlAdmin<LeaseRow>(`
    SELECT
      a.number   AS apartment_number,
      t.last_name  AS tenant_last_name,
      t.first_name AS tenant_first_name,
      t.birth_date::date::text AS birth_date,
      l.signing_date::date::text AS signing_date,
      l.move_out_inspection_date::date::text AS move_out_date,
      COALESCE(l.rent_excluding_charges, a.rent_excluding_charges) AS rent_excluding_charges,
      COALESCE(l.charges, a.charges) AS charges,
      COALESCE(l.rent_including_charges, a.rent_including_charges) AS rent_including_charges
    FROM leases l
    JOIN apartments a ON a.id = l.apartment_id
    JOIN lease_tenants lt ON lt.lease_id = l.id
    JOIN tenants t ON t.id = lt.tenant_id
    WHERE (l.signing_date IS NULL OR l.signing_date::date <= '${year}-12-31')
      AND (
        l.move_out_inspection_date IS NULL
        OR l.move_out_inspection_date::date >= '${year}-01-01'
      )
    ORDER BY a.number::integer, l.signing_date
  `)

  const header = [
    'Appartement',
    'Nom Prénom',
    'Date entrée',
    'Date sortie',
    'Loyer HC',
    'Charges',
    'Loyer CC',
    'Date de naissance',
  ].join(';')

  const lines = rows.map(r => [
    r.apartment_number,
    `${r.tenant_last_name.toUpperCase()} ${r.tenant_first_name}`.trim(),
    r.signing_date ?? '',
    r.move_out_date ?? '',
    r.rent_excluding_charges ?? '',
    r.charges ?? '',
    r.rent_including_charges ?? '',
    r.birth_date ?? '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))

  const csv = '\uFEFF' + [header, ...lines].join('\r\n')  // BOM UTF-8 pour Excel

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="baux_${year}.csv"`,
    },
  })
}
