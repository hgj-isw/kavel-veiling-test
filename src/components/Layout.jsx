import { Link, NavLink, Outlet } from 'react-router-dom'
import { apiBaseUrl, usingMockApi } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'

const logoSrc = `${import.meta.env.BASE_URL}brand/isw-hoogeland-logo.png`

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand" aria-label="ISW Hoogeland kavelveiling">
            <img
              className="brand__logo"
              src={logoSrc}
              alt="ISW Hoogeland"
              width={220}
              height={64}
            />
            <span className="brand__tag">Kavelveiling</span>
          </Link>

          <nav className="nav" aria-label="Hoofdmenu">
            <NavLink to="/" end>
              Stand
            </NavLink>
          </nav>

          <div className="header-user">
            {user ? (
              <>
                <span className="header-user__email" title={user.email}>
                  {user.email}
                </span>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => logout()}
                >
                  Uitloggen
                </button>
              </>
            ) : (
              <Link className="btn btn--ghost" to="/login">
                Inloggen
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>ISW Hoogeland · kavelveiling voor het goede doel</p>
        <p className="site-footer__api muted">
          {usingMockApi
            ? 'Data: lokale mock (geen VITE_API_URL in deze build)'
            : `Data: Cloudflare API · ${apiBaseUrl}`}
        </p>
      </footer>
    </div>
  )
}
