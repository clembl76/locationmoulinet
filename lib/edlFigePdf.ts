import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import type { ApartmentWithLease, EdlInstallation, EdlKey } from './adminData'
import type { LeaseDates, EdlFigeHeader } from '@/app/admin/inventory/summaryActions'
import type { InventoryRow } from '@/app/admin/inventory/actions'
import type { SurfaceRow } from '@/app/admin/inventory/surfacesActions'

export type EdlType = 'entree' | 'sortie'

export type EdlFigePdfData = {
  apt: ApartmentWithLease
  leaseDates: LeaseDates
  installation: EdlInstallation | null
  keys: EdlKey[]
  inventory: InventoryRow[]
  surfaces: SurfaceRow[]
  header: EdlFigeHeader | null
}

// ─── Mise en page (A4 paysage, en points PDF) ─────────────────────────────────
// Le PDF est dessiné directement par le serveur (au lieu de s'appuyer sur la
// boîte de dialogue d'impression du navigateur) : cela garantit une page
// véritablement paysage (largeur > hauteur dans le document généré, sans
// dépendre du pilote d'impression) et un nom de fichier maîtrisé de bout en bout.

const PAGE_WIDTH = 842   // A4 paysage : 297mm
const PAGE_HEIGHT = 595  // A4 paysage : 210mm
const MARGIN = 36
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const COLOR_TEXT = rgb(0.1, 0.1, 0.1)
const COLOR_MUTED = rgb(0.45, 0.45, 0.45)
const COLOR_LINE = rgb(0.8, 0.8, 0.8)
const COLOR_HEADER_BG = rgb(0.95, 0.95, 0.96)
const COLOR_GROUP_BG = rgb(0.97, 0.97, 0.975)

// ─── Utilitaires texte ────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDateFr(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function personLine(title: string | null, lastName: string, firstName: string): string {
  return [title, lastName.toUpperCase(), firstName].filter(Boolean).join(' ')
}

function birthSuffix(birthDate: string | null, birthPlace: string | null): string {
  if (!birthDate) return ''
  return `, né(e) le ${formatDateFr(birthDate)}${birthPlace ? ` à ${birthPlace}` : ''}`
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return ['']
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (current && font.widthOfTextAtSize(test, size) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

export function buildEdlPdfFilename(edlType: EdlType, leaseDates: LeaseDates, apt: ApartmentWithLease): string {
  const date = (edlType === 'entree' ? leaseDates.move_in_date : leaseDates.move_out_date) ?? ''
  return `${date}_EDLInventaire_${apt.apartment_number}-${apt.tenant_last_name}`
}

// ─── Contexte de dessin (page courante + curseur vertical) ────────────────────

type Ctx = {
  doc: PDFDocument
  page: PDFPage
  y: number
  fontReg: PDFFont
  fontBold: PDFFont
}

function addPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  ctx.y = PAGE_HEIGHT - MARGIN
}

function ensureSpace(ctx: Ctx, height: number) {
  if (ctx.y - height < MARGIN) addPage(ctx)
}

// ─── Primitives de dessin ─────────────────────────────────────────────────────

function drawSectionTitle(ctx: Ctx, title: string) {
  ensureSpace(ctx, 34)
  ctx.y -= 4
  ctx.page.drawText(title.toUpperCase(), {
    x: MARGIN, y: ctx.y - 11, size: 12, font: ctx.fontBold, color: COLOR_TEXT,
  })
  ctx.y -= 16
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.y },
    thickness: 0.75, color: COLOR_LINE,
  })
  ctx.y -= 12
}

function drawText(ctx: Ctx, text: string, opts: {
  x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number
} = {}) {
  const size = opts.size ?? 9
  const gap = opts.gap ?? 4
  ensureSpace(ctx, size + gap)
  ctx.page.drawText(text, {
    x: opts.x ?? MARGIN,
    y: ctx.y - size,
    size,
    font: opts.font ?? ctx.fontReg,
    color: opts.color ?? COLOR_TEXT,
  })
  ctx.y -= size + gap
}

function drawWrapped(ctx: Ctx, text: string, opts: {
  x?: number; maxWidth?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; afterGap?: number
} = {}) {
  const x = opts.x ?? MARGIN
  const size = opts.size ?? 9
  const font = opts.font ?? ctx.fontReg
  const maxWidth = opts.maxWidth ?? CONTENT_WIDTH
  for (const line of wrapText(text, font, size, maxWidth)) {
    ensureSpace(ctx, size + 3)
    ctx.page.drawText(line, { x, y: ctx.y - size, size, font, color: opts.color ?? COLOR_TEXT })
    ctx.y -= size + 3
  }
  if (opts.afterGap) ctx.y -= opts.afterGap
}

function drawKeyValueRow(ctx: Ctx, label: string, value: string) {
  ensureSpace(ctx, 16)
  ctx.page.drawText(label, { x: MARGIN, y: ctx.y - 9, size: 9, font: ctx.fontReg, color: COLOR_MUTED })
  ctx.page.drawText(value, { x: MARGIN + 130, y: ctx.y - 9, size: 9, font: ctx.fontBold, color: COLOR_TEXT })
  ctx.y -= 15
}

// ─── Tableau générique (en-tête répété + regroupements optionnels) ────────────

type TableColumn = { label: string; width: number; align?: 'left' | 'right' }
type TableGroup = { label?: string; rows: string[][] }

function drawTable(ctx: Ctx, columns: TableColumn[], groups: TableGroup[]) {
  const size = 8
  const lineGap = 2
  const padX = 4
  const lineHeight = size + lineGap

  const colX: number[] = []
  let acc = MARGIN
  for (const col of columns) {
    colX.push(acc + padX)
    acc += col.width * CONTENT_WIDTH
  }

  function cellX(colIndex: number, text: string, font: PDFFont, align?: 'left' | 'right') {
    if (align !== 'right') return colX[colIndex]
    return colX[colIndex] + columns[colIndex].width * CONTENT_WIDTH - padX * 2 - font.widthOfTextAtSize(text, size)
  }

  function header() {
    const h = lineHeight + 8
    ensureSpace(ctx, h + lineHeight + 6)
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - h, width: CONTENT_WIDTH, height: h, color: COLOR_HEADER_BG })
    columns.forEach((col, i) => {
      const text = col.label.toUpperCase()
      ctx.page.drawText(text, {
        x: cellX(i, text, ctx.fontBold, col.align),
        y: ctx.y - h + (h - size) / 2 - 1,
        size, font: ctx.fontBold, color: COLOR_MUTED,
      })
    })
    ctx.y -= h
  }

  function groupRow(label: string) {
    const h = lineHeight + 6
    if (ctx.y - h < MARGIN) { addPage(ctx); header() }
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - h, width: CONTENT_WIDTH, height: h, color: COLOR_GROUP_BG })
    ctx.page.drawText(label.toUpperCase(), {
      x: MARGIN + padX, y: ctx.y - h + (h - size) / 2 - 1, size, font: ctx.fontBold, color: COLOR_MUTED,
    })
    ctx.y -= h
  }

  function dataRow(row: string[]) {
    const wrapped = row.map((cell, i) => wrapText(cell, ctx.fontReg, size, columns[i].width * CONTENT_WIDTH - padX * 2))
    const nLines = Math.max(1, ...wrapped.map(w => w.length))
    const rowHeight = nLines * lineHeight + 6

    if (ctx.y - rowHeight < MARGIN) { addPage(ctx); header() }

    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y },
      end: { x: MARGIN + CONTENT_WIDTH, y: ctx.y },
      thickness: 0.5, color: COLOR_LINE,
    })

    const rowTop = ctx.y
    columns.forEach((col, i) => {
      wrapped[i].forEach((line, li) => {
        ctx.page.drawText(line, {
          x: cellX(i, line, ctx.fontReg, col.align),
          y: rowTop - lineHeight - li * lineHeight + lineGap,
          size, font: ctx.fontReg, color: COLOR_TEXT,
        })
      })
    })
    ctx.y -= rowHeight
  }

  header()
  for (const group of groups) {
    if (group.label) groupRow(group.label)
    for (const row of group.rows) dataRow(row)
  }
}

// ─── Génération du PDF ────────────────────────────────────────────────────────

export async function generateEdlFigePdf(
  data: EdlFigePdfData,
  edlType: EdlType
): Promise<{ pdfBytes: Uint8Array; filename: string; pageCount: number }> {
  const { apt, leaseDates, installation, keys, inventory, surfaces, header } = data
  const filename = buildEdlPdfFilename(edlType, leaseDates, apt)

  const doc = await PDFDocument.create()
  const fontReg = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - MARGIN,
    fontReg,
    fontBold,
  }

  // ─── En-tête officiel EDL / Bail ───
  if (header) {
    drawSectionTitle(ctx, 'État des lieux / Inventaire des meubles')
    drawKeyValueRow(ctx, 'Adresse', header.building_address)
    if (header.building_short_name === 'Moulinet') {
      drawKeyValueRow(ctx, 'Appartement', header.apartment_number)
    }
    ctx.y -= 4
    drawKeyValueRow(ctx, 'Date EDL Entrée', formatDateFr(leaseDates.move_in_date))
    if (edlType === 'sortie') drawKeyValueRow(ctx, 'Date EDL Sortie', formatDateFr(leaseDates.move_out_date))
    ctx.y -= 6
    drawText(ctx, 'Annexe du bail signé entre les soussignés :', { color: COLOR_MUTED, gap: 8 })

    drawText(ctx, personLine(header.owner_title, header.owner_last_name, header.owner_first_name)
      + birthSuffix(header.owner_birth_date, header.owner_birth_place), { font: fontBold, gap: 2 })
    if (header.owner_address) drawText(ctx, `domicilié(e) ${header.owner_address}`, { gap: 2 })
    if (header.owner_phone) drawText(ctx, `Téléphone : ${header.owner_phone}`, { gap: 2 })
    if (header.owner_email) drawText(ctx, `Email : ${header.owner_email}`, { gap: 2 })
    drawText(ctx, 'Désigné ci-après « le Bailleur »', { color: COLOR_MUTED, gap: 2 })
    drawText(ctx, "D'UNE PART", { font: fontBold, gap: 10 })

    drawText(ctx, 'ET :', { font: fontBold, gap: 8 })

    drawText(ctx, personLine(header.tenant_title, header.tenant_last_name, header.tenant_first_name)
      + birthSuffix(header.tenant_birth_date, header.tenant_birth_place), { font: fontBold, gap: 2 })
    if (header.tenant_address) drawText(ctx, `domicilié(e) ${header.tenant_address}`, { gap: 2 })
    if (header.tenant_phone) drawText(ctx, `Téléphone : ${header.tenant_phone}`, { gap: 2 })
    if (header.tenant_email) drawText(ctx, `Email : ${header.tenant_email}`, { gap: 2 })
    drawText(ctx, 'Désignés ci-après « le Locataire »', { color: COLOR_MUTED, gap: 2 })
    drawText(ctx, "D'AUTRE PART", { font: fontBold, gap: 10 })
  } else {
    drawSectionTitle(ctx, 'Bail')
    drawKeyValueRow(ctx, 'Entrée', formatDateFr(leaseDates.move_in_date))
    if (edlType === 'sortie') drawKeyValueRow(ctx, 'Sortie', formatDateFr(leaseDates.move_out_date))
    drawKeyValueRow(ctx, 'Caution', leaseDates.deposit != null ? `${leaseDates.deposit} €` : '—')
  }
  ctx.y -= 6

  // ─── Installations ───
  drawSectionTitle(ctx, 'Installations')
  if (installation?.hot_water) drawText(ctx, `Eau chaude : ${installation.hot_water}`)
  if (installation?.heating) drawText(ctx, `Chauffage : ${installation.heating}`)
  if (!installation?.hot_water && !installation?.heating) drawText(ctx, 'Non renseigné', { color: COLOR_MUTED })
  const chargesType = installation?.charges_type ?? 'forfait'
  const meterText = installation?.meter_readings
    ?? (chargesType === 'forfait' ? 'Charges au forfait, aucun relevé des compteurs.' : '—')
  drawText(ctx, 'Relevé des consommations :', { color: COLOR_MUTED, gap: 2 })
  drawWrapped(ctx, meterText, { afterGap: 8 })

  // ─── Clés ───
  drawSectionTitle(ctx, 'Clés')
  if (keys.length === 0) {
    drawText(ctx, 'Aucune clé', { color: COLOR_MUTED })
  } else {
    drawTable(ctx, [
      { label: 'Type de clé', width: 0.7 },
      { label: 'Quantité', width: 0.3, align: 'right' },
    ], [{ rows: keys.map(k => [k.key_type, String(k.quantity)]) }])
  }

  // ─── Inventaire — démarre sur une nouvelle page ───
  addPage(ctx)
  drawSectionTitle(ctx, `Inventaire${inventory.length > 0 ? ` (${inventory.length} item${inventory.length > 1 ? 's' : ''})` : ''}`)
  if (inventory.length === 0) {
    drawText(ctx, 'Aucun item', { color: COLOR_MUTED })
  } else {
    const byRoom = new Map<string, InventoryRow[]>()
    for (const row of inventory) {
      if (!byRoom.has(row.room)) byRoom.set(row.room, [])
      byRoom.get(row.room)!.push(row)
    }
    const sortedRooms = Array.from(byRoom.keys()).sort()
    const columns: TableColumn[] = edlType === 'sortie'
      ? [
          { label: 'Item', width: 0.22 },
          { label: 'Qté', width: 0.06, align: 'right' },
          { label: 'État', width: 0.13 },
          { label: 'Commentaire', width: 0.27 },
          { label: 'Commentaire sortie', width: 0.32 },
        ]
      : [
          { label: 'Item', width: 0.30 },
          { label: 'Qté', width: 0.08, align: 'right' },
          { label: 'État', width: 0.18 },
          { label: 'Commentaire', width: 0.44 },
        ]
    const groups: TableGroup[] = sortedRooms.map(room => ({
      label: room,
      rows: byRoom.get(room)!
        .sort((a, b) => a.item_name.localeCompare(b.item_name, 'fr'))
        .map(row => edlType === 'sortie'
          ? [row.item_name, String(row.quantity), row.condition ?? '—', row.notes ?? '—', row.notes_exit ?? '—']
          : [row.item_name, String(row.quantity), row.condition ?? '—', row.notes ?? '—']),
    }))
    drawTable(ctx, columns, groups)
  }

  // ─── Surfaces & équipements ───
  ctx.y -= 16
  drawSectionTitle(ctx, `Surfaces & équipements${surfaces.length > 0 ? ` (${surfaces.length})` : ''}`)
  if (surfaces.length === 0) {
    drawText(ctx, 'Aucune surface', { color: COLOR_MUTED })
  } else {
    const columns: TableColumn[] = edlType === 'sortie'
      ? [
          { label: 'Surface / Équipement', width: 0.18 },
          { label: 'Pièce', width: 0.12 },
          { label: 'Matière', width: 0.13 },
          { label: 'État', width: 0.10 },
          { label: 'Commentaire', width: 0.235 },
          { label: 'Commentaire sortie', width: 0.235 },
        ]
      : [
          { label: 'Surface / Équipement', width: 0.22 },
          { label: 'Pièce', width: 0.15 },
          { label: 'Matière', width: 0.16 },
          { label: 'État', width: 0.13 },
          { label: 'Commentaire', width: 0.34 },
        ]
    const rows = [...surfaces]
      .sort((a, b) => a.surface.localeCompare(b.surface, 'fr'))
      .map(row => edlType === 'sortie'
        ? [row.surface, row.room ?? '—', row.material ?? '—', row.condition ?? '—', row.notes ?? '—', row.notes_exit ?? '—']
        : [row.surface, row.room ?? '—', row.material ?? '—', row.condition ?? '—', row.notes ?? '—'])
    drawTable(ctx, columns, [{ rows }])
  }

  // ─── Signatures — démarre sur une nouvelle page ───
  addPage(ctx)
  drawSectionTitle(ctx, 'Signatures')

  const dateStr = edlType === 'entree' ? formatDateFr(leaseDates.move_in_date) : formatDateFr(leaseDates.move_out_date)
  drawText(ctx, `${edlType === 'entree' ? 'Entrée dans les lieux le' : 'Sortie des lieux le'} : ${dateStr}`, {
    font: fontBold, gap: 8,
  })
  drawWrapped(ctx, "Le présent état des lieux et inventaire ont été établis contradictoirement et accepté par les parties.", { afterGap: 6 })
  drawText(ctx, `Montant de la caution versée : ${leaseDates.deposit != null ? `${leaseDates.deposit} €` : '—'}`, { gap: 12 })

  if (edlType === 'sortie') {
    drawText(ctx, 'Bailleur - Commentaires, réserves et retenues éventuelles sur caution :', { color: COLOR_MUTED, gap: 3 })
    drawWrapped(ctx, installation?.deposit_notes || '—', { afterGap: 10 })

    drawText(ctx, 'Locataire - Commentaires ou réserves :', { color: COLOR_MUTED, gap: 3 })
    drawWrapped(ctx, installation?.tenant_notes_exit || '—', { afterGap: 10 })
  }

  drawText(ctx, `Fait en 2 exemplaires, à Rouen le ${dateStr}`, { gap: 28 })

  // Blocs signature côte à côte
  const colWidth = CONTENT_WIDTH / 2
  const tenantNameFull = header ? personLine(header.tenant_title, header.tenant_last_name, header.tenant_first_name) : ''
  const ownerNameFull = header ? personLine(header.owner_title, header.owner_last_name, header.owner_first_name) : ''

  ensureSpace(ctx, 70)
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: MARGIN + CONTENT_WIDTH, y: ctx.y },
    thickness: 0.5, color: COLOR_LINE,
  })
  ctx.y -= 16
  ctx.page.drawText('Signature du locataire', { x: MARGIN, y: ctx.y - 9, size: 9, font: fontBold, color: COLOR_TEXT })
  ctx.page.drawText('Signature du propriétaire', { x: MARGIN + colWidth, y: ctx.y - 9, size: 9, font: fontBold, color: COLOR_TEXT })
  ctx.y -= 14
  if (tenantNameFull) ctx.page.drawText(tenantNameFull, { x: MARGIN, y: ctx.y - 9, size: 9, font: fontReg, color: COLOR_MUTED })
  if (ownerNameFull) ctx.page.drawText(ownerNameFull, { x: MARGIN + colWidth, y: ctx.y - 9, size: 9, font: fontReg, color: COLOR_MUTED })
  ctx.y -= 14
  ctx.page.drawText('« Lu et approuvé »', { x: MARGIN, y: ctx.y - 9, size: 9, font: fontReg, color: COLOR_MUTED })
  ctx.page.drawText('« Lu et approuvé »', { x: MARGIN + colWidth, y: ctx.y - 9, size: 9, font: fontReg, color: COLOR_MUTED })
  ctx.y -= 20

  const pdfBytes = await doc.save()
  return { pdfBytes, filename, pageCount: doc.getPageCount() }
}
