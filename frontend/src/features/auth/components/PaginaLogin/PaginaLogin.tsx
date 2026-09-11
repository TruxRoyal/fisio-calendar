import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { ErrorPeticion } from '../../../../shared/api/cliente'
import { useAuth } from '../../AuthContext'

export function PaginaLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await login(email, password)
      navigate('/calendario')
    } catch (err) {
      setError(err instanceof ErrorPeticion ? err.message : 'No se pudo iniciar sesión. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ingresá con tu cuenta para continuar.</p>

        <form onSubmit={alEnviar} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              required
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <Button type="submit" disabled={enviando} className="mt-2 w-full">
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
