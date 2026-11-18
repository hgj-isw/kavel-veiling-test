import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getApiModeInfo } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Login() {
  const { isLoggedIn, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'
  const apiInfo = getApiModeInfo()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)

  if (isLoggedIn) return <Navigate to={from} replace />

  async function onSubmit(e) {
    e.preventDefault()
    setFout('')
    setBezig(true)
    try {
      await login(email, code)
      navigate(from, { replace: true })
    } catch (err) {
      setFout(err.message || 'Inloggen mislukt.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <section className="panel login-panel">
      <p className="eyebrow">Inloggen</p>
      <h1>Inloggen met schoolaccount</h1>
      <p className="lede">
        Gebruik je <strong>@isw.info</strong>-e-mailadres en de toegangscode
        die je van school hebt gekregen. Alleen adressen op de allowlist mogen
        bieden.
      </p>

      <form className="form" onSubmit={onSubmit}>
        <label>
          School-e-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            placeholder="naam@isw.info"
            required
          />
        </label>
        <label>
          Toegangscode
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {fout && (
          <p className="msg msg--error" role="alert">
            {fout}
          </p>
        )}
        <button type="submit" className="btn btn--primary" disabled={bezig}>
          {bezig ? 'Bezig…' : 'Inloggen'}
        </button>
      </form>

      {apiInfo.hint && (
        <p className="login-hint muted">{apiInfo.hint}</p>
      )}
    </section>
  )
}
