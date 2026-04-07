import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import path from 'path'
import fs from 'fs'
import { google } from 'googleapis'
import { runSqlAdmin } from './adminData'

// ─── Constantes ───────────────────────────────────────────────────────────────

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
      a.rent_including_charges
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

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

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
  const lastDay = daysInMonth(year, month)
  const dateDebut = `01/${pad(month)}/${year}`
  const dateFin = `${pad(lastDay)}/${pad(month)}/${year}`
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

  const loyerHc = data.rent_excluding_charges
  const charges = data.charges
  const loyerCc = amountReceived

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
      SELECT email FROM guarantors WHERE lease_id = '${leaseId}' LIMIT 1
    `).catch(() => [{ email: null }]),
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
  const auth = makeGmailAuth()
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
    SELECT email FROM guarantors WHERE lease_id = '${leaseId}' LIMIT 1
  `).catch(() => [{ email: null }])

  return { ...rows[0], guarantor_email: guarantorRows[0]?.email ?? null }
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
  const auth = makeGmailAuth()
  const gmail = google.gmail({ version: 'v1', auth })
  const draft = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } },
  })
  return draft.data.id ?? ''
}

// ─── Gmail draft ──────────────────────────────────────────────────────────────

function makeGmailAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  // Refresh token avec scope gmail.compose (distinct du token Drive)
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  return auth
}

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

  const auth = makeGmailAuth()
  const gmail = google.gmail({ version: 'v1', auth })
  const draft = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } },
  })

  return draft.data.id ?? ''
}
