import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditableRow from '@/app/admin/mise-en-location/candidats/[id]/EditableRow'

const mockUpdateCandidate = vi.fn()
const mockUpdateGuarantor = vi.fn()
const mockUpdateApplication = vi.fn()
const mockUpdateVisitor = vi.fn()

vi.mock('@/app/admin/mise-en-location/candidats/[id]/actions', () => ({
  updateCandidateFieldAction: (...args: unknown[]) => mockUpdateCandidate(...args),
  updateGuarantorFieldAction: (...args: unknown[]) => mockUpdateGuarantor(...args),
  updateApplicationFieldAction: (...args: unknown[]) => mockUpdateApplication(...args),
  updateVisitorFieldAction: (...args: unknown[]) => mockUpdateVisitor(...args),
}))

beforeEach(() => {
  mockUpdateCandidate.mockReset().mockResolvedValue({ ok: true })
  mockUpdateGuarantor.mockReset().mockResolvedValue({ ok: true })
  mockUpdateApplication.mockReset().mockResolvedValue({ ok: true })
  mockUpdateVisitor.mockReset().mockResolvedValue({ ok: true })
})

describe('EditableRow — affichage', () => {
  it('affiche le libellé et la valeur', () => {
    render(<EditableRow label="Prénom" entity="candidate" id="c1" applicationId="app-1" field="first_name" initialValue="Jean" />)
    expect(screen.getByText('Prénom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Jean' })).toBeInTheDocument()
  })

  it('affiche un tiret cliquable quand la valeur est vide (champ à compléter)', () => {
    render(<EditableRow label="Adresse" entity="candidate" id="c1" applicationId="app-1" field="address" initialValue={null} />)
    expect(screen.getByRole('button', { name: '—' })).toBeInTheDocument()
  })

  it('applique format="uppercase" pour l\'affichage (ex. nom en majuscules)', () => {
    render(<EditableRow label="Nom" entity="candidate" id="c1" applicationId="app-1" field="last_name" initialValue="dupont" format="uppercase" />)
    expect(screen.getByRole('button', { name: 'DUPONT' })).toBeInTheDocument()
  })
})

describe('EditableRow — édition texte au clic', () => {
  it('affiche un input au clic et sauvegarde au blur, en appelant l\'action de la bonne entité', async () => {
    const user = userEvent.setup()
    render(<EditableRow label="Prénom" entity="candidate" id="c1" applicationId="app-1" field="first_name" initialValue="Jean" />)

    await user.click(screen.getByRole('button', { name: 'Jean' }))
    const input = screen.getByDisplayValue('Jean')
    await user.clear(input)
    await user.type(input, 'Anaëlle')
    await user.tab()

    expect(mockUpdateCandidate).toHaveBeenCalledWith('c1', 'first_name', 'Anaëlle', 'app-1')
    expect(await screen.findByRole('button', { name: 'Anaëlle' })).toBeInTheDocument()
  })

  it('sauvegarde avec Entrée', async () => {
    const user = userEvent.setup()
    render(<EditableRow label="Prénom" entity="candidate" id="c1" applicationId="app-1" field="first_name" initialValue="Jean" />)

    await user.click(screen.getByRole('button', { name: 'Jean' }))
    const input = screen.getByDisplayValue('Jean')
    await user.clear(input)
    await user.type(input, 'Marie{Enter}')

    expect(mockUpdateCandidate).toHaveBeenCalledWith('c1', 'first_name', 'Marie', 'app-1')
  })

  it('annule avec Échap sans appeler l\'action', async () => {
    const user = userEvent.setup()
    render(<EditableRow label="Prénom" entity="candidate" id="c1" applicationId="app-1" field="first_name" initialValue="Jean" />)

    await user.click(screen.getByRole('button', { name: 'Jean' }))
    const input = screen.getByDisplayValue('Jean')
    await user.type(input, '{Escape}')

    expect(screen.getByRole('button', { name: 'Jean' })).toBeInTheDocument()
    expect(mockUpdateCandidate).not.toHaveBeenCalled()
  })

  it('ne fait rien si la valeur est inchangée', async () => {
    const user = userEvent.setup()
    render(<EditableRow label="Prénom" entity="candidate" id="c1" applicationId="app-1" field="first_name" initialValue="Jean" />)

    await user.click(screen.getByRole('button', { name: 'Jean' }))
    await user.tab()

    expect(mockUpdateCandidate).not.toHaveBeenCalled()
  })

  it('revient à la valeur précédente et affiche une erreur si l\'action échoue', async () => {
    mockUpdateCandidate.mockResolvedValue({ ok: false, error: 'Erreur serveur' })
    const user = userEvent.setup()
    render(<EditableRow label="Prénom" entity="candidate" id="c1" applicationId="app-1" field="first_name" initialValue="Jean" />)

    await user.click(screen.getByRole('button', { name: 'Jean' }))
    const input = screen.getByDisplayValue('Jean')
    await user.clear(input)
    await user.type(input, 'Marie')
    await user.tab()

    expect(await screen.findByText('Erreur serveur')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Jean' })).toBeInTheDocument()
  })

  it('enregistre null quand le champ est vidé (pas une chaîne vide)', async () => {
    const user = userEvent.setup()
    render(<EditableRow label="Adresse" entity="candidate" id="c1" applicationId="app-1" field="address" initialValue="1 rue Test" />)

    await user.click(screen.getByRole('button', { name: '1 rue Test' }))
    const input = screen.getByDisplayValue('1 rue Test')
    await user.clear(input)
    await user.tab()

    expect(mockUpdateCandidate).toHaveBeenCalledWith('c1', 'address', '', 'app-1')
    expect(await screen.findByRole('button', { name: '—' })).toBeInTheDocument()
  })
})

describe('EditableRow — dispatch par entité', () => {
  it('appelle updateGuarantorFieldAction pour entity="guarantor"', async () => {
    const user = userEvent.setup()
    render(<EditableRow label="Email" entity="guarantor" id="g1" applicationId="app-1" field="email" initialValue="a@b.com" type="email" />)

    await user.click(screen.getByRole('button', { name: 'a@b.com' }))
    const input = screen.getByDisplayValue('a@b.com')
    await user.clear(input)
    await user.type(input, 'c@d.com')
    await user.tab()

    expect(mockUpdateGuarantor).toHaveBeenCalledWith('g1', 'email', 'c@d.com', 'app-1')
    expect(mockUpdateCandidate).not.toHaveBeenCalled()
  })

  it('appelle updateApplicationFieldAction pour entity="application"', async () => {
    const user = userEvent.setup()
    render(<EditableRow label="Date de signature souhaitée" entity="application" id="app-1" applicationId="app-1" field="desired_signing_date" initialValue="2026-10-01" type="date" />)

    await user.click(screen.getByRole('button'))
    const input = screen.getByDisplayValue('2026-10-01')
    await user.clear(input)
    await user.type(input, '2026-11-15')
    await user.tab()

    // updateApplicationFieldAction ne prend pas de 4e paramètre applicationId (l'id EST déjà
    // l'application) — contrairement aux 3 autres entités, qui en ont besoin pour revalider.
    expect(mockUpdateApplication).toHaveBeenCalledWith('app-1', 'desired_signing_date', '2026-11-15')
  })

  it('appelle updateVisitorFieldAction pour entity="visitor"', async () => {
    const user = userEvent.setup()
    render(<EditableRow label="Commentaires" entity="visitor" id="v1" applicationId="app-1" field="comments" initialValue="RAS" type="textarea" />)

    await user.click(screen.getByRole('button', { name: 'RAS' }))
    const textarea = screen.getByDisplayValue('RAS')
    await user.clear(textarea)
    await user.type(textarea, 'Très motivé')
    await user.tab()

    expect(mockUpdateVisitor).toHaveBeenCalledWith('v1', 'comments', 'Très motivé', 'app-1')
  })
})

describe('EditableRow — type select', () => {
  const options = [
    { value: '', label: '—' },
    { value: 'M.', label: 'M.' },
    { value: 'Mme', label: 'Mme' },
  ]

  it('affiche le libellé résolu depuis les options (pas la valeur brute)', () => {
    render(<EditableRow label="Titre" entity="candidate" id="c1" applicationId="app-1" field="title" initialValue="Mme" type="select" options={options} />)
    expect(screen.getByRole('button', { name: 'Mme' })).toBeInTheDocument()
  })

  it('sauvegarde immédiatement au changement de sélection (pas besoin de blur)', async () => {
    const user = userEvent.setup()
    render(<EditableRow label="Titre" entity="candidate" id="c1" applicationId="app-1" field="title" initialValue="M." type="select" options={options} />)

    await user.click(screen.getByRole('button', { name: 'M.' }))
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'Mme')

    expect(mockUpdateCandidate).toHaveBeenCalledWith('c1', 'title', 'Mme', 'app-1')
    expect(await screen.findByRole('button', { name: 'Mme' })).toBeInTheDocument()
  })
})

describe('EditableRow — prop format (clé, jamais une fonction — cf. crash runtime réel)', () => {
  // Régression du bug réel : passer une fonction (formatDisplay={fmtDate}) d'un Server
  // Component vers ce Client Component provoquait un crash au runtime ("Functions cannot be
  // passed directly to Client Components"). `format` est désormais une clé string résolue en
  // interne, jamais une fonction traversant la frontière serveur/client.

  it('format="duration" affiche la durée formatée à partir d\'une valeur numérique stockée en chaîne', () => {
    render(
      <EditableRow
        label="Durée souhaitée" entity="visitor" id="v1" applicationId="app-1" field="desired_duration_months"
        initialValue="14" type="number" format="duration"
      />
    )
    expect(screen.getByRole('button', { name: '1 an et 2 mois' })).toBeInTheDocument()
  })

  it('format="income" affiche les revenus formatés', () => {
    render(
      <EditableRow
        label="Revenus déclarés" entity="visitor" id="v1" applicationId="app-1" field="total_income"
        initialValue="1500" type="number" format="income"
      />
    )
    // toLocaleString('fr-FR') utilise une espace insécable comme séparateur de milliers.
    expect(screen.getByRole('button', { name: /^1.500 €\/mois$/ })).toBeInTheDocument()
  })

  it('format="date" affiche une date longue en français à partir d\'une valeur ISO', () => {
    render(
      <EditableRow
        label="Date de naissance" entity="candidate" id="c1" applicationId="app-1" field="birth_date"
        initialValue="2004-04-03" type="date" format="date"
      />
    )
    expect(screen.getByRole('button', { name: '3 avril 2004' })).toBeInTheDocument()
  })
})
