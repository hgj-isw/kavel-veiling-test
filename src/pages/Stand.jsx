import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { euro, fetchStand } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import BidModal from '../components/BidModal.jsx'

const REFRESH_MS = 60_000
/**
 * Kavels per projectie-subtab.
 * 8 = 2 rijen × 4 kolommen op typische 16:9-schoolschermen,
 * zodat de derde rij niet buiten beeld valt.
 */
const PAGE_SIZE = 8
/** Automatische doorrotatie van subtabs op schoolschermen. */
const PAGE_ROTATE_MS = 15_000

export default function Stand() {
  const { isLoggedIn } = useAuth()
  const [stand, setStand] = useState([])
  const [totaal, setTotaal] = useState(0)
  const [laatste, setLaatste] = useState(() => new Date())
  const [seconden, setSeconden] = useState(60)
  const [page, setPage] = useState(0)
  const [pageTick, setPageTick] = useState(PAGE_ROTATE_MS / 1000)
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState('')
  const [actieveKavel, setActieveKavel] = useState(null)

  const pageCount = Math.max(1, Math.ceil(stand.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageStart = safePage * PAGE_SIZE
  const pageItems = stand.slice(pageStart, pageStart + PAGE_SIZE)
  const rangeLabel =
    stand.length === 0
      ? 'geen kavels'
      : `kavel ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, stand.length)}`

  async function ververs() {
    try {
      const data = await fetchStand()
      setStand(data.kavels || [])
      setTotaal(data.totaalOpgehaald ?? 0)
      setFout('')
    } catch (err) {
      setFout(err.message || 'Stand laden mislukt.')
    } finally {
      setLaatste(new Date())
      setSeconden(60)
      setLaden(false)
    }
  }

  useEffect(() => {
    ververs()
    const onChange = () => ververs()
    window.addEventListener('kavel-db-changed', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('kavel-db-changed', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  useEffect(() => {
    const tick = setInterval(() => {
      setSeconden((s) => {
        if (s <= 1) {
          ververs()
          return 60
        }
        return s - 1
      })
    }, 1000)
    const auto = setInterval(ververs, REFRESH_MS)
    return () => {
      clearInterval(tick)
      clearInterval(auto)
    }
  }, [])

  // Automatische rotatie tussen subtabs (alleen relevant bij >1 pagina).
  useEffect(() => {
    if (pageCount <= 1) return undefined
    // Pauzeer rotatie terwijl bied-modal open is.
    if (actieveKavel) return undefined
    const tick = setInterval(() => {
      setPageTick((s) => {
        if (s <= 1) {
          setPage((p) => (Math.min(p, pageCount - 1) + 1) % pageCount)
          return PAGE_ROTATE_MS / 1000
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [pageCount, actieveKavel])

  function gaNaarPagina(index) {
    setPage(index)
    setPageTick(PAGE_ROTATE_MS / 1000)
  }

  function openBieden(kavel) {
    setActieveKavel(kavel)
  }

  return (
    <section className="stand">
      <div className="stand__hero">
        <p className="eyebrow">Live stand</p>
        <h1>ISW Hoogeland kavelveiling</h1>
        <p className="lede">
          Hoogste bod per kavel — zonder namen. Klik op een kavel om te bieden.
          De stand vernieuwt automatisch; bij veel kavels wisselen de pagina’s.
        </p>
        <div className="stand__meta">
          <span>
            Laatst vernieuwd:{' '}
            {laatste.toLocaleTimeString('nl-NL', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
          <span>Volgende refresh over ~{seconden}s</span>
          <button type="button" className="btn btn--ghost" onClick={ververs}>
            Nu vernieuwen
          </button>
          {!isLoggedIn && (
            <Link className="btn btn--primary" to="/login">
              Inloggen om te bieden
            </Link>
          )}
        </div>
      </div>

      <aside className="totaal-banner" aria-live="polite">
        <p className="totaal-banner__label">Totaal opgehaald</p>
        <p className="totaal-banner__bedrag">{euro(totaal)}</p>
        <p className="totaal-banner__hint">
          Som van echte hoogste biedingen (zonder startbedrag tot er geboden is)
        </p>
      </aside>

      {fout && (
        <p className="msg msg--error" role="alert">
          {fout}
        </p>
      )}

      {stand.length > 0 && (
        <div className="stand-pager" role="tablist" aria-label="Kavelpagina’s">
          <div className="stand-pager__tabs">
            {Array.from({ length: pageCount }, (_, i) => {
              const from = i * PAGE_SIZE + 1
              const to = Math.min((i + 1) * PAGE_SIZE, stand.length)
              const active = i === safePage
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={
                    active
                      ? 'stand-pager__tab stand-pager__tab--active'
                      : 'stand-pager__tab'
                  }
                  onClick={() => gaNaarPagina(i)}
                >
                  {from}–{to}
                </button>
              )
            })}
          </div>
          <p className="stand-pager__meta" aria-live="polite">
            Pagina {safePage + 1} van {pageCount} · {rangeLabel}
            {pageCount > 1 ? ` · wissel over ~${pageTick}s` : null}
          </p>
        </div>
      )}

      <div
        key={safePage}
        className="kavel-grid kavel-grid--page"
        role="list"
        aria-label={`Kavels ${rangeLabel}`}
      >
        {pageItems.map((k) => (
          <article key={k.id} className="kavel-tile kavel-tile--bid" role="listitem">
            <button
              type="button"
              className="kavel-tile__hit"
              onClick={() => openBieden(k)}
              aria-label={`Bieden op ${k.titel}`}
            >
              <h2>{k.titel}</h2>
              <p>{k.omschrijving}</p>
              <p className="kavel-tile__bid">{euro(k.hoogsteBod)}</p>
              <p className="kavel-tile__hint">
                Min. overbieding: {euro(k.stapGrootte)}
                {k.aantalBiedingen > 0
                  ? ` · ${k.aantalBiedingen} bieding${k.aantalBiedingen === 1 ? '' : 'en'}`
                  : ' · nog geen biedingen'}
              </p>
              <span className="kavel-tile__cta">Bieden</span>
            </button>
          </article>
        ))}
      </div>

      {laden && stand.length === 0 && !fout && (
        <p className="empty">Stand laden…</p>
      )}

      {!laden && stand.length === 0 && !fout && (
        <p className="empty">Er zijn nog geen actieve kavels.</p>
      )}

      {actieveKavel && (
        <BidModal
          kavel={actieveKavel}
          onClose={() => setActieveKavel(null)}
          onSuccess={() => {
            ververs()
          }}
        />
      )}
    </section>
  )
}
