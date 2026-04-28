import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CandidateForm from '@/components/CandidateForm'
import type { CandidateApartment } from '@/lib/adminData'

vi.mock('@/app/candidater/actions', () => ({
  createCandidateAction: vi.fn().mockResolvedValue({ ok: true, applicationId: 'test-id' }),
}))

const mockApartments: CandidateApartment[] = [
  {
    id: 'apt-1',
    number: '101',
    building_address: '1 rue du Test',
    surface_area: 25,
    rent_including_charges: 650,
    status: 'available',
    available_from: null,
  },
]

describe('CandidateForm — rendu initial', () => {
  it("affiche la carte de l'appartement disponible", () => {
    render(<CandidateForm apartments={mockApartments} />)
    expect(screen.getByText(/Appartement 101/i)).toBeInTheDocument()
    expect(screen.getByText(/650 €\/mois/i)).toBeInTheDocument()
  })

  it('affiche la question sur le garant', () => {
    render(<CandidateForm apartments={mockApartments} />)
    expect(screen.getByText(/avez-vous un garant/i)).toBeInTheDocument()
  })

  it('le bouton soumettre est désactivé par défaut', () => {
    render(<CandidateForm apartments={mockApartments} />)
    expect(screen.getByRole('button', { name: /envoyer/i })).toBeDisabled()
  })

  it("n'affiche pas l'indicateur de poids si aucun fichier ajouté", () => {
    render(<CandidateForm apartments={mockApartments} />)
    expect(screen.queryByText(/poids total des pièces jointes/i)).not.toBeInTheDocument()
  })
})

describe('CandidateForm — section garant', () => {
  it("n'affiche pas les champs garant si 'Non' sélectionné", async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    await user.click(screen.getByRole('radio', { name: /^non$/i }))
    expect(screen.queryByText(/informations du garant/i)).not.toBeInTheDocument()
  })

  it("affiche les champs garant si 'Oui' sélectionné", async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    await user.click(screen.getByRole('radio', { name: /^oui$/i }))
    expect(screen.getByText(/informations du garant/i)).toBeInTheDocument()
  })

  it("affiche la section justificatifs garant si 'Oui'", async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    await user.click(screen.getByRole('radio', { name: /^oui$/i }))
    expect(screen.getByText(/justificatifs garant/i)).toBeInTheDocument()
  })
})

describe('CandidateForm — sélection appartement', () => {
  it('sélectionne un appartement au clic sur la carte', async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    const card = screen.getByText(/Appartement 101/i).closest('button')
    await user.click(card!)
    // La carte sélectionnée a la classe border-blue-primary
    expect(card?.className).toContain('border-blue-primary')
  })
})

describe('CandidateForm — validation email/téléphone', () => {
  it("affiche une erreur pour un email invalide au blur", async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    const emailInputs = document.querySelectorAll('input[type="email"]')
    const emailInput = emailInputs[0] as HTMLInputElement
    await user.type(emailInput, 'pas-un-email')
    await user.tab()
    expect(screen.getByText(/adresse email invalide/i)).toBeInTheDocument()
  })

  it("affiche une erreur pour un téléphone invalide au blur", async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    const telInput = document.querySelector('input[type="tel"]') as HTMLInputElement
    await user.type(telInput, '123')
    await user.tab()
    expect(screen.getByText(/format invalide/i)).toBeInTheDocument()
  })

  it("accepte un email valide sans erreur", async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    const emailInputs = document.querySelectorAll('input[type="email"]')
    const emailInput = emailInputs[0] as HTMLInputElement
    await user.type(emailInput, 'test@example.com')
    await user.tab()
    expect(screen.queryByText(/adresse email invalide/i)).not.toBeInTheDocument()
  })

  it("accepte un téléphone français valide", async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    const telInput = document.querySelector('input[type="tel"]') as HTMLInputElement
    await user.type(telInput, '06 12 34 56 78')
    await user.tab()
    expect(screen.queryByText(/format invalide/i)).not.toBeInTheDocument()
  })
})
