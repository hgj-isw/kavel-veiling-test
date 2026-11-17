import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { TEST_ACCOUNTS, TEST_PIN } from '../auth/authConfig.js'

export default function Login() {
  const { isLoggedIn, loginAs, loginWithPin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  const [email, setEmail] = useState('hgj@isw.info')
  const [pin, setPin] = useState('')
  const [fout, setFout] = useState('')

  if (isLoggedIn) return <Navigate to={from} replace />

  function go(next) {
    navigate(next.admin ? '/admin' : from, { replace: true })
  }

  function onQuickLogin(accountEmail) {
    setFout('')
    try {
      go(loginAs(accountEmail))
    } catch (err) {
      setFout(err.message)
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    setFout('')
    try {
      go(loginWithPin(email, pin))
    } catch (err) {
      setFout(err.message)
    }
  }

  return (
    <section className="panel login-panel">
      <p className="eyebrow">TEST-login</p>
      <h1>Inloggen voor de testveiling</h1>
      <p className="lede">
        Geen echte schoolwachtwoorden. Kies een testaccount of gebruik PIN{' '}
        <code>{TEST_PIN}</code>.
      </p>

      <div className="quick-login">
        {TEST_ACCOUNTS.map((acc) => (
          <button
            key={acc.email}
            type="button"
            className="btn btn--primary quick-login__btn"
            onClick={() => onQuickLogin(acc.email)}
          >
            Inloggen als {acc.label}
            <span>{acc.email} · {acc.rol}</span>
          </button>
        ))}
      </div>

      <form className="form" onSubmit={onSubmit}>
        <h2>Of met e-mail + test-PIN</h2>
        <label>
          School-e-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Test-PIN
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={TEST_PIN}
            autoComplete="current-password"
            required
          />
        </label>
        {fout && (
          <p className="msg msg--error" role="alert">
            {fout}
          </p>
        )}
        <button type="submit" className="btn btn--secondary">
          Inloggen met PIN
        </button>
      </form>
    </section>
  )
}
