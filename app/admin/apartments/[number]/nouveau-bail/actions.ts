'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { runSqlAdmin } from '@/lib/adminData'
import { redirect } from 'next/navigation'

type TenantInput = {
  title: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  birth_date: string | null
  birth_place: string | null
  family_status: string | null
}

type GuarantorInput = {
  title: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  birth_date: string | null
  birth_place: string | null
  address: string | null
}

type LeaseInput = {
  signing_date: string | null
  move_in_inspection_date: string | null
  duration: string | null
  rent_excluding_charges: number | null
  charges: number | null
  rent_including_charges: number | null
  deposit: number | null
  residency_type: string | null
  lease_type: string | null
  notes: string | null
}

export async function createBailAction(
  aptNumber: string,
  tenantInput: TenantInput,
  guarantorInput: GuarantorInput | null,
  leaseInput: LeaseInput,
): Promise<{ error: string } | never> {
  const admin = createAdminClient()

  // Get apartment id
  const rows = await runSqlAdmin<{ id: string }>(
    `SELECT id FROM apartments WHERE number = '${aptNumber.replace(/'/g, "''")}'`
  )
  if (!rows.length) return { error: `Appartement ${aptNumber} introuvable` }
  const apartmentId = rows[0].id

  // Create tenant
  const tenantRes = await admin
    .from('tenants')
    .insert({
      title: tenantInput.title || null,
      first_name: tenantInput.first_name,
      last_name: tenantInput.last_name,
      email: tenantInput.email || null,
      phone: tenantInput.phone || null,
      birth_date: tenantInput.birth_date || null,
      birth_place: tenantInput.birth_place || null,
      family_status: tenantInput.family_status || null,
    })
    .select('id')
    .single()

  if (tenantRes.error) return { error: `Locataire : ${tenantRes.error.message}` }
  const tenantId = tenantRes.data.id

  // Create lease
  const leaseRes = await admin
    .from('leases')
    .insert({
      apartment_id: apartmentId,
      signing_date: leaseInput.signing_date || null,
      move_in_inspection_date: leaseInput.move_in_inspection_date || null,
      duration: leaseInput.duration || null,
      rent_excluding_charges: leaseInput.rent_excluding_charges,
      charges: leaseInput.charges,
      rent_including_charges: leaseInput.rent_including_charges,
      deposit: leaseInput.deposit,
      residency_type: leaseInput.residency_type || null,
      lease_type: leaseInput.lease_type || null,
      notes: leaseInput.notes || null,
      status: 'active',
    })
    .select('id')
    .single()

  if (leaseRes.error) {
    // Rollback: delete tenant
    await admin.from('tenants').delete().eq('id', tenantId)
    return { error: `Bail : ${leaseRes.error.message}` }
  }
  const leaseId = leaseRes.data.id

  // Associate tenant to lease
  const ltRes = await admin
    .from('lease_tenants')
    .insert({ lease_id: leaseId, tenant_id: tenantId })

  if (ltRes.error) {
    await admin.from('leases').delete().eq('id', leaseId)
    await admin.from('tenants').delete().eq('id', tenantId)
    return { error: `Liaison bail/locataire : ${ltRes.error.message}` }
  }

  // Create guarantor if provided
  if (guarantorInput && guarantorInput.last_name) {
    const gRes = await admin.from('guarantors').insert({
      tenant_id: tenantId,
      title: guarantorInput.title || null,
      first_name: guarantorInput.first_name || '',
      last_name: guarantorInput.last_name,
      email: guarantorInput.email || null,
      phone: guarantorInput.phone || null,
      birth_date: guarantorInput.birth_date || null,
      birth_place: guarantorInput.birth_place || null,
      address: guarantorInput.address || null,
    })
    if (gRes.error) {
      // Non-blocking: just log, lease is already created
      console.error('Garant error (non-blocking):', gRes.error.message)
    }
  }

  redirect(`/admin/apartments/${aptNumber}`)
}
