import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CandidateForm from '@/components/CandidateForm'
import type { CandidateApartment } from '@/lib/adminData'

const mockCreateCandidateAction = vi.fn().mockResolvedValue({ ok: true, applicationId: 'test-id' })

vi.mock('@/app/candidater/actions', () => ({
  createCandidateAction: (...args: unknown[]) => mockCreateCandidateAction(...args),
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

  it("accepte un téléphone français valide sans séparateur", async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    const telInput = document.querySelector('input[type="tel"]') as HTMLInputElement
    await user.type(telInput, '0637043855')
    await user.tab()
    expect(screen.queryByText(/format invalide/i)).not.toBeInTheDocument()
  })

  it("accepte un téléphone avec espaces", async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    const telInput = document.querySelector('input[type="tel"]') as HTMLInputElement
    await user.type(telInput, '06 12 34 56 78')
    await user.tab()
    expect(screen.queryByText(/format invalide/i)).not.toBeInTheDocument()
  })

  it("accepte un téléphone avec tirets (format iOS)", async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    const telInput = document.querySelector('input[type="tel"]') as HTMLInputElement
    await user.type(telInput, '06-37-04-38-55')
    await user.tab()
    expect(screen.queryByText(/format invalide/i)).not.toBeInTheDocument()
  })

  it("accepte un téléphone avec points", async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    const telInput = document.querySelector('input[type="tel"]') as HTMLInputElement
    await user.type(telInput, '06.37.04.38.55')
    await user.tab()
    expect(screen.queryByText(/format invalide/i)).not.toBeInTheDocument()
  })
})

describe('CandidateForm — limite de poids des pièces jointes (4 Mo, contrainte plateforme Vercel)', () => {
  it("refuse un fichier de plus de 4 Mo avec un message mentionnant la vraie limite", async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    await user.click(screen.getByRole('radio', { name: /^non$/i }))

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = new File([new Uint8Array(4.5 * 1024 * 1024)], 'gros-fichier.pdf', { type: 'application/pdf' })
    await user.upload(fileInput, bigFile)

    expect(await screen.findByText(/fichier trop volumineux/i)).toBeInTheDocument()
    expect(screen.getByText(/maximum 4[.,]0 Mo par fichier/i)).toBeInTheDocument()
  })

  it('accepte un fichier de moins de 4 Mo et affiche l\'indicateur de poids avec la limite à 4.0 Mo', async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    await user.click(screen.getByRole('radio', { name: /^non$/i }))

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const smallFile = new File([new Uint8Array(1024)], 'identite.pdf', { type: 'application/pdf' })
    await user.upload(fileInput, smallFile)

    expect(await screen.findByText('identite.pdf')).toBeInTheDocument()
    expect(screen.getByText(/4[.,]0 Mo/)).toBeInTheDocument()
  })
})

describe('CandidateForm — pièces jointes réellement obligatoires (pas seulement l\'astérisque visuel)', () => {
  async function fillBaseRequiredFields(user: ReturnType<typeof userEvent.setup>) {
    const card = screen.getByText(/Appartement 101/i).closest('button')
    await user.click(card!)
    const dateInput = document.querySelector('input[name="desired_signing_date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-09-15' } })
  }

  function makeFile(name: string) {
    return new File([new Uint8Array(1024)], name, { type: 'application/pdf' })
  }

  it('reproduit le bug réel : sans garant, le bouton reste désactivé tant qu\'aucune pièce d\'identité n\'est jointe', async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    await fillBaseRequiredFields(user)
    await user.click(screen.getByRole('radio', { name: /^non$/i }))

    expect(screen.getByRole('button', { name: /envoyer/i })).toBeDisabled()
    expect(screen.getByText(/joignez votre pièce d'identité/i)).toBeInTheDocument()
  })

  it('sans garant : signale le justificatif de revenus manquant une fois l\'identité jointe', async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    await fillBaseRequiredFields(user)
    await user.click(screen.getByRole('radio', { name: /^non$/i }))

    const fileInputs = document.querySelectorAll('input[type="file"]')
    await user.upload(fileInputs[0] as HTMLInputElement, makeFile('identite.pdf')) // candidate_docs_identity

    expect(screen.getByRole('button', { name: /envoyer/i })).toBeDisabled()
    expect(screen.queryByText(/joignez votre pièce d'identité/i)).not.toBeInTheDocument()
    expect(screen.getByText(/joignez un justificatif de revenus/i)).toBeInTheDocument()
  })

  it('sans garant : active le bouton une fois identité + revenus joints', async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    await fillBaseRequiredFields(user)
    await user.click(screen.getByRole('radio', { name: /^non$/i }))

    const fileInputs = document.querySelectorAll('input[type="file"]')
    await user.upload(fileInputs[0] as HTMLInputElement, makeFile('identite.pdf'))
    await user.upload(fileInputs[1] as HTMLInputElement, makeFile('revenus.pdf'))

    expect(screen.getByRole('button', { name: /envoyer/i })).toBeEnabled()
  })

  it('avec garant : signale les pièces du garant manquantes même si celles du candidat sont jointes', async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    await fillBaseRequiredFields(user)
    await user.click(screen.getByRole('radio', { name: /^oui$/i }))

    // Avec garant, l'ordre des inputs est : guarantor_identity, guarantor_income,
    // candidate_identity, candidate_income, candidate_status
    const fileInputs = document.querySelectorAll('input[type="file"]')
    await user.upload(fileInputs[2] as HTMLInputElement, makeFile('identite-candidat.pdf'))

    expect(screen.getByRole('button', { name: /envoyer/i })).toBeDisabled()
    expect(screen.getByText(/joignez la pièce d'identité du garant/i)).toBeInTheDocument()
    expect(screen.getByText(/joignez un justificatif de revenus du garant/i)).toBeInTheDocument()
  })

  it('avec garant : active le bouton une fois identité candidat + identité et revenus garant joints (revenus candidat optionnels)', async () => {
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    await fillBaseRequiredFields(user)
    await user.click(screen.getByRole('radio', { name: /^oui$/i }))

    const fileInputs = document.querySelectorAll('input[type="file"]')
    await user.upload(fileInputs[0] as HTMLInputElement, makeFile('identite-garant.pdf'))
    await user.upload(fileInputs[1] as HTMLInputElement, makeFile('revenus-garant.pdf'))
    await user.upload(fileInputs[2] as HTMLInputElement, makeFile('identite-candidat.pdf'))

    expect(screen.getByRole('button', { name: /envoyer/i })).toBeEnabled()
  })

  it('empêche l\'appel de createCandidateAction si les pièces obligatoires manquent (garde-fou handleSubmit)', async () => {
    mockCreateCandidateAction.mockClear()
    const user = userEvent.setup()
    render(<CandidateForm apartments={mockApartments} />)
    await fillBaseRequiredFields(user)
    await user.click(screen.getByRole('radio', { name: /^non$/i }))

    // Le bouton est disabled, donc le clic ne déclenche rien — on vérifie l'absence d'appel
    await user.click(screen.getByRole('button', { name: /envoyer/i }))
    expect(mockCreateCandidateAction).not.toHaveBeenCalled()
  })
})

describe('CandidateForm — message aide bouton désactivé', () => {
  it("affiche le message d'aide quand le bouton est désactivé", () => {
    render(<CandidateForm apartments={mockApartments} />)
    expect(screen.getByText(/pour activer le bouton d'envoi/i)).toBeInTheDocument()
  })

  it("mentionne la date manquante quand le formulaire est vide", () => {
    render(<CandidateForm apartments={mockApartments} />)
    expect(screen.getByText(/renseignez la date de début/i)).toBeInTheDocument()
  })

  it("mentionne l'appartement manquant quand le formulaire est vide", () => {
    render(<CandidateForm apartments={mockApartments} />)
    expect(screen.getByText(/sélectionnez un appartement/i)).toBeInTheDocument()
  })

  it("mentionne la question garant manquante quand le formulaire est vide", () => {
    render(<CandidateForm apartments={mockApartments} />)
    expect(screen.getByText(/précisez si vous avez un garant/i)).toBeInTheDocument()
  })
})
