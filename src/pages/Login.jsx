import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Login() {
  const { isLoggedIn, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

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
      <h1>Inloggen</h1>
      <p className="lede">
        School-e-mail (@isw.info) en toegangscode.
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
    </section>
  )
}
