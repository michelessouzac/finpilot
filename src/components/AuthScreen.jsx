import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { Field, TextInput, PrimaryButton, GhostButton, Card } from './ui.jsx'
import { CatMascotGlasses } from '../CatMascot.jsx'

function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(traduzErro(error.message))
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(traduzErro(error.message))
      } else {
        setInfo('Conta criada! Você já pode entrar.')
        setMode('login')
      }
    }

    setLoading(false)
  }

  function traduzErro(message) {
    if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
    if (message.includes('User already registered')) return 'Já existe uma conta com esse e-mail.'
    if (message.includes('Password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.'
    return message
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-5 py-10">
      <CatMascotGlasses className="h-24 w-24" />
      <Card className="flex w-full flex-col gap-4">
        <div className="text-center">
          <h1 className="font-display text-xl font-semibold text-ink">
            {mode === 'login' ? 'Entrar no FinPilot' : 'Criar sua conta'}
          </h1>
          <p className="text-sm text-gray">
            {mode === 'login'
              ? 'Acesse seus dados financeiros com segurança.'
              : 'Cada pessoa tem sua própria conta e seus próprios dados.'}
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="E-mail">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              required
            />
          </Field>

          <Field label="Senha">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </Field>

          {error && <p className="text-sm font-medium text-rose">{error}</p>}
          {info && <p className="text-sm font-medium text-coral">{info}</p>}

          <PrimaryButton type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </PrimaryButton>
        </form>

        <GhostButton
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'cadastro' : 'login')
            setError('')
            setInfo('')
          }}
        >
          {mode === 'login' ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
        </GhostButton>
      </Card>
    </div>
  )
}

export default AuthScreen
