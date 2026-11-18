import { Link, NavLink, Outlet } from 'react-router-dom'
import { apiBaseUrl, usingMockApi } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand">
            <span className="brand__mark">ISW</span>
            <span className="brand__text">
              <strong>Hoogeland</strong>
              <em>Kavelveiling</em>
            </span>
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
        <p>ISW Hoogeland · goede-doelen kavelveiling</p>
        <p className="site-footer__api muted">
          {usingMockApi
            ? 'Data: lokale mock (geen VITE_API_URL in deze build)'
            : `Data: Cloudflare API · ${apiBaseUrl}`}
        </p>
      </footer>
    </div>
  )
}
