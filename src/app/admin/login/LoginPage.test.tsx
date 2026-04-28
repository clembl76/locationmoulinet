import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/admin/login/page'

async function renderLoginPage(searchParams: Record<string, string> = {}) {
  const Component = await LoginPage({
    searchParams: Promise.resolve(searchParams),
  })
  return render(Component as React.ReactElement)
}

describe('LoginPage — rendu des champs', () => {
  it('affiche un champ email (type=email, id=email)', async () => {
    await renderLoginPage()
    const emailInput = document.getElementById('email') as HTMLInputElement
    expect(emailInput).toBeInTheDocument()
    expect(emailInput.type).toBe('email')
  })

  it('affiche un champ mot de passe (type=password, id=password)', async () => {
    await renderLoginPage()
    const pwdInput = document.getElementById('password') as HTMLInputElement
    expect(pwdInput).toBeInTheDocument()
    expect(pwdInput.type).toBe('password')
  })

  it('affiche le bouton Connexion', async () => {
    await renderLoginPage()
    expect(screen.getByRole('button', { name: /connexion/i })).toBeInTheDocument()
  })

  it('le champ email est optionnel (pas de required)', async () => {
    await renderLoginPage()
    const emailInput = document.getElementById('email') as HTMLInputElement
    expect(emailInput.required).toBe(false)
  })

  it('le champ mot de passe est obligatoire', async () => {
    await renderLoginPage()
    const pwdInput = document.getElementById('password') as HTMLInputElement
    expect(pwdInput.required).toBe(true)
  })
})

describe('LoginPage — message erreur', () => {
  it("n'affiche pas de message d'erreur par défaut", async () => {
    await renderLoginPage()
    expect(screen.queryByText(/identifiants incorrects/i)).not.toBeInTheDocument()
  })

  it("affiche un message d'erreur si searchParams.error est défini", async () => {
    await renderLoginPage({ error: '1' })
    expect(screen.getByText(/identifiants incorrects/i)).toBeInTheDocument()
  })
})
