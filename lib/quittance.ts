import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import path from 'path'
import fs from 'fs'
import { Readable } from 'stream'
import { google } from 'googleapis'
import { runSqlAdmin } from './adminData'
import { buildTenantListEmailBody, buildEdlEntreeEmailBody, EDL_ENTREE_EMAIL_SUBJECT } from './emailFormatting'
import { calcProrataBreakdown, computeQuittancePeriod, fmtShortDate } from './quittanceUtils'

// ─── Constantes ───────────────────────────────────────────────────────────────

const TENANT_LIST_EMAIL_RECIPIENT = 'clementine.blanchon@gmail.com'

const MOIS_FR: Record<number, string> = {
  1: 'janvier', 2: 'février', 3: 'mars', 4: 'avril',
  5: 'mai', 6: 'juin', 7: 'juillet', 8: 'août',
  9: 'septembre', 10: 'octobre', 11: 'novembre', 12: 'décembre',
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuittanceData = {
  // Tenant
  tenant_title: string | null
  tenant_last_name: string
  tenant_first_name: string
  tenant_email: string | null
  // Building
  building_address: string
  building_short_name: string
  apartment_number: string
  floor_label: string | null
  // Owner
  owner_title: string | null
  owner_first_name: string
  owner_last_name: string
  // Loyer
  rent_excluding_charges: number
  charges: number
  rent_including_charges: number
  // Bail (pour la période réelle en cas de mois au prorata)
  lease_signing_date: string | null
  lease_move_out_date: string | null
}

// ─── Fetch data ───────────────────────────────────────────────────────────────

export async function getQuittanceData(leaseId: string): Promise<QuittanceData | null> {
  const rows = await runSqlAdmin<QuittanceData>(`
    SELECT DISTINCT ON (l.id)
      t.title           AS tenant_title,
      t.last_name       AS tenant_last_name,
      t.first_name      AS tenant_first_name,
      t.email           AS tenant_email,
      b.address         AS building_address,
      b.short_name      AS building_short_name,
      a.number          AS apartment_number,
      a.floor_label,
      o.title           AS owner_title,
      o.first_name      AS owner_first_name,
      o.last_name       AS owner_last_name,
      a.rent_excluding_charges,
      a.charges,
      a.rent_including_charges,
      l.signing_date::text AS lease_signing_date,
      l.move_out_inspection_date::text AS lease_move_out_date
    FROM leases l
    JOIN apartments a      ON a.id = l.apartment_id
    JOIN buildings b       ON b.id = a.building_id
    JOIN owners o          ON o.id = b.owner_id
    JOIN lease_tenants lt  ON lt.lease_id = l.id
    JOIN tenants t         ON t.id = lt.tenant_id
    WHERE l.id = '${leaseId}'
    ORDER BY l.id, t.last_name
    LIMIT 1
  `)
  return rows[0] ?? null
}

// ─── PDF generation ───────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }

// Wrap text in a given max width, return lines
function wrapText(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (current) lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function generateQuittancePdf(
  data: QuittanceData,
  year: number,
  month: number,
  amountReceived: number
): Promise<{ pdfBytes: Uint8Array; filename: string }> {
  const moisFr = MOIS_FR[month]
  const { periodStartIso, periodEndIso } = computeQuittancePeriod(
    year, month, data.lease_signing_date, data.lease_move_out_date
  )
  const dateDebut = fmtShortDate(periodStartIso)
  const dateFin = fmtShortDate(periodEndIso)
  const today = new Date()
  const todayStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`

  const nom = data.tenant_last_name.toUpperCase()
  const prenom = data.tenant_first_name
  const titleRaw = (data.tenant_title ?? '').toUpperCase().replace('.', '')
  const civilite = ['M', 'MR', 'MONSIEUR'].includes(titleRaw) ? 'M.' : 'Mme'

  const ownerDisplay = `${data.owner_title ?? ''} ${data.owner_first_name} ${data.owner_last_name.toUpperCase()}`.trim()

  const logementDesignation = data.building_short_name === 'Moulinet'
    ? `situé au ${data.building_address} - Appartement n°${data.apartment_number}`
    : `situé au ${data.building_address} - ${data.floor_label ?? ''}`

  const loyerCc = amountReceived
  const { loyerHc, charges } = calcProrataBreakdown(
    amountReceived,
    data.rent_excluding_charges,
    data.rent_including_charges,
  )

  const para1 = `Je soussignée, ${ownerDisplay}, propriétaire du logement ${logementDesignation}, donné en location à ${civilite} ${nom} ${prenom}, déclare avoir reçu de celui(celle)-ci à titre de loyer et charges pour la période du ${dateDebut} au ${dateFin} la somme de ${loyerCc.toFixed(2)} EUR et lui en donne quittance.`
  const para2 = `Cette somme se répartit de la façon suivante : ${loyerHc.toFixed(2)} EUR de loyer et ${charges.toFixed(2)} EUR de charges.`
  const para3 = `Fait à Rouen, le ${todayStr}`

  const filename = `${year}-${pad(month)}_Quittance_${data.apartment_number}-${nom}.pdf`

  // Build PDF
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const margin = 70  // ~2.5cm
  const maxWidth = width - margin * 2
  const bodySize = 11
  const titleSize = 16
  const lineHeight = 18

  let y = height - margin

  // Title
  const titleText = 'QUITTANCE DE LOYER'
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize)
  page.drawText(titleText, {
    x: (width - titleWidth) / 2,
    y,
    size: titleSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  })
  // Underline
  page.drawLine({
    start: { x: (width - titleWidth) / 2, y: y - 2 },
    end: { x: (width + titleWidth) / 2, y: y - 2 },
    thickness: 1,
    color: rgb(0, 0, 0),
  })
  y -= titleSize + 34 // spaceAfter ~1.2cm

  // Paragraph 1
  const lines1 = wrapText(para1, fontReg, bodySize, maxWidth)
  for (const line of lines1) {
    page.drawText(line, { x: margin, y, size: bodySize, font: fontReg, color: rgb(0, 0, 0) })
    y -= lineHeight
  }
  y -= 22 // spaceAfter ~0.8cm

  // Paragraph 2
  const lines2 = wrapText(para2, fontReg, bodySize, maxWidth)
  for (const line of lines2) {
    page.drawText(line, { x: margin, y, size: bodySize, font: fontReg, color: rgb(0, 0, 0) })
    y -= lineHeight
  }
  y -= 22

  // Paragraph 3 (spaceBefore ~1.5cm)
  y -= 42
  page.drawText(para3, { x: margin, y, size: bodySize, font: fontReg, color: rgb(0, 0, 0) })
  y -= lineHeight + 28 // spacer 1cm

  // Signature image
  const sigFile = data.building_short_name === 'Vieux Palais'
    ? 'signature-francois.png'
    : 'signature-alaouimhammedi.png'
  const sigPath = path.join(process.cwd(), 'lib', 'signatures', sigFile)

  if (fs.existsSync(sigPath)) {
    const sigBytes = fs.readFileSync(sigPath)
    const sigImage = await pdfDoc.embedPng(sigBytes)
    const sigWidthPt = 227 // ~8cm in points
    const sigHeightPt = sigWidthPt * (sigImage.height / sigImage.width)
    page.drawImage(sigImage, { x: margin, y: y - sigHeightPt, width: sigWidthPt, height: sigHeightPt })
  }

  const pdfBytes = await pdfDoc.save()
  return { pdfBytes, filename }
}

// ─── Quittance de caution ─────────────────────────────────────────────────────

export type QuittanceCautionData = QuittanceData & {
  guarantor_email: string | null
  caution_amount: number
}

export async function getQuittanceCautionData(
  leaseId: string,
  aptNumber: string
): Promise<QuittanceCautionData | null> {
  const base = await getQuittanceData(leaseId)
  if (!base) return null

  const [depositRows, guarantorRows] = await Promise.all([
    runSqlAdmin<{ deposit: number }>(`
      SELECT COALESCE(deposit, 0) AS deposit FROM leases WHERE id = '${leaseId}' LIMIT 1
    `),
    runSqlAdmin<{ email: string | null }>(`
      SELECT g.email FROM guarantors g
      JOIN lease_tenants lt ON lt.tenant_id = g.tenant_id
      WHERE lt.lease_id = '${leaseId}'
      LIMIT 1
    `),
  ])

  return {
    ...base,
    caution_amount: Number(depositRows[0]?.deposit ?? 0),
    guarantor_email: guarantorRows[0]?.email ?? null,
  }
}

export async function generateQuittanceCautionPdf(
  data: QuittanceCautionData
): Promise<{ pdfBytes: Uint8Array; filename: string }> {
  const today = new Date()
  const todayStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`

  const nom = data.tenant_last_name.toUpperCase()
  const prenom = data.tenant_first_name
  const titleRaw = (data.tenant_title ?? '').toUpperCase().replace('.', '')
  const civilite = ['M', 'MR', 'MONSIEUR'].includes(titleRaw) ? 'M.' : 'Mme'

  const ownerDisplay = `${data.owner_title ?? ''} ${data.owner_first_name} ${data.owner_last_name.toUpperCase()}`.trim()

  const logementDesignation = data.building_short_name === 'Moulinet'
    ? `situé au ${data.building_address} - Appartement n°${data.apartment_number}`
    : `situé au ${data.building_address} - ${data.floor_label ?? ''}`

  const para1 = `Nous soussignés, ${ownerDisplay}, propriétaires du logement ${logementDesignation}, donné en location à ${civilite} ${nom} ${prenom}, déclarons avoir reçu de celui(celle)-ci à titre de caution la somme de ${data.caution_amount.toFixed(2)} EUR et lui en donnons quittance.`
  const para2 = `Fait à Rouen, le ${todayStr}`

  const filename = `${today.getFullYear()}-${pad(today.getMonth() + 1)}_QuittanceCAUTION_${data.apartment_number}-${nom}.pdf`

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  const { width, height } = page.getSize()

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const margin = 70
  const maxWidth = width - margin * 2
  const bodySize = 11
  const titleSize = 16
  const lineHeight = 18

  let y = height - margin

  const titleText = 'QUITTANCE DE CAUTION'
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize)
  page.drawText(titleText, { x: (width - titleWidth) / 2, y, size: titleSize, font: fontBold, color: rgb(0, 0, 0) })
  page.drawLine({
    start: { x: (width - titleWidth) / 2, y: y - 2 },
    end: { x: (width + titleWidth) / 2, y: y - 2 },
    thickness: 1,
    color: rgb(0, 0, 0),
  })
  y -= titleSize + 34

  const lines1 = wrapText(para1, fontReg, bodySize, maxWidth)
  for (const line of lines1) {
    page.drawText(line, { x: margin, y, size: bodySize, font: fontReg, color: rgb(0, 0, 0) })
    y -= lineHeight
  }
  y -= 22

  y -= 42
  page.drawText(para2, { x: margin, y, size: bodySize, font: fontReg, color: rgb(0, 0, 0) })
  y -= lineHeight + 28

  const sigFile = data.building_short_name === 'Vieux Palais'
    ? 'signature-francois.png'
    : 'signature-alaouimhammedi.png'
  const sigPath = path.join(process.cwd(), 'lib', 'signatures', sigFile)

  if (fs.existsSync(sigPath)) {
    const sigBytes = fs.readFileSync(sigPath)
    const sigImage = await pdfDoc.embedPng(sigBytes)
    const sigWidthPt = 227
    const sigHeightPt = sigWidthPt * (sigImage.height / sigImage.width)
    page.drawImage(sigImage, { x: margin, y: y - sigHeightPt, width: sigWidthPt, height: sigHeightPt })
  }

  const pdfBytes = await pdfDoc.save()
  return { pdfBytes, filename }
}

export async function createGmailDraftCaution(
  data: QuittanceCautionData,
  pdfBytes: Uint8Array,
  filename: string
): Promise<string> {
  const to = data.tenant_email ?? ''
  const subject = `Quittance de caution - Appartement ${data.apartment_number}`
  const body =
    `Bonjour,\n\n` +
    `nous avons bien reçu votre paiement pour la caution de l'appartement n°${data.apartment_number} et vous en remercions.\n` +
    `Vous trouverez ci-joint la quittance correspondante.\n\n` +
    `Cordialement,\n` +
    `Madame Clémentine ALAOUI M'HAMMEDI`

  const boundary = `----=_boundary_${Date.now()}`
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64')

  const headers: string[] = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ]
  if (data.guarantor_email) headers.push(`Cc: ${data.guarantor_email}`)

  const mime = [
    ...headers,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    body,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${filename}"`,
    ``,
    pdfBase64,
    ``,
    `--${boundary}--`,
  ].join('\r\n')

  const raw = Buffer.from(mime).toString('base64url')
  const auth = makeGoogleAuth()
  const gmail = google.gmail({ version: 'v1', auth })
  const draft = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } },
  })
  return draft.data.id ?? ''
}

// ─── Attestation de location ──────────────────────────────────────────────────

export type AttestationData = {
  tenant_title: string | null
  tenant_last_name: string
  tenant_first_name: string
  tenant_email: string | null
  building_address: string
  building_short_name: string
  apartment_number: string
  floor_label: string | null
  owner_title: string | null
  owner_first_name: string
  owner_last_name: string
  signing_date: string | null
  guarantor_email: string | null
}

export async function getAttestationData(leaseId: string): Promise<AttestationData | null> {
  const rows = await runSqlAdmin<Omit<AttestationData, 'guarantor_email'>>(`
    SELECT DISTINCT ON (l.id)
      t.title           AS tenant_title,
      t.last_name       AS tenant_last_name,
      t.first_name      AS tenant_first_name,
      t.email           AS tenant_email,
      b.address         AS building_address,
      b.short_name      AS building_short_name,
      a.number          AS apartment_number,
      a.floor_label,
      o.title           AS owner_title,
      o.first_name      AS owner_first_name,
      o.last_name       AS owner_last_name,
      l.signing_date::text AS signing_date
    FROM leases l
    JOIN apartments a      ON a.id = l.apartment_id
    JOIN buildings b       ON b.id = a.building_id
    JOIN owners o          ON o.id = b.owner_id
    JOIN lease_tenants lt  ON lt.lease_id = l.id
    JOIN tenants t         ON t.id = lt.tenant_id
    WHERE l.id = '${leaseId}'
    ORDER BY l.id, t.last_name
    LIMIT 1
  `)
  if (!rows[0]) return null

  const guarantorRows = await runSqlAdmin<{ email: string | null }>(`
    SELECT g.email FROM guarantors g
    JOIN lease_tenants lt ON lt.tenant_id = g.tenant_id
    WHERE lt.lease_id = '${leaseId}'
    LIMIT 1
  `)

  return {
    ...rows[0],
    guarantor_email: guarantorRows[0]?.email ?? null,
  }
}

export async function generateAttestationPdf(
  data: AttestationData
): Promise<{ pdfBytes: Uint8Array; filename: string }> {
  const today = new Date()
  const todayStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`

  const nom = data.tenant_last_name.toUpperCase()
  const prenom = data.tenant_first_name
  const titleRaw = (data.tenant_title ?? '').toUpperCase().replace('.', '')
  const civilite = ['M', 'MR', 'MONSIEUR'].includes(titleRaw) ? 'M.' : 'Mme'

  const ownerDisplay = `${data.owner_first_name} ${data.owner_last_name.toUpperCase()}`.trim()

  let signingDateStr = '—'
  if (data.signing_date) {
    const sd = new Date(data.signing_date + 'T00:00:00Z')
    signingDateStr = `${pad(sd.getUTCDate())}/${pad(sd.getUTCMonth() + 1)}/${sd.getUTCFullYear()}`
  }

  const para1 = `Nous soussignés ${ownerDisplay} propriétaires de l'immeuble ${data.building_address}, attestons que ${civilite} ${prenom} ${nom} est locataire du logement n°${data.apartment_number} situé au ${data.building_address}, et ce depuis le ${signingDateStr}.`
  const para2 = `${civilite} ${nom} est à jour dans le paiement de ses loyers.`
  const para3 = `Fait pour valoir ce que de droit.`

  const filename = `${today.getFullYear()}-${pad(today.getMonth() + 1)}_AttestationLocation_${data.apartment_number}-${nom}.pdf`

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  const { width, height } = page.getSize()

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const margin = 70
  const maxWidth = width - margin * 2
  const bodySize = 11
  const titleSize = 16
  const lineHeight = 18

  let y = height - margin

  const titleText = 'ATTESTATION DE LOCATION'
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize)
  page.drawText(titleText, { x: (width - titleWidth) / 2, y, size: titleSize, font: fontBold, color: rgb(0, 0, 0) })
  page.drawLine({
    start: { x: (width - titleWidth) / 2, y: y - 2 },
    end: { x: (width + titleWidth) / 2, y: y - 2 },
    thickness: 1,
    color: rgb(0, 0, 0),
  })
  y -= titleSize + 34

  // Date ligne
  page.drawText(`Rouen, le ${todayStr}`, { x: margin, y, size: bodySize, font: fontReg, color: rgb(0, 0, 0) })
  y -= lineHeight + 22

  // Paragraphe 1
  const lines1 = wrapText(para1, fontReg, bodySize, maxWidth)
  for (const line of lines1) {
    page.drawText(line, { x: margin, y, size: bodySize, font: fontReg, color: rgb(0, 0, 0) })
    y -= lineHeight
  }
  // Paragraphe 2 (même bloc, pas de saut)
  const lines2 = wrapText(para2, fontReg, bodySize, maxWidth)
  for (const line of lines2) {
    page.drawText(line, { x: margin, y, size: bodySize, font: fontReg, color: rgb(0, 0, 0) })
    y -= lineHeight
  }
  y -= 22

  // Paragraphe 3
  page.drawText(para3, { x: margin, y, size: bodySize, font: fontReg, color: rgb(0, 0, 0) })
  y -= lineHeight + 28

  // Signature
  const sigFile = data.building_short_name === 'Vieux Palais'
    ? 'signature-francois.png'
    : 'signature-alaouimhammedi.png'
  const sigPath = path.join(process.cwd(), 'lib', 'signatures', sigFile)

  if (fs.existsSync(sigPath)) {
    const sigBytes = fs.readFileSync(sigPath)
    const sigImage = await pdfDoc.embedPng(sigBytes)
    const sigWidthPt = 227
    const sigHeightPt = sigWidthPt * (sigImage.height / sigImage.width)
    page.drawImage(sigImage, { x: margin, y: y - sigHeightPt, width: sigWidthPt, height: sigHeightPt })
  }

  const pdfBytes = await pdfDoc.save()
  return { pdfBytes, filename }
}

export async function createGmailDraftAttestation(
  data: AttestationData,
  pdfBytes: Uint8Array,
  filename: string
): Promise<string> {
  const to = data.tenant_email ?? ''
  const subject = `Attestation de location - Appartement ${data.apartment_number}`
  const body =
    `Bonjour,\n\n` +
    `Vous trouverez ci-joint votre attestation de location.\n\n` +
    `Cordialement,\n` +
    `Madame Clémentine ALAOUI M'HAMMEDI`

  const boundary = `----=_boundary_${Date.now()}`
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64')

  const headers: string[] = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ]
  if (data.guarantor_email) headers.push(`Cc: ${data.guarantor_email}`)

  const mime = [
    ...headers,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    body,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${filename}"`,
    ``,
    pdfBase64,
    ``,
    `--${boundary}--`,
  ].join('\r\n')

  const raw = Buffer.from(mime).toString('base64url')
  const auth = makeGoogleAuth()
  const gmail = google.gmail({ version: 'v1', auth })
  const draft = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } },
  })
  return draft.data.id ?? ''
}

// ─── Attestation de loyer CAF/MSA (CERFA 10842*07) ───────────────────────────
// Surimpression sur le gabarit officiel (lib/templates/attestation-loyer-cerfa.pdf),
// formulaire plat sans champs AcroForm — coordonnées calibrées manuellement.

export type AttestationLoyerCafData = {
  owner_title: string | null
  owner_first_name: string
  owner_last_name: string
  owner_address: string | null
  owner_phone: string | null
  owner_email: string | null
  owner_siret: string | null
  tenant_title: string | null
  tenant_last_name: string
  tenant_first_name: string
  tenant_email: string | null
  building_address: string
  building_short_name: string
  apartment_number: string
  surface_area: number | null
  move_in_date: string | null
  rent_excluding_charges: number
  charges: number
  rent_including_charges: number
  tenant_is_up_to_date: boolean
}

export async function getAttestationLoyerCafData(
  leaseId: string,
  tenantIsUpToDate: boolean
): Promise<AttestationLoyerCafData | null> {
  const rows = await runSqlAdmin<Omit<AttestationLoyerCafData, 'owner_siret' | 'tenant_is_up_to_date'>>(`
    SELECT DISTINCT ON (l.id)
      o.title              AS owner_title,
      o.first_name         AS owner_first_name,
      o.last_name          AS owner_last_name,
      o.personal_address   AS owner_address,
      o.phone              AS owner_phone,
      o.email              AS owner_email,
      t.title              AS tenant_title,
      t.last_name          AS tenant_last_name,
      t.first_name         AS tenant_first_name,
      t.email              AS tenant_email,
      b.address            AS building_address,
      b.short_name         AS building_short_name,
      a.number             AS apartment_number,
      a.surface_area,
      l.move_in_inspection_date::text AS move_in_date,
      a.rent_excluding_charges,
      a.charges,
      a.rent_including_charges
    FROM leases l
    JOIN apartments a     ON a.id = l.apartment_id
    JOIN buildings b      ON b.id = a.building_id
    JOIN owners o         ON o.id = b.owner_id
    JOIN lease_tenants lt ON lt.lease_id = l.id
    JOIN tenants t        ON t.id = lt.tenant_id
    WHERE l.id = '${leaseId}'
    ORDER BY l.id, t.last_name
    LIMIT 1
  `)
  if (!rows[0]) return null

  // siret ajouté par une migration ultérieure — best-effort
  const siretRows = await runSqlAdmin<{ owner_siret: string | null }>(`
    SELECT o.siret AS owner_siret
    FROM leases l
    JOIN apartments a ON a.id = l.apartment_id
    JOIN buildings b  ON b.id = a.building_id
    JOIN owners o     ON o.id = b.owner_id
    WHERE l.id = '${leaseId}'
    LIMIT 1
  `).catch(() => [] as { owner_siret: string | null }[])

  return {
    ...rows[0],
    owner_siret: siretRows[0]?.owner_siret ?? null,
    tenant_is_up_to_date: tenantIsUpToDate,
  }
}

export async function generateAttestationLoyerCafPdf(
  data: AttestationLoyerCafData
): Promise<{ pdfBytes: Uint8Array; filename: string }> {
  const today = new Date()
  const nom = data.tenant_last_name.toUpperCase()
  const prenom = data.tenant_first_name
  const titleRaw = (data.tenant_title ?? '').toUpperCase().replace('.', '')
  const civilite = ['M', 'MR', 'MONSIEUR'].includes(titleRaw) ? 'M.' : 'Mme'

  const ownerDisplay = `${data.owner_title ?? ''} ${data.owner_first_name} ${data.owner_last_name.toUpperCase()}`.trim()

  let moveInDateStr = ''
  let moisEntree = ''
  if (data.move_in_date) {
    const d = new Date(data.move_in_date + 'T00:00:00Z')
    moveInDateStr = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
    moisEntree = `${MOIS_FR[d.getUTCMonth() + 1]} ${d.getUTCFullYear()}`
  }

  const filename = `${today.getFullYear()}-${pad(today.getMonth() + 1)}_AttestationLoyerCAF_${data.apartment_number}-${nom}.pdf`

  const templatePath = path.join(process.cwd(), 'lib', 'templates', 'attestation-loyer-cerfa.pdf')
  const templateBytes = fs.readFileSync(templatePath)
  const pdfDoc = await PDFDocument.load(templateBytes)
  const page = pdfDoc.getPage(0)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const draw = (text: string, x: number, y: number, size = 8) =>
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0.55) })
  const drawX = (x: number, y: number) =>
    page.drawText('X', { x, y, size: 9, font: fontBold, color: rgb(0, 0, 0.55) })

  draw(ownerDisplay, 400, 719)
  if (data.owner_address) draw(data.owner_address, 80, 706.5)
  if (data.owner_phone) draw(data.owner_phone, 112, 693.5)
  if (data.owner_email) draw(data.owner_email, 320, 680.5)
  if (data.owner_siret) draw(data.owner_siret, 85, 667.5)

  draw(`${civilite} ${prenom} ${nom}`, 240, 654.5, 7)
  draw(moveInDateStr, 188, 641.5)
  draw(`Appartement n°${data.apartment_number}, ${data.building_address}`, 35, 628.5)

  drawX(286, 613.5) // chambre : non
  if (data.surface_area != null) draw(String(data.surface_area), 240, 602.5)
  drawX(273, 587.5) // colocation : non

  draw(moisEntree, 315, 563.5)
  draw(data.rent_excluding_charges.toFixed(2), 160, 550.5)
  draw(data.charges.toFixed(2), 302, 550.5)
  draw(data.rent_including_charges.toFixed(2), 500, 550.5)

  draw(String(today.getFullYear()), 245, 524.5)
  draw(data.rent_excluding_charges.toFixed(2), 160, 511.5)
  draw(data.charges.toFixed(2), 302, 511.5)
  draw(data.rent_including_charges.toFixed(2), 500, 511.5)

  drawX(data.tenant_is_up_to_date ? 357 : 393, 496.5) // à jour : oui/non

  drawX(203, 470.5) // sous-location : non
  drawX(276, 444.5) // hôtel/pension de famille : non
  drawX(363, 301.5) // décence : oui

  draw('Rouen', 55, 189, 9)
  draw(`${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`, 215, 189, 9)

  const sigFile = data.building_short_name === 'Vieux Palais'
    ? 'signature-francois.png'
    : 'signature-alaouimhammedi.png'
  const sigPath = path.join(process.cwd(), 'lib', 'signatures', sigFile)
  if (fs.existsSync(sigPath)) {
    const sigBytes = fs.readFileSync(sigPath)
    const sigImage = await pdfDoc.embedPng(sigBytes)
    const sigWidthPt = 100
    const sigHeightPt = sigWidthPt * (sigImage.height / sigImage.width)
    page.drawImage(sigImage, { x: 450, y: 156, width: sigWidthPt, height: sigHeightPt })
  }

  const pdfBytes = await pdfDoc.save()
  return { pdfBytes, filename }
}

export async function createGmailDraftAttestationLoyerCaf(
  data: AttestationLoyerCafData,
  pdfBytes: Uint8Array,
  filename: string
): Promise<string> {
  const to = data.tenant_email ?? ''
  const subject = `Attestation de loyer CAF - Appartement ${data.apartment_number}`
  const body =
    `Bonjour,\n\n` +
    `Vous trouverez ci-joint votre attestation de loyer à destination de la CAF.\n\n` +
    `Cordialement,\n` +
    `Madame Clémentine ALAOUI M'HAMMEDI`

  const boundary = `----=_boundary_${Date.now()}`
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64')

  const mime = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    body,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${filename}"`,
    ``,
    pdfBase64,
    ``,
    `--${boundary}--`,
  ].join('\r\n')

  const raw = Buffer.from(mime).toString('base64url')
  const auth = makeGoogleAuth()
  const gmail = google.gmail({ version: 'v1', auth })
  const draft = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } },
  })
  return draft.data.id ?? ''
}

// ─── Google auth (Drive + Calendar + Gmail) ──────────────────────────────────
// GMAIL_REFRESH_TOKEN couvre les 3 scopes : drive, calendar, gmail.compose

function makeGoogleAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  return auth
}

// ─── Helpers Drive ────────────────────────────────────────────────────────────

async function findTenantFolder(drive: ReturnType<typeof google.drive>, aptNumber: string, tenantLastName: string) {
  const parentId = process.env.GDRIVE_TENANTS_FOLDER_ID
  if (!parentId) return null
  // Nomenclature dossier : "{aptNum}_{NOM_EN_MAJUSCULES}"
  const searchName = `${aptNumber}_${tenantLastName.toUpperCase()}`
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name contains '${searchName}' and trashed = false`,
    fields: 'files(id, name, webViewLink)',
    pageSize: 5,
  })
  return res.data.files?.[0] ?? null
}

// ─── Google Drive — lien vers le bail du locataire ───────────────────────────

export async function getDriveTenantFolderUrl(
  aptNumber: string,
  tenantLastName: string
): Promise<string | null> {
  try {
    const auth = makeGoogleAuth()
    const drive = google.drive({ version: 'v3', auth })
    const folder = await findTenantFolder(drive, aptNumber, tenantLastName)
    if (!folder?.id) return null

    // Nomenclature fichier bail : "_Bail_"
    const fileRes = await drive.files.list({
      q: `'${folder.id}' in parents and name contains '_Bail_' and trashed = false`,
      fields: 'files(id, webViewLink)',
      pageSize: 1,
    })
    const file = fileRes.data.files?.[0]
    return file?.webViewLink ?? folder.webViewLink ?? null
  } catch {
    return null
  }
}

// ─── Google Drive — lien vers le PDF d'état des lieux d'entrée ───────────────

export async function getDriveEdlEntryUrl(
  aptNumber: string,
  tenantLastName: string
): Promise<string | null> {
  try {
    const auth = makeGoogleAuth()
    const drive = google.drive({ version: 'v3', auth })
    const folder = await findTenantFolder(drive, aptNumber, tenantLastName)
    if (!folder?.id) return null

    // Nomenclature fichier EDL : "_EDLInventaire_"
    // Le plus ancien = EDL d'entrée, le plus récent = EDL de sortie
    const fileRes = await drive.files.list({
      q: `'${folder.id}' in parents and name contains '_EDLInventaire_' and trashed = false`,
      fields: 'files(id, name, webViewLink, createdTime)',
      pageSize: 10,
      orderBy: 'createdTime asc',
    })
    const files = fileRes.data.files ?? []
    if (files.length === 0) return null
    return files[0].webViewLink ?? null
  } catch {
    return null
  }
}

// ─── Google Drive — enregistrer le PDF d'EDL figé dans le dossier locataire ──

export async function uploadEdlFigePdfToDrive(opts: {
  aptNumber: string
  tenantLastName: string
  filename: string
  pdfBytes: Uint8Array
}): Promise<{ ok: boolean; webViewLink?: string; error?: string }> {
  try {
    const auth = makeGoogleAuth()
    const drive = google.drive({ version: 'v3', auth })
    const folder = await findTenantFolder(drive, opts.aptNumber, opts.tenantLastName)
    if (!folder?.id) return { ok: false, error: 'Dossier locataire introuvable sur Google Drive' }

    const created = await drive.files.create({
      requestBody: { name: `${opts.filename}.pdf`, parents: [folder.id] },
      media: { mimeType: 'application/pdf', body: Readable.from(Buffer.from(opts.pdfBytes)) },
      fields: 'id, webViewLink',
    })
    return { ok: true, webViewLink: created.data.webViewLink ?? undefined }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

// ─── Google Drive — déplacer dossier locataire vers Archive ──────────────────

export async function moveTenantFolderToArchive(
  aptNumber: string,
  tenantLastName: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const tenantsRootId = process.env.GDRIVE_TENANTS_FOLDER_ID
    if (!tenantsRootId) return { ok: false, error: 'GDRIVE_TENANTS_FOLDER_ID manquant' }

    const auth = makeGoogleAuth()
    const drive = google.drive({ version: 'v3', auth })

    // 1. Trouver le dossier du locataire
    const tenantFolder = await findTenantFolder(drive, aptNumber, tenantLastName)
    if (!tenantFolder?.id) return { ok: false, error: 'Dossier locataire introuvable sur Google Drive' }

    // 2. Trouver ou créer le sous-dossier "Archive" dans le dossier locataires
    const archiveRes = await drive.files.list({
      q: `'${tenantsRootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = 'Archive' and trashed = false`,
      fields: 'files(id)',
      pageSize: 1,
    })
    let archiveFolderId = archiveRes.data.files?.[0]?.id
    if (!archiveFolderId) {
      const created = await drive.files.create({
        requestBody: {
          name: 'Archive',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [tenantsRootId],
        },
        fields: 'id',
      })
      archiveFolderId = created.data.id!
    }

    // 3. Déplacer le dossier locataire dans Archive
    await drive.files.update({
      fileId: tenantFolder.id,
      addParents: archiveFolderId,
      removeParents: tenantsRootId,
      fields: 'id, parents',
    })

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

// ─── Make.com — déclenchement du scénario de signature de l'EDL figé ─────────

export async function triggerEdlSignatureWebhook(opts: {
  apartmentNumber: string
  tenantLastName: string
  edlType: 'entree' | 'sortie'
  edlDate: string | null
  filename: string
  pageCount: number
  webViewLink?: string
}): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.MAKE_EDL_SIGNATURE_WEBHOOK_URL
  if (!url) return { ok: false, error: 'Webhook Make.com non configuré (MAKE_EDL_SIGNATURE_WEBHOOK_URL manquant)' }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apartmentNumber: opts.apartmentNumber,
        tenantLastName: opts.tenantLastName,
        edlType: opts.edlType,
        edlDate: opts.edlDate,
        filename: opts.filename,
        pageCount: opts.pageCount,
        webViewLink: opts.webViewLink ?? null,
      }),
    })
    if (!res.ok) return { ok: false, error: `Make.com a répondu ${res.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

// ─── Make.com — déclenchement du scénario à l'acceptation d'un candidat ─────

export async function triggerCandidateAcceptedWebhook(opts: {
  apartmentNumber: string
  candidateFirstName: string
  candidateLastName: string
  candidateEmail: string | null
  candidatePhone: string | null
  hasGuarantor: boolean
  guarantorFirstName: string | null
  guarantorLastName: string | null
  guarantorEmail: string | null
  signingDate: string
  endDate: string
  rentCC: number
  filename: string
  webViewLink?: string
}): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.MAKE_CANDIDATE_ACCEPTED_WEBHOOK_URL
  if (!url) return { ok: false, error: 'Webhook Make.com non configuré (MAKE_CANDIDATE_ACCEPTED_WEBHOOK_URL manquant)' }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apartmentNumber: opts.apartmentNumber,
        candidateFirstName: opts.candidateFirstName,
        candidateLastName: opts.candidateLastName,
        candidateEmail: opts.candidateEmail,
        candidatePhone: opts.candidatePhone,
        hasGuarantor: opts.hasGuarantor,
        guarantorFirstName: opts.guarantorFirstName,
        guarantorLastName: opts.guarantorLastName,
        guarantorEmail: opts.guarantorEmail,
        signingDate: opts.signingDate,
        endDate: opts.endDate,
        rentCC: opts.rentCC,
        filename: opts.filename,
        webViewLink: opts.webViewLink ?? null,
      }),
    })
    if (!res.ok) return { ok: false, error: `Make.com a répondu ${res.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

// ─── Google Calendar — événement état des lieux d'entrée (créé au moment du préavis) ──

export async function createCalendarPreavisEvent(opts: {
  leaseId: string
  aptNumber: string
  moveOutDate: string  // YYYY-MM-DD — date de l'état des lieux (sortie = entrée du suivant)
}): Promise<void> {
  const calId = process.env.GCAL_GESTION_LOCATIVE_ID
  if (!calId) return

  // Fetch all lease data needed for the calendar event
  type LeaseRow = {
    tenant_first_name: string
    tenant_last_name: string
    tenant_phone: string | null
    signing_date: string | null
    deposit: number | null
    lease_type: string | null
    guarantor_last_name: string | null
    guarantor_first_name: string | null
    guarantor_phone: string | null
  }
  const rows = await runSqlAdmin<LeaseRow>(`
    SELECT
      t.first_name      AS tenant_first_name,
      t.last_name       AS tenant_last_name,
      t.phone           AS tenant_phone,
      l.signing_date::text AS signing_date,
      l.deposit,
      l.lease_type::text AS lease_type,
      g.last_name       AS guarantor_last_name,
      g.first_name      AS guarantor_first_name,
      g.phone           AS guarantor_phone
    FROM leases l
    JOIN lease_tenants lt ON lt.lease_id = l.id
    JOIN tenants t ON t.id = lt.tenant_id
    LEFT JOIN guarantors g ON g.tenant_id = t.id
    WHERE l.id = '${opts.leaseId}'
    LIMIT 1
  `)
  const row = rows[0]
  if (!row) return

  const hasGuarantor = !!row.guarantor_last_name
  const guarantorName = hasGuarantor
    ? `${row.guarantor_first_name ?? ''} ${row.guarantor_last_name ?? ''}`.trim()
    : 'aucun'

  const description = [
    `Appartement : ${opts.aptNumber}`,
    `Locataire : ${row.tenant_first_name} ${row.tenant_last_name}`,
    `Téléphone : ${row.tenant_phone ?? ''}`,
    `Date signature bail : ${(row.signing_date ?? '').slice(0, 10)}`,
    `Garant : ${hasGuarantor ? 'Oui' : 'Non'}`,
    `Nom garant : ${guarantorName}`,
    `Téléphone garant : ${row.guarantor_phone ?? 'aucun'}`,
    `Caution : ${row.deposit ?? ''} €`,
    `Type bail : ${row.lease_type ?? ''}`,
  ].join('\n')

  const auth = makeGoogleAuth()
  const calendar = google.calendar({ version: 'v3', auth })

  await calendar.events.insert({
    calendarId: calId,
    requestBody: {
      summary: `Etat des lieux de sortie ${opts.aptNumber} ${row.tenant_last_name.toUpperCase()}`,
      description,
      start: { dateTime: `${opts.moveOutDate}T14:00:00`, timeZone: 'Europe/Paris' },
      end:   { dateTime: `${opts.moveOutDate}T14:30:00`, timeZone: 'Europe/Paris' },
    },
  })
}

// ─── Google Calendar — événement de visite ───────────────────────────────────

export async function createVisitCalendarEvent(opts: {
  visitorEmail: string
  visitorName: string
  visitorPhone: string
  visitorComment: string
  visitDate: string          // YYYY-MM-DD
  visitTime: string          // HH:MM
  slotDurationMinutes: number
  buildingShortName: string
  buildingAddress: string
  apartmentNumbers: string[]
  contact: {
    contact_name: string | null
    contact_email: string | null
    contact_phone: string | null
    contact_website: string | null
  }
}): Promise<void> {
  const calId = process.env.GCAL_GESTION_LOCATIVE_ID
  if (!calId) return

  const [h, m] = opts.visitTime.split(':').map(Number)
  const startDateTime = `${opts.visitDate}T${opts.visitTime}:00`
  const endMins = h * 60 + m + opts.slotDurationMinutes
  const endH = Math.floor(endMins / 60)
  const endM = endMins % 60
  const endDateTime = `${opts.visitDate}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`

  const contactLines = [
    opts.contact.contact_name,
    opts.contact.contact_phone,
    opts.contact.contact_email,
    opts.contact.contact_website,
  ].filter(Boolean).join('\n')

  const visitorLines = [opts.visitorName, opts.visitorPhone, opts.visitorEmail]
    .filter(Boolean).join('\n')

  const descriptionParts = [
    `Visite programmée appartement(s) : ${opts.apartmentNumbers.join(', ')}`,
    ...(opts.visitorComment ? [`\nCommentaire : ${opts.visitorComment}`] : []),
    '',
    `Votre contact :\n${contactLines}`,
    "Appelez lorsque vous êtes arrivé(e) devant l'immeuble.",
    'Par respect pour la personne qui vous accueillera, merci de prévenir de toute modification.',
    '',
    `Les coordonnées que vous nous avez communiqué pour vous joindre:\n${visitorLines}`,
    '',
    'Informations utiles :',
    "Il n'est pas nécessaire d'apporter votre dossier locatif le jour de la visite. Vous pourrez ultérieurement déposer toutes vos pièces justificatives en ligne.",
    'Conditions indispensables : être étudiant, gagner 3 fois le loyer ou avoir un garant qui gagne 3 fois le loyer.',
  ]
  const description = descriptionParts.join('\n')

  const attendees = [{ email: opts.visitorEmail }]
  if (opts.contact.contact_email) attendees.unshift({ email: opts.contact.contact_email })

  const auth = makeGoogleAuth()
  const calendar = google.calendar({ version: 'v3', auth })

  await calendar.events.insert({
    calendarId: calId,
    requestBody: {
      summary: `Visite Appartement ${opts.buildingShortName}`,
      description,
      location: opts.buildingAddress,
      start: { dateTime: startDateTime, timeZone: 'Europe/Paris' },
      end:   { dateTime: endDateTime,   timeZone: 'Europe/Paris' },
      attendees,
    },
  })
}

// ─── Google Drive — upload candidat ──────────────────────────────────────────

async function getOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  parentId: string,
  folderName: string
): Promise<string> {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`,
    fields: 'files(id)',
    pageSize: 1,
  })
  const existing = res.data.files?.[0]
  if (existing?.id) return existing.id

  const created = await drive.files.create({
    requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  })
  return created.data.id!
}

export async function uploadCandidateDocuments(opts: {
  aptNumber: string
  candidateLastName: string
  candidateFiles: { name: string; type: string; buffer: Buffer }[]
  guarantorFiles: { name: string; type: string; buffer: Buffer }[]
}): Promise<{ candidateUrls: string[]; guarantorUrls: string[] }> {
  const rootId = process.env.GDRIVE_CANDIDATES_FOLDER_ID
  if (!rootId) throw new Error('GDRIVE_CANDIDATES_FOLDER_ID manquant dans .env.local')

  const auth = makeGoogleAuth()
  const drive = google.drive({ version: 'v3', auth })

  const tenantFolderName = `${opts.aptNumber}-${opts.candidateLastName.toUpperCase()}`
  const tenantFolderId = await getOrCreateFolder(drive, rootId, tenantFolderName)
  const justifFolderId = await getOrCreateFolder(drive, tenantFolderId, 'justificatifs')
  const candidateFolderId = await getOrCreateFolder(drive, justifFolderId, 'candidate')

  async function uploadFile(folderId: string, file: { name: string; type: string; buffer: Buffer }): Promise<string> {
    const res = await drive.files.create({
      requestBody: { name: file.name, parents: [folderId] },
      media: { mimeType: file.type, body: Readable.from(file.buffer) },
      fields: 'webViewLink',
    })
    return res.data.webViewLink ?? ''
  }

  const candidateUrls = await Promise.all(
    opts.candidateFiles.map(f => uploadFile(candidateFolderId, f))
  )

  let guarantorUrls: string[] = []
  if (opts.guarantorFiles.length > 0) {
    const guarantorFolderId = await getOrCreateFolder(drive, justifFolderId, 'guarantor')
    guarantorUrls = await Promise.all(
      opts.guarantorFiles.map(f => uploadFile(guarantorFolderId, f))
    )
  }

  return { candidateUrls, guarantorUrls }
}

// ─── Google Drive — déplacer dossier candidat vers locataires ─────────────────
// Conserve le même nom {aptNum}-NOM, change uniquement le dossier parent

export async function moveCandidateFolderToTenants(opts: {
  aptNumber: string
  candidateLastName: string
}): Promise<void> {
  const candidatesRootId = process.env.GDRIVE_CANDIDATES_FOLDER_ID
  const tenantsRootId = process.env.GDRIVE_TENANTS_FOLDER_ID
  if (!candidatesRootId || !tenantsRootId) return

  const auth = makeGoogleAuth()
  const drive = google.drive({ version: 'v3', auth })

  // Trouver le dossier source dans /candidats
  const srcName = `${opts.aptNumber}-${opts.candidateLastName.toUpperCase()}`
  const srcRes = await drive.files.list({
    q: `'${candidatesRootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${srcName}' and trashed = false`,
    fields: 'files(id)',
    pageSize: 1,
  })
  const srcFolder = srcRes.data.files?.[0]
  if (!srcFolder?.id) return  // dossier pas trouvé — non bloquant

  // Déplacer dans /locataires (addParents + removeParents) — même nom {aptNum}-NOM
  await drive.files.update({
    fileId: srcFolder.id,
    addParents: tenantsRootId,
    removeParents: candidatesRootId,
    fields: 'id',
  })
}

// ─── Génération PDF bail depuis template Google Docs ─────────────────────────
//
// Placeholders dans les templates (format {{champ}}) lus depuis Google Docs :
//   {{type_contrat}} {{residence}} {{num_appt}} {{etage}} {{start_date}} {{end_date}} {{duree_bail}}
//   {{adresse_logement}}
//   {{civilite_bailleur}} {{prenom_bailleur}} {{nom_bailleur}} {{adresse_bailleur}}
//   {{civilite}} {{nom}} {{prenom}} {{etat_civil}} {{date_naissance}} {{lieu_naissance}}
//   {{adresse}} {{telephone}} {{email}} {{surface}} {{description_appartement}}
//   {{chaudiere_compteurs}} {{equipements_tech}}
//   {{loyerhcchiffres}} {{loyerhclettres}} {{chargeschiffres}} {{chargeslettres}}
//   {{cautionchiffres}} {{cautionlettres}} {{irl_date}} {{irl_value}}
//   (avec garant) : {{civilite_garant}} {{nom_garant}} {{prenom_garant}} {{adresse_garant}}
//                   {{loyerccchiffres}} {{loyercclettres}}
//
// IRL : utilise BAIL_IRL_DATE / BAIL_IRL_VALUE si définis dans .env, sinon appel API INSEE
// IDs templates (surchargeables via GDOCS_BAIL_SANS_GARANT_ID / GDOCS_BAIL_AVEC_GARANT_ID) :
const BAIL_TEMPLATE_SANS_GARANT = process.env.GDOCS_BAIL_SANS_GARANT_ID ?? '1AAXh1epC9e1sK1AGjGFmeCfL2FVVP2RiFba76RK4bOw'
const BAIL_TEMPLATE_AVEC_GARANT = process.env.GDOCS_BAIL_AVEC_GARANT_ID ?? '1B4s9FYNebcF2R9Tzr7xbh-mgK4p8l-DetMVSZ9GVFWU'

function fmtFrDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}


// Conversion nombre entier → lettres françaises (pour les montants de loyer)
function nombreEnLettres(n: number): string {
  if (n === 0) return 'zéro'
  const U = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
    'dix-sept', 'dix-huit', 'dix-neuf']
  function belowHundred(x: number): string {
    if (x < 20) return U[x]
    const d = Math.floor(x / 10), u = x % 10
    if (d === 7) return 'soixante-' + U[10 + u]
    if (d === 8) return u === 0 ? 'quatre-vingts' : 'quatre-vingt-' + U[u]
    if (d === 9) return 'quatre-vingt-' + U[10 + u]
    const t = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'][d]
    return u === 0 ? t : t + (u === 1 ? ' et un' : '-' + U[u])
  }
  let res = '', rem = n
  if (rem >= 1000) {
    const k = Math.floor(rem / 1000)
    res += k === 1 ? 'mille ' : nombreEnLettres(k) + ' mille '
    rem %= 1000
  }
  if (rem >= 100) {
    const c = Math.floor(rem / 100), r = rem % 100
    res += c === 1 ? 'cent' : U[c] + ' cent'
    res += r === 0 && c > 1 ? 's ' : r > 0 ? ' ' : ' '
    rem = r
  }
  if (rem > 0) res += belowHundred(rem)
  return res.trim()
}

// Récupère le dernier IRL depuis l'API SDMX INSEE (pas d'auth requise)
async function fetchIrlFromInsee(): Promise<{ date: string; value: string }> {
  const res = await fetch(
    'https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/001515333?lastNObservations=1',
    { next: { revalidate: 86400 } } as RequestInit  // cache 24 h côté Next.js
  )
  if (!res.ok) throw new Error(`INSEE API ${res.status}`)
  const xml = await res.text()

  const periodMatch = xml.match(/ObsDimension[^>]+value="(\d{4})-Q(\d)"/)
  const valueMatch  = xml.match(/ObsValue[^>]+value="([\d.]+)"/)
  if (!periodMatch || !valueMatch) throw new Error('Format INSEE inattendu')

  const year    = periodMatch[1]
  const quarter = parseInt(periodMatch[2])
  const labels  = ['', '1er', '2e', '3e', '4e']
  return {
    date:  `${labels[quarter]} trimestre ${year}`,
    value: valueMatch[1].replace('.', ','),
  }
}

function montantEnLettres(montant: number): string {
  const entier = Math.floor(montant)
  const cents = Math.round((montant - entier) * 100)
  let res = nombreEnLettres(entier) + (entier > 1 ? ' euros' : ' euro')
  if (cents > 0) res += ' et ' + nombreEnLettres(cents) + (cents > 1 ? ' centimes' : ' centime')
  return res
}

export async function generateBailAndUploadToDrive(opts: {
  aptNumber: string
  signingDate: string    // YYYY-MM-DD
  endDate: string        // YYYY-MM-DD
  rentCC: number
  rentHC: number | null
  charges: number | null
  deposit: number
  tenantTitle: string | null
  tenantFirstName: string
  tenantLastName: string
  tenantEmail: string | null
  tenantPhone: string | null
  tenantBirthDate: string | null
  tenantBirthPlace: string | null
  tenantAddress: string | null
  tenantFamilyStatus: string | null
  guarantorTitle: string | null
  guarantorFirstName: string | null
  guarantorLastName: string | null
  guarantorEmail: string | null
  guarantorPhone: string | null
  guarantorBirthDate: string | null
  guarantorBirthPlace: string | null
  guarantorAddress: string | null
}): Promise<{ filename: string; webViewLink?: string }> {
  const candidatesRootId = process.env.GDRIVE_CANDIDATES_FOLDER_ID
  if (!candidatesRootId) throw new Error('Google Drive non configuré (GDRIVE_CANDIDATES_FOLDER_ID manquant)')

  const hasGuarantor = !!opts.guarantorLastName
  const templateId = hasGuarantor ? BAIL_TEMPLATE_AVEC_GARANT : BAIL_TEMPLATE_SANS_GARANT

  // 1. Données appartement + bailleur
  type AptRow = {
    apt_type: string | null
    surface_area: number | null
    floor_label: string | null
    building_address: string
    description: string | null
    owner_title: string | null
    owner_first_name: string | null
    owner_last_name: string | null
    owner_address: string | null
    owner_phone: string | null
    owner_email: string | null
  }
  const aptRows = await runSqlAdmin<AptRow>(`
    SELECT a.type AS apt_type, a.surface_area, a.floor_label, b.address AS building_address,
           a.description,
           o.title            AS owner_title,
           o.first_name       AS owner_first_name,
           o.last_name        AS owner_last_name,
           o.personal_address AS owner_address,
           o.phone            AS owner_phone,
           o.email            AS owner_email
    FROM apartments a
    JOIN buildings b ON b.id = a.building_id
    LEFT JOIN owners o ON o.id = b.owner_id
    WHERE a.number = '${opts.aptNumber}'
    LIMIT 1
  `)
  const apt = aptRows[0]
  if (!apt) throw new Error(`Appartement ${opts.aptNumber} introuvable pour la génération du bail`)

  // Données d'état civil du bailleur (colonnes ajoutées par migration 20260703)
  // Résilient si la migration n'a pas encore été appliquée.
  let ownerEtatCivil: string | null = null
  let ownerBirthDate: string | null = null
  let ownerBirthPlace: string | null = null
  try {
    type ExtRow = { etat_civil: string | null; birth_date: string | null; birth_place: string | null }
    const extRows = await runSqlAdmin<ExtRow>(`
      SELECT o.etat_civil, o.birth_date::text AS birth_date, o.birth_place
      FROM apartments a
      JOIN buildings b ON b.id = a.building_id
      LEFT JOIN owners o ON o.id = b.owner_id
      WHERE a.number = '${opts.aptNumber}'
      LIMIT 1
    `)
    if (extRows[0]) {
      ownerEtatCivil = extRows[0].etat_civil
      ownerBirthDate = extRows[0].birth_date
      ownerBirthPlace = extRows[0].birth_place
    }
  } catch {
    // Colonnes pas encore migrées — on continue sans ces données
  }
  const ownerNee = apt.owner_title === 'M.' ? 'né' : 'née'

  // 2. Champs calculés
  const r = (v: string | null | undefined) => v ?? ''
  const ownerFullName = `${r(apt.owner_first_name)} ${apt.owner_last_name ? apt.owner_last_name.toUpperCase() : ''}`.trim()
  const rentHC    = opts.rentHC    ?? 0
  const charges   = opts.charges   ?? 0
  const deposit   = opts.deposit   ?? 0

  const replacements: Record<string, string> = {
    // Bail
    type_contrat:              'Classique',
    residence:                 'Principale',
    num_appt:                  opts.aptNumber === '1000' ? '' : opts.aptNumber,
    etage:                     r(apt.floor_label),
    start_date:                fmtFrDate(opts.signingDate),
    end_date:                  fmtFrDate(opts.endDate),
    duree_bail:                '1 an',
    // Logement
    adresse_logement:          apt.building_address,
    // Bailleur (owner de l'immeuble)
    civilite_bailleur:         r(apt.owner_title),
    prenom_bailleur:           r(apt.owner_first_name),
    nom_bailleur:              apt.owner_last_name ? apt.owner_last_name.toUpperCase() : '',
    adresse_bailleur:          r(apt.owner_address),
    etat_civil_bailleur:       ownerEtatCivil ?? '',
    naissance_bailleur:        ownerBirthDate && ownerBirthPlace
                                 ? `${ownerNee} le ${fmtShortDate(ownerBirthDate)} à ${ownerBirthPlace}`
                                 : '',
    signature_bailleur:        `${r(apt.owner_title)} ${ownerFullName}`.trim(),
    // Locataire
    civilite:                  r(opts.tenantTitle),
    nom:                       opts.tenantLastName.toUpperCase(),
    prenom:                    opts.tenantFirstName,
    etat_civil:                r(opts.tenantFamilyStatus),
    date_naissance:            fmtFrDate(opts.tenantBirthDate),
    lieu_naissance:            r(opts.tenantBirthPlace),
    adresse:                   r(opts.tenantAddress),
    telephone:                 r(opts.tenantPhone),
    email:                     r(opts.tenantEmail),
    // Appartement
    surface:                   apt.surface_area != null ? String(apt.surface_area) : '',
    description_appartement:   r(apt.description),
    // Équipements — remplacent les paragraphes correspondants dans le template
    chaudiere_compteurs:       'Le bien est équipé d\'un système de production de chauffage individuel à l\'électricité.\nLe bien est équipé d\'un système de production d\'eau chaude sanitaire individuel à l\'électricité.\nLa répartition de la consommation du locataire se fera de la manière suivante : Forfait de charges incluant l\'eau froide, les charges de syndic imputables au locataire et la taxe d\'ordures ménagères.',
    equipements_tech:          'Fibre optique\nL\'immeuble est soumis au statut de la copropriété.',
    // Montants (chiffres)
    loyerhcchiffres:           String(rentHC),
    chargeschiffres:           String(charges),
    cautionchiffres:           String(deposit),
    loyerccchiffres:           String(opts.rentCC),
    // Montants (lettres)
    loyerhclettres:            montantEnLettres(rentHC),
    chargeslettres:            montantEnLettres(charges),
    cautionlettres:            montantEnLettres(deposit),
    loyercclettres:            montantEnLettres(opts.rentCC),
    // IRL — rempli ci-dessous
    irl_date:                  '',
    irl_value:                 '',
    // Garant
    civilite_garant:           r(opts.guarantorTitle),
    nom_garant:                opts.guarantorLastName ? opts.guarantorLastName.toUpperCase() : '',
    prenom_garant:             r(opts.guarantorFirstName),
    adresse_garant:            r(opts.guarantorAddress),
  }

  // 2b. IRL : variables d'env prioritaires (valeur fixée), sinon appel INSEE
  if (process.env.BAIL_IRL_DATE && process.env.BAIL_IRL_VALUE) {
    replacements.irl_date  = process.env.BAIL_IRL_DATE
    replacements.irl_value = process.env.BAIL_IRL_VALUE
  } else {
    try {
      const irl = await fetchIrlFromInsee()
      replacements.irl_date  = irl.date
      replacements.irl_value = irl.value
    } catch {
      replacements.irl_date  = ''
      replacements.irl_value = ''
    }
  }

  const auth = makeGoogleAuth()
  const drive = google.drive({ version: 'v3', auth })
  const docs  = google.docs({ version: 'v1', auth })

  // 3. Copie temporaire du template
  const copyRes = await drive.files.copy({
    fileId: templateId,
    requestBody: { name: `_tmp_bail_${Date.now()}` },
    fields: 'id',
  })
  const tempId = copyRes.data.id!

  try {
    // 4. Remplacement des champs {{champ}} + texte hardcodé du template via Docs API
    //
    // Le template Google Docs contient des données de Clémentine ALAOUI M'HAMMEDI hardcodées
    // (adresse "9 rue du Moulinet", nom, état civil, téléphone, email).
    // replaceAllText cible le texte exact pour remplacer par les données de l'owner en DB.
    await docs.documents.batchUpdate({
      documentId: tempId,
      requestBody: {
        requests: [
          // Placeholders {{champ}}
          ...Object.entries(replacements).map(([key, value]) => ({
            replaceAllText: {
              containsText: { text: `{{${key}}}`, matchCase: true },
              replaceText: value,
            },
          })),
          // Adresse immeuble (hardcodée "9 rue du Moulinet" dans le template)
          {
            replaceAllText: {
              containsText: { text: '9 rue du Moulinet', matchCase: true },
              replaceText: apt.building_address,
            },
          },
          // Nom du bailleur (hardcodé "Clémentine ALAOUI M'HAMMEDI")
          {
            replaceAllText: {
              containsText: { text: "Clémentine ALAOUI M'HAMMEDI", matchCase: true },
              replaceText: ownerFullName,
            },
          },
          // Téléphone bailleur (hardcodé "06 28 07 67 29")
          {
            replaceAllText: {
              containsText: { text: '06 28 07 67 29', matchCase: true },
              replaceText: r(apt.owner_phone),
            },
          },
          // Email bailleur (hardcodé "location.moulinet@gmail.com")
          {
            replaceAllText: {
              containsText: { text: 'location.moulinet@gmail.com', matchCase: true },
              replaceText: r(apt.owner_email),
            },
          },
        ],
      },
    })

    // 5. Export PDF via Drive API
    const pdfRes = await drive.files.export(
      { fileId: tempId, mimeType: 'application/pdf' },
      { responseType: 'arraybuffer' }
    )
    const pdfBuffer = Buffer.from(pdfRes.data as ArrayBuffer)

    // 6. Trouver le dossier candidat dans /candidats
    const folderName = `${opts.aptNumber}-${opts.tenantLastName.toUpperCase()}`
    const folderRes = await drive.files.list({
      q: `'${candidatesRootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`,
      fields: 'files(id)',
      pageSize: 1,
    })
    const folderId = folderRes.data.files?.[0]?.id ?? candidatesRootId

    // 7. Upload du PDF dans le dossier candidat
    const filename = `${opts.signingDate}_Bail_${opts.aptNumber}-${opts.tenantLastName.toUpperCase()}.pdf`
    const created = await drive.files.create({
      requestBody: { name: filename, parents: [folderId] },
      media: { mimeType: 'application/pdf', body: Readable.from(pdfBuffer) },
      fields: 'id, webViewLink',
    })
    return { filename, webViewLink: created.data.webViewLink ?? undefined }
  } finally {
    // 8. Suppression de la copie temporaire (best-effort)
    await drive.files.delete({ fileId: tempId }).catch(() => {})
  }
}

// ─── Gmail draft ──────────────────────────────────────────────────────────────

export async function createGmailDraft(
  data: QuittanceData,
  year: number,
  month: number,
  pdfBytes: Uint8Array,
  filename: string
): Promise<string> {
  const moisFr = MOIS_FR[month]
  const to = data.tenant_email ?? ''

  const subject = data.building_short_name === 'Moulinet'
    ? `Quittance de loyer ${moisFr} ${year} - Appartement ${data.apartment_number} Moulinet`
    : `Quittance de loyer ${moisFr} ${year} - ${data.building_short_name}`

  const body =
    `Bonjour,\n\n` +
    `Veuillez trouver ci-joint votre quittance de loyer pour le mois de ${moisFr} ${year}.\n\n` +
    `Cordialement,\n` +
    `Mme ALAOUI M'HAMMEDI`

  // Build MIME message manually
  const boundary = `----=_boundary_${Date.now()}`
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64')

  const mime = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    body,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${filename}"`,
    ``,
    pdfBase64,
    ``,
    `--${boundary}--`,
  ].join('\r\n')

  const raw = Buffer.from(mime).toString('base64url')

  const auth = makeGoogleAuth()
  const gmail = google.gmail({ version: 'v1', auth })
  const draft = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } },
  })

  return draft.data.id ?? ''
}

// ─── Brouillon Gmail — confirmation préavis ───────────────────────────────────

export async function createGmailDraftPreavis(opts: {
  tenantEmail: string
  aptNumber: string
  buildingShortName: string
  buildingAddress: string
  endDate: string
  moveOutDate: string
  prorataAmount: number
  deposit: number | null
}): Promise<void> {
  const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

  const isMoulinet = opts.buildingShortName === 'Moulinet'

  const subject = isMoulinet
    ? `Préavis de sortie Appartement ${opts.aptNumber} - ${opts.buildingAddress}`
    : `Préavis de sortie - ${opts.buildingAddress}`

  const logementPhrase = isMoulinet
    ? `l'appartement ${opts.aptNumber} au ${opts.buildingAddress}`
    : `l'appartement au ${opts.buildingAddress}`

  const body = `<p>Bonjour,</p>
<p>Je vous confirme que j'ai bien reçu votre préavis de sortie pour ${logementPhrase}.</p>
<p>
<ul>
  <li>Date de fin du bail : ${fmtDate(opts.endDate)}</li>
  <li>Date souhaitée d'état des lieux : ${fmtDate(opts.moveOutDate)}</li>
</ul>
</p>
<p>Le loyer du dernier mois sera donc de ${opts.prorataAmount.toFixed(2)} €.</p>
<p>Nous prendrons prochainement rendez-vous pour un état des lieux et inventaire de sortie.</p>
<p>Le jour de l'état des lieux, l'appartement devra être nettoyé et vidé, et les petites réparations éventuelles effectuées. Sinon des frais de remise en état vous seront demandés. N'oubliez pas notamment les points suivants :
<ul>
  <li>Dégivrage frigo au moins 3 jours avant. Penser à mettre une serpillère dès que vous éteignez le frigo pour absorber l'eau qui va décongeler.</li>
  <li>Détartrer les toilettes (l'acide chlorhydrique fonctionne très bien).</li>
  <li>Détartrer bouilloire, machine à café…</li>
  <li>Changer les ampoules ou tout autre élément cassé.</li>
</ul>
</p>
${opts.deposit ? `<p>Si tout est ok, votre caution de ${opts.deposit} € vous sera rendue sous 1 mois maximum. Pensez à m'envoyer un RIB.</p>` : ''}
<p>Je reste à votre disposition pour toute question.</p>
<p>Cordialement</p>
<p>Mme ALAOUI M'HAMMEDI</p>`

  const mime = [
    `To: ${opts.tenantEmail}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(body).toString('base64'),
  ].join('\r\n')

  const raw = Buffer.from(mime).toString('base64url')
  const auth = makeGoogleAuth()
  const gmail = google.gmail({ version: 'v1', auth })
  await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } },
  })
}

// ─── Brouillon Gmail — informations d'arrivée après EDL d'entrée ─────────────

export async function createGmailDraftEdlEntree(tenantEmail: string): Promise<void> {
  const subject = EDL_ENTREE_EMAIL_SUBJECT
  const body = buildEdlEntreeEmailBody()

  const mime = [
    `To: ${tenantEmail}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(body).toString('base64'),
  ].join('\r\n')

  const raw = Buffer.from(mime).toString('base64url')
  const auth = makeGoogleAuth()
  const gmail = google.gmail({ version: 'v1', auth })
  await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } },
  })
}

// ─── Brouillon Gmail — confirmation d'acceptation d'un candidat ──────────────

const RIB_FILES: Record<string, string> = {
  'Moulinet':     'RIB_Moulinet.pdf',
  'Vieux Palais': 'RIB_VieuxPalais.pdf',
  'Renard':       'RIB_Renard.pdf',
  'Bons Enfants': 'RIB_BonsEnfants.pdf',
}

export async function createGmailDraftCandidateAccepted(opts: {
  candidateEmail: string
  aptNumber: string
  buildingShortName: string
  buildingAddress: string
  moveInDate: string  // YYYY-MM-DD
  rentCC: number
  firstMonthRent: number
  deposit: number
  hasGuarantor: boolean
}): Promise<void> {
  if (!opts.candidateEmail) return

  const dateFr = new Date(opts.moveInDate + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  const subject = `Confirmation de location - Appartement ${opts.aptNumber} - ${opts.buildingAddress}`

  const garantPhrase = opts.hasGuarantor
    ? ` Votre garant recevra aussi un mail et devra signer de son côté.`
    : ``

  const body = `<p>Bonjour,</p>
<p>Je vous remercie pour les informations et documents, je vous confirme donc mon accord pour la location de l'appartement ${opts.aptNumber} au ${opts.buildingAddress} à partir du ${dateFr}.</p>
<p>Je prépare votre bail, vous recevrez un mail du logiciel Docusign dans lequel il faudra cliquer pour signer en ligne le bail.${garantPhrase}</p>
<p>Je vous invite à prendre rendez-vous pour un état des lieux et inventaire avec le gestionnaire M. Micout au 07 82 95 02 78, cela prendra 15 minutes environ. Vous signerez également l'état des lieux en ligne. Il faudra souscrire une assurance habitation de votre côté démarrant au ${dateFr} et me donner l'attestation.</p>
<p>Enfin, il faudra verser avant le ${dateFr} le loyer du 1er mois de ${opts.firstMonthRent} € et la caution de ${opts.deposit} €. Vous trouverez ci-joint mon RIB. Les loyers suivants de ${opts.rentCC} € seront dûs chaque 1er du mois.</p>
<p>Je reste à votre disposition pour toute question,</p>
<p>Cordialement</p>
<p>Mme ALAOUI M'HAMMEDI</p>`

  const ribFile = RIB_FILES[opts.buildingShortName]
  const ribPath = ribFile ? path.join(process.cwd(), 'lib', 'ribs', ribFile) : null
  const ribBytes = ribPath && fs.existsSync(ribPath) ? fs.readFileSync(ribPath) : null

  const subjectHeader = `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`
  const bodyPart = [
    `Content-Type: text/html; charset="utf-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(body).toString('base64'),
  ].join('\r\n')

  let mime: string
  if (ribBytes) {
    const boundary = `----=_boundary_${Date.now()}`
    mime = [
      `To: ${opts.candidateEmail}`,
      subjectHeader,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      bodyPart,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${ribFile}"`,
      ``,
      ribBytes.toString('base64'),
      ``,
      `--${boundary}--`,
    ].join('\r\n')
  } else {
    mime = [
      `To: ${opts.candidateEmail}`,
      subjectHeader,
      `MIME-Version: 1.0`,
      bodyPart,
    ].join('\r\n')
  }

  const raw = Buffer.from(mime).toString('base64url')
  const auth = makeGoogleAuth()
  const gmail = google.gmail({ version: 'v1', auth })
  await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } },
  })
}

// ─── Notification email — nouvelle visite programmée ─────────────────────────

export async function sendVisitNotificationEmail(opts: {
  visitDate: string
  visitTime: string
  apartmentNumbers: string[]
  lastName: string
  firstName: string
  email: string
  phone: string
  situation: 'student' | 'other' | null
  guarantorType: 'none' | 'physical' | 'visale' | null
  totalIncome: number | null
  desiredDurationMonths: number | null
  comments: string
}): Promise<void> {
  const to = 'location.moulinet@gmail.com'

  const dateFr = new Date(opts.visitDate + 'T' + opts.visitTime).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const heure = opts.visitTime.slice(0, 5)
  const subject = `Nouvelle visite le ${dateFr} à ${heure}`

  const situationLabel = opts.situation === 'student' ? 'Étudiant(e)' : opts.situation === 'other' ? 'Autre' : '—'
  const guarantorLabel = opts.guarantorType === 'none' ? 'Non' : opts.guarantorType === 'physical' ? 'Garant physique' : opts.guarantorType === 'visale' ? 'Visale' : '—'
  const durationLabel = opts.desiredDurationMonths
    ? opts.desiredDurationMonths < 12
      ? `${opts.desiredDurationMonths} mois`
      : `${Math.floor(opts.desiredDurationMonths / 12)} an${Math.floor(opts.desiredDurationMonths / 12) > 1 ? 's' : ''}${opts.desiredDurationMonths % 12 > 0 ? ` et ${opts.desiredDurationMonths % 12} mois` : ''}`
    : '—'

  const body = [
    `${dateFr} à ${heure}`,
    `Appartements : ${opts.apartmentNumbers.map(n => `n°${n}`).join(', ')}`,
    ``,
    `Nom / Prénom  : ${opts.lastName.toUpperCase()} ${opts.firstName}`,
    `Email         : ${opts.email}`,
    `Téléphone     : ${opts.phone}`,
    `Situation     : ${situationLabel}`,
    `Garant        : ${guarantorLabel}`,
    `Revenus       : ${opts.totalIncome ? `${opts.totalIncome.toLocaleString('fr-FR')} €/mois` : '—'}`,
    `Durée souhait.: ${durationLabel}`,
    `Commentaires  : ${opts.comments || '—'}`,
  ].join('\n')

  const mime = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(body).toString('base64'),
  ].join('\r\n')

  const raw = Buffer.from(mime).toString('base64url')
  const auth = makeGoogleAuth()
  const gmail = google.gmail({ version: 'v1', auth })
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  })
}

// ─── Email — liste des locataires (entrée/sortie) ────────────────────────────

export { buildTenantListEmailBody } from './emailFormatting'

export async function sendTenantListEmail(opts: {
  changedTenantTitle: string | null
  changedTenantFirstName: string
  changedTenantLastName: string
  changedTenantPhone: string | null
  changedTenantEmail: string | null
  aptNumber: string
  moveType: 'entrée' | 'sortie'
  moveDate: string
}): Promise<void> {
  type TenantRow = {
    apartment_number: string
    title: string | null
    first_name: string
    last_name: string
    phone: string | null
    email: string | null
    move_in_inspection_date: string | null
    move_out_inspection_date: string | null
  }

  const allTenants = await runSqlAdmin<TenantRow>(
    `SELECT a.number AS apartment_number, t.title, t.first_name, t.last_name, t.phone, t.email,
            l.move_in_inspection_date, l.move_out_inspection_date
     FROM leases l
     JOIN apartments a ON a.id = l.apartment_id
     JOIN lease_tenants lt ON lt.lease_id = l.id
     JOIN tenants t ON t.id = lt.tenant_id
     WHERE l.status = 'active'
       AND (l.move_out_inspection_date IS NULL OR l.move_out_inspection_date >= CURRENT_DATE)
     ORDER BY a.number`
  )

  const body = buildTenantListEmailBody({
    changedTenant: {
      title: opts.changedTenantTitle,
      firstName: opts.changedTenantFirstName,
      lastName: opts.changedTenantLastName,
      phone: opts.changedTenantPhone,
      email: opts.changedTenantEmail,
      aptNumber: opts.aptNumber,
      moveType: opts.moveType,
      moveDate: opts.moveDate,
    },
    allTenants,
  })

  const subject = 'Liste de locataires mise à jour'
  const mime = [
    `To: ${TENANT_LIST_EMAIL_RECIPIENT}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(body).toString('base64'),
  ].join('\r\n')

  const raw = Buffer.from(mime).toString('base64url')
  const auth = makeGoogleAuth()
  const gmail = google.gmail({ version: 'v1', auth })
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  })
}

// ─── Email — liste locataires (envoi manuel, sans locataire déclencheur) ─────

export async function sendTenantListEmailFull(): Promise<void> {
  type TenantRow = {
    apartment_number: string
    title: string | null
    first_name: string
    last_name: string
    phone: string | null
    email: string | null
    move_in_inspection_date: string | null
    move_out_inspection_date: string | null
  }

  const tenants = await runSqlAdmin<TenantRow>(
    `SELECT a.number AS apartment_number, t.title, t.first_name, t.last_name, t.phone, t.email,
            l.move_in_inspection_date, l.move_out_inspection_date
     FROM leases l
     JOIN apartments a ON a.id = l.apartment_id
     JOIN lease_tenants lt ON lt.lease_id = l.id
     JOIN tenants t ON t.id = lt.tenant_id
     WHERE l.status = 'active'
       AND (l.move_out_inspection_date IS NULL OR l.move_out_inspection_date >= CURRENT_DATE)
     ORDER BY a.number::integer`
  )

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const rows = tenants.map(t => {
    const lines: string[] = [
      `Appartement ${t.apartment_number}`,
      `${t.title ? t.title + ' ' : ''}${t.last_name.toUpperCase()} ${t.first_name}`,
      t.phone ?? '—',
      t.email ?? '—',
    ]
    if (t.move_out_inspection_date && t.move_out_inspection_date >= todayStr)
      lines.push(`Sortie le ${fmtDate(t.move_out_inspection_date)}`)
    else if (t.move_in_inspection_date && t.move_in_inspection_date >= todayStr)
      lines.push(`Entrée le ${fmtDate(t.move_in_inspection_date)}`)
    return `<p>${lines.join('<br>')}</p>`
  }).join('\n')

  const body = `<p><em>Envoi manuel — ${fmtDate(todayStr)}</em></p><hr>${rows}`

  const subject = 'Liste de locataires'
  const mime = [
    `To: ${TENANT_LIST_EMAIL_RECIPIENT}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(body).toString('base64'),
  ].join('\r\n')

  const raw = Buffer.from(mime).toString('base64url')
  const auth = makeGoogleAuth()
  const gmail = google.gmail({ version: 'v1', auth })
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  })
}

// ─── Notification email — nouvelle candidature ────────────────────────────────

export async function sendCandidateNotificationEmail(opts: {
  aptNumber: string
  lastName: string
  firstName: string
  desiredSigningDate: string
}): Promise<void> {
  const to = 'location.moulinet@gmail.com'
  const subject = `Nouvelle candidature pour l'appartement ${opts.aptNumber}`

  const dateFormatted = (() => {
    const d = new Date(opts.desiredSigningDate + 'T12:00:00')
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  })()

  const body = [
    `Nouvelle candidature pour l'appartement ${opts.aptNumber}`,
    ``,
    `${opts.lastName.toUpperCase()} ${opts.firstName}`,
    `Date de début de bail souhaitée : ${dateFormatted}`,
    `Durée : 1 an`,
  ].join('\n')

  const mime = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(body).toString('base64'),
  ].join('\r\n')

  const raw = Buffer.from(mime).toString('base64url')
  const auth = makeGoogleAuth()
  const gmail = google.gmail({ version: 'v1', auth })
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  })
}

// ─── Google People — création de contacts candidat/garant ────────────────────

export async function createGoogleContacts(opts: {
  candidateFirstName: string
  candidateLastName: string
  candidateEmail: string | null
  candidatePhone: string | null
  apartmentNumber: string
  guarantorFirstName: string | null
  guarantorLastName: string | null
  guarantorEmail: string | null
  guarantorPhone: string | null
}): Promise<void> {
  const auth = makeGoogleAuth()
  const people = google.people({ version: 'v1', auth })

  await people.people.createContact({
    requestBody: {
      names: [{ givenName: opts.candidateFirstName, familyName: opts.candidateLastName }],
      ...(opts.candidateEmail ? { emailAddresses: [{ value: opts.candidateEmail }] } : {}),
      ...(opts.candidatePhone ? { phoneNumbers: [{ value: opts.candidatePhone }] } : {}),
      organizations: [{ name: `Apt ${opts.apartmentNumber}` }],
    },
  })

  if (opts.guarantorLastName) {
    await people.people.createContact({
      requestBody: {
        names: [{ givenName: opts.guarantorFirstName ?? '', familyName: opts.guarantorLastName }],
        ...(opts.guarantorEmail ? { emailAddresses: [{ value: opts.guarantorEmail }] } : {}),
        ...(opts.guarantorPhone ? { phoneNumbers: [{ value: opts.guarantorPhone }] } : {}),
        organizations: [{ name: `Apt ${opts.apartmentNumber} Garant` }],
      },
    })
  }
}
