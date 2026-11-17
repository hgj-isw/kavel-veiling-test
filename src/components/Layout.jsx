import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Layout() {
  const { user, isAdmin, logout } = useAuth()

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
            <NavLink to="/bieden">Bieden</NavLink>
            {isAdmin && <NavLink to="/admin">Control Center</NavLink>}
          </nav>

          <div className="header-user">
            {user ? (
              <>
                <span className="header-user__email" title={user.email}>
                  {user.email}
                  {isAdmin ? ' · admin' : ''}
                </span>
                <button type="button" className="btn btn--ghost" onClick={logout}>
                  Uitloggen
                </button>
              </>
            ) : (
              <Link className="btn btn--ghost" to="/login">
                Inloggen (test)
              </Link>
            )}
          </div>
        </div>
        <div className="test-banner" role="status">
          TEST-omgeving met nepdata — geen echte SharePoint-koppeling
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>ISW Hoogeland · goede-doelen kavelveiling · lokale testopslag</p>
      </footer>
    </div>
  )
}
