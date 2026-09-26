import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddDocumentForm from '@/app/admin/mise-en-location/candidats/[id]/AddDocumentForm'

const mockAddDocument = vi.fn()

vi.mock('@/app/admin/mise-en-location/candidats/[id]/actions', () => ({
  addCandidateDocumentAction: (...args: unknown[]) => mockAddDocument(...args),
}))

// jsdom construit `new FormData(form)` à partir des impls internes des champs, qui ne voient pas
// les fausses propriétés `files` posées par userEvent.upload() sur le wrapper JS de l'input.
// Résultat : le fichier uploadé n'apparaît jamais dans la FormData en test, alors que ça
// fonctionne dans un vrai navigateur. On patche FormData pour ces tests uniquement, en relisant
// `input.files` (qui, lui, reflète bien l'upload simulé) et en le réinjectant dans l'entrée.
const NativeFormData = globalThis.FormData
class PatchedFormData extends NativeFormData {
  constructor(form?: HTMLFormElement) {
    super(form)
    if (!form) return
    form.querySelectorAll('input[type="file"]').forEach(input => {
      const fileInput = input as HTMLInputElement
      if (!fileInput.name || !fileInput.files) return
      this.delete(fileInput.name)
      for (let i = 0; i < fileInput.files.length; i++) {
        this.append(fileInput.name, fileInput.files[i])
      }
    })
  }
}

beforeEach(() => {
  mockAddDocument.mockReset().mockResolvedValue({ ok: true })
  vi.stubGlobal('FormData', PatchedFormData)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function makeFile(name = 'piece-identite.pdf') {
  return new File(['contenu'], name, { type: 'application/pdf' })
}

describe('AddDocumentForm — affichage', () => {
  it('affiche uniquement le bouton "+ Ajouter un document" tant que le formulaire est fermé', () => {
    render(<AddDocumentForm applicationId="app-1" aptNumber="7" candidateLastName="Dupont" hasGuarantor={true} />)
    expect(screen.getByRole('button', { name: '+ Ajouter un document' })).toBeInTheDocument()
    expect(screen.queryByText('Candidat')).not.toBeInTheDocument()
  })

  it('ouvre le formulaire au clic, avec le choix Candidat/Garant quand hasGuarantor=true', async () => {
    const user = userEvent.setup()
    render(<AddDocumentForm applicationId="app-1" aptNumber="7" candidateLastName="Dupont" hasGuarantor={true} />)

    await user.click(screen.getByRole('button', { name: '+ Ajouter un document' }))

    expect(screen.getByLabelText('Candidat')).toBeInTheDocument()
    expect(screen.getByLabelText('Garant')).toBeInTheDocument()
  })

  it('masque le choix Garant quand le candidat n\'a pas de garant', async () => {
    const user = userEvent.setup()
    render(<AddDocumentForm applicationId="app-1" aptNumber="7" candidateLastName="Dupont" hasGuarantor={false} />)

    await user.click(screen.getByRole('button', { name: '+ Ajouter un document' }))

    expect(screen.getByLabelText('Candidat')).toBeInTheDocument()
    expect(screen.queryByLabelText('Garant')).not.toBeInTheDocument()
  })

  it('le bouton Ajouter est désactivé tant qu\'aucun fichier n\'est choisi', async () => {
    const user = userEvent.setup()
    render(<AddDocumentForm applicationId="app-1" aptNumber="7" candidateLastName="Dupont" hasGuarantor={true} />)
    await user.click(screen.getByRole('button', { name: '+ Ajouter un document' }))

    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeDisabled()
  })

  it('le bouton Annuler referme le formulaire', async () => {
    const user = userEvent.setup()
    render(<AddDocumentForm applicationId="app-1" aptNumber="7" candidateLastName="Dupont" hasGuarantor={true} />)
    await user.click(screen.getByRole('button', { name: '+ Ajouter un document' }))

    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.getByRole('button', { name: '+ Ajouter un document' })).toBeInTheDocument()
  })
})

describe('AddDocumentForm — soumission', () => {
  it('active le bouton Ajouter une fois un fichier choisi et appelle l\'action avec les bons champs', async () => {
    const user = userEvent.setup()
    render(<AddDocumentForm applicationId="app-1" aptNumber="7" candidateLastName="Dupont" hasGuarantor={true} />)
    await user.click(screen.getByRole('button', { name: '+ Ajouter un document' }))

    await user.upload(document.querySelector('input[type="file"]')!, makeFile())
    const submitButton = screen.getByRole('button', { name: 'Ajouter' })
    expect(submitButton).toBeEnabled()
    await user.click(submitButton)

    expect(mockAddDocument).toHaveBeenCalledTimes(1)
    const formData = mockAddDocument.mock.calls[0][0] as FormData
    expect(formData.get('applicationId')).toBe('app-1')
    expect(formData.get('aptNumber')).toBe('7')
    expect(formData.get('candidateLastName')).toBe('Dupont')
    expect(formData.get('owner')).toBe('candidate')
    expect((formData.get('file') as File).name).toBe('piece-identite.pdf')
  })

  it('envoie owner="guarantor" quand ce choix est sélectionné', async () => {
    const user = userEvent.setup()
    render(<AddDocumentForm applicationId="app-1" aptNumber="7" candidateLastName="Dupont" hasGuarantor={true} />)
    await user.click(screen.getByRole('button', { name: '+ Ajouter un document' }))

    await user.click(screen.getByLabelText('Garant'))
    await user.upload(document.querySelector('input[type="file"]')!, makeFile())
    await user.click(screen.getByRole('button', { name: 'Ajouter' }))

    const formData = mockAddDocument.mock.calls[0][0] as FormData
    expect(formData.get('owner')).toBe('guarantor')
  })

  it('réinitialise et referme le formulaire en cas de succès', async () => {
    const user = userEvent.setup()
    render(<AddDocumentForm applicationId="app-1" aptNumber="7" candidateLastName="Dupont" hasGuarantor={true} />)
    await user.click(screen.getByRole('button', { name: '+ Ajouter un document' }))
    await user.upload(document.querySelector('input[type="file"]')!, makeFile())

    await user.click(screen.getByRole('button', { name: 'Ajouter' }))

    expect(await screen.findByRole('button', { name: '+ Ajouter un document' })).toBeInTheDocument()
  })

  it('affiche le message d\'erreur et garde le formulaire ouvert en cas d\'échec', async () => {
    mockAddDocument.mockResolvedValueOnce({ ok: false, error: 'Merci de sélectionner un fichier.' })
    const user = userEvent.setup()
    render(<AddDocumentForm applicationId="app-1" aptNumber="7" candidateLastName="Dupont" hasGuarantor={true} />)
    await user.click(screen.getByRole('button', { name: '+ Ajouter un document' }))
    await user.upload(document.querySelector('input[type="file"]')!, makeFile())

    await user.click(screen.getByRole('button', { name: 'Ajouter' }))

    expect(await screen.findByText('Merci de sélectionner un fichier.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument()
  })
})
