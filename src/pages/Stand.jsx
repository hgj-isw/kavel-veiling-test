import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { euro, getPubliekeStand, getTotaalOpgehaald } from '../data/store.js'

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
  const [stand, setStand] = useState(() => getPubliekeStand())
  const [totaal, setTotaal] = useState(() => getTotaalOpgehaald())
  const [laatste, setLaatste] = useState(() => new Date())
  const [seconden, setSeconden] = useState(60)
  const [page, setPage] = useState(0)
  const [pageTick, setPageTick] = useState(PAGE_ROTATE_MS / 1000)

  const pageCount = Math.max(1, Math.ceil(stand.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageStart = safePage * PAGE_SIZE
  const pageItems = stand.slice(pageStart, pageStart + PAGE_SIZE)
  const rangeLabel =
    stand.length === 0
      ? 'geen kavels'
      : `kavel ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, stand.length)}`

  function ververs() {
    setStand(getPubliekeStand())
    setTotaal(getTotaalOpgehaald())
    setLaatste(new Date())
    setSeconden(60)
  }

  useEffect(() => {
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
  }, [pageCount])

  function gaNaarPagina(index) {
    setPage(index)
    setPageTick(PAGE_ROTATE_MS / 1000)
  }

  return (
    <section className="stand">
      <div className="stand__hero">
        <p className="eyebrow">Live stand</p>
        <h1>ISW Hoogeland kavelveiling</h1>
        <p className="lede">
          Hoogste bod per kavel — zonder namen. De stand vernieuwt automatisch
          ongeveer elke minuut. Bij veel kavels wisselen de pagina’s automatisch.
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
          <Link className="btn btn--primary" to="/bieden">
            Ga bieden
          </Link>
        </div>
      </div>

      <aside className="totaal-banner" aria-live="polite">
        <p className="totaal-banner__label">Totaal opgehaald</p>
        <p className="totaal-banner__bedrag">{euro(totaal)}</p>
        <p className="totaal-banner__hint">
          Som van het hoogste bod per kavel
        </p>
      </aside>

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
          <article key={k.id} className="kavel-tile" role="listitem">
            <h2>{k.titel}</h2>
            <p>{k.omschrijving}</p>
            <p className="kavel-tile__bid">{euro(k.hoogsteBod)}</p>
            <p className="kavel-tile__hint">
              Min. overbieding: {euro(k.stapGrootte)}
              {k.aantalBiedingen > 0
                ? ` · ${k.aantalBiedingen} bieding${k.aantalBiedingen === 1 ? '' : 'en'}`
                : ' · nog geen biedingen'}
            </p>
          </article>
        ))}
      </div>

      {stand.length === 0 && (
        <p className="empty">Er zijn nog geen actieve kavels.</p>
      )}
    </section>
  )
}
