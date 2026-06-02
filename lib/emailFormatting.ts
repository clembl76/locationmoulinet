// Utilitaires de formatage d'emails — fonctions pures sans dépendances externes

type TenantEntry = {
  apartment_number: string
  title: string | null
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  move_in_inspection_date: string | null
  move_out_inspection_date: string | null
}

export function buildTenantListEmailBody(opts: {
  changedTenant: {
    title: string | null
    firstName: string
    lastName: string
    phone: string | null
    email: string | null
    aptNumber: string
    moveType: 'entrée' | 'sortie'
    moveDate: string
  }
  allTenants: TenantEntry[]
}): string {
  const fmtDate = (iso: string) => {
    const d = new Date(iso + 'T12:00:00')
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }
  const fmtTitle = (title: string | null) => (title ? `${title} ` : '')

  const todayDate = new Date()
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`

  const isMoving = (t: TenantEntry) =>
    (!!t.move_in_inspection_date && t.move_in_inspection_date >= today) ||
    (!!t.move_out_inspection_date && t.move_out_inspection_date >= today)

  const getDateLabel = (t: TenantEntry): string => {
    if (t.move_out_inspection_date && t.move_out_inspection_date >= today)
      return `Sortie le ${fmtDate(t.move_out_inspection_date)}`
    if (t.move_in_inspection_date && t.move_in_inspection_date >= today)
      return `Entrée le ${fmtDate(t.move_in_inspection_date)}`
    return ''
  }

  const tenantBlock = (lines: string[], bold: boolean) => {
    const content = lines.join('<br>')
    return bold ? `<p><strong>${content}</strong></p>` : `<p>${content}</p>`
  }

  const c = opts.changedTenant
  const action = c.moveType === 'entrée' ? 'Entrée' : 'Sortie'
  const triggerLines = [
    `Appartement ${c.aptNumber}`,
    `${fmtTitle(c.title)}${c.lastName.toUpperCase()} ${c.firstName}`,
    `${c.phone ?? '—'}`,
    `${c.email ?? '—'}`,
    ...(c.moveDate ? [`${action} le ${fmtDate(c.moveDate)}`] : []),
  ]

  // Exclure l'appartement du locataire déclencheur (il est déjà en tête)
  const others = opts.allTenants.filter(t => t.apartment_number !== c.aptNumber)
  const moving = others.filter(t => isMoving(t))
  const stable = others.filter(t => !isMoving(t))

  const movingBlocks = moving.map(t => {
    const label = getDateLabel(t)
    return tenantBlock(
      [
        `Appartement ${t.apartment_number}`,
        `${fmtTitle(t.title)}${t.last_name.toUpperCase()} ${t.first_name}`,
        `${t.phone ?? '—'}`,
        `${t.email ?? '—'}`,
        ...(label ? [label] : []),
      ],
      true
    )
  })

  const stableBlocks = stable.map(t =>
    tenantBlock(
      [
        `Appartement ${t.apartment_number}`,
        `${fmtTitle(t.title)}${t.last_name.toUpperCase()} ${t.first_name}`,
        `${t.phone ?? '—'}`,
        `${t.email ?? '—'}`,
      ],
      false
    )
  )

  return [tenantBlock(triggerLines, true), '<hr>', ...movingBlocks, ...stableBlocks].join('\n')
}
