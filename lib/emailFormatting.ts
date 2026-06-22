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

// ─── Email — informations d'arrivée après EDL d'entrée (building Moulinet) ───

export const EDL_ENTREE_EMAIL_SUBJECT = 'informations pour votre arrivée dans le logement'

export function buildEdlEntreeEmailBody(): string {
  return `<p>Bonjour,</p>
<p>suite à votre état des lieux d'entrée dans l'appartement, voici les informations pratiques pour vous installer.</p>
<p>Vos contacts pendant toute votre location :</p>
<ul>
  <li><strong>Administratif, Loyers, Quittances etc</strong> : Mme ALAOUI par mail location.moulinet@gmail.com ou Whatsapp +33628076729.</li>
  <li><strong>Pour tout besoin d'intervention sur place, clés, réparations etc</strong> : M. Hervé MICOUT 07 82 95 02 78</li>
</ul>
<p>Hors urgences, M. Micout sera joignable du lundi au samedi de 9h à 19h.</p>
<p><strong>Wifi</strong><br>
Réseaux SFR_EC4F et SFR_EC4F_5GEXT<br>
Mot de passe : q3nzn3z9cac1rklz4d8y</p>
<p>! Si vous souhaitez prendre un abonnement Fibre personnel et que l'appartement n'est pas encore raccordé, vous devez nous prévenir car il faut avoir accès aux placards techniques qui sont cadenassés + il faut vérifier comment le technicien passe ses câbles.</p>
<p>Les <strong>poubelles</strong> sont à déposer directement dans les bacs dans la rue pour le tout-venant, et sinon à apporter en point de collecte : <a href="https://metropole-rouen-normandie.montri.fr/services/map">https://metropole-rouen-normandie.montri.fr/services/map</a></p>
<p><strong>Laveries/lavomatic</strong> à proximité :<br>
75 Rue Beauvoisine<br>
56 Rue Cauchoise<br>
16 Rue du Champ des Oiseaux</p>
<p>Bon emménagement,<br>
Cdt<br>
Mme Alaoui</p>`
}
