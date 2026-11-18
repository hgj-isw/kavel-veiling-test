import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { euro, fetchStand } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import BidModal from '../components/BidModal.jsx'
import Charities from '../components/Charities.jsx'

const REFRESH_MS = 60_000
/**
 * Kavels per projectie-subtab.
 * 8 = 2 rijen × 4 kolommen op typische 16:9-schoolschermen,
 * zodat de derde rij niet buiten beeld valt.
 */
const PAGE_SIZE = 8
/** Automatische doorrotatie van subtabs op schoolschermen. */
const PAGE_ROTATE_MS = 15_000

const logoSrc = `${import.meta.env.BASE_URL}brand/isw-hoogeland-logo.png`

export default function Stand() {
  const { isLoggedIn } = useAuth()
  const [stand, setStand] = useState([])
  const [totaal, setTotaal] = useState(0)
  const [page, setPage] = useState(0)
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

  // Stille auto-refresh (~1 min); geen zichtbare countdown/timestamp.
  useEffect(() => {
    const auto = setInterval(ververs, REFRESH_MS)
    return () => clearInterval(auto)
  }, [])

  // Automatische rotatie tussen subtabs (alleen relevant bij >1 pagina).
  useEffect(() => {
    if (pageCount <= 1) return undefined
    // Pauzeer rotatie terwijl bied-modal open is.
    if (actieveKavel) return undefined
    const tick = setInterval(() => {
      setPage((p) => (Math.min(p, pageCount - 1) + 1) % pageCount)
    }, PAGE_ROTATE_MS)
    return () => clearInterval(tick)
  }, [pageCount, actieveKavel])

  function gaNaarPagina(index) {
    setPage(index)
  }

  function openBieden(kavel) {
    setActieveKavel(kavel)
  }

  if (laden) {
    return (
      <section className="stand-loading" aria-busy="true" aria-live="polite">
        <img
          className="stand-loading__logo"
          src={logoSrc}
          alt="ISW Hoogeland"
          width={220}
          height={64}
        />
        <p className="stand-loading__text">Laden…</p>
      </section>
    )
  }

  return (
    <section className="stand">
      {/* Projectie-blok: vult eerste viewport zodat goede doelen onder de fold blijven. */}
      <div className="stand__stage">
        <aside className="totaal-banner" aria-live="polite">
          <p className="totaal-banner__label">Totaal opgehaald</p>
          <p className="totaal-banner__bedrag">{euro(totaal)}</p>
        </aside>

        <div className="stand__toolbar">
          <div className="stand__actions">
            <button type="button" className="btn btn--ghost" onClick={ververs}>
              Vernieuwen
            </button>
            {!isLoggedIn && (
              <Link className="btn btn--primary" to="/login">
                Inloggen
              </Link>
            )}
          </div>
        </div>

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
              Pagina {safePage + 1}/{pageCount}
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
                  Min. +{euro(k.stapGrootte)}
                  {k.aantalBiedingen > 0
                    ? ` · ${k.aantalBiedingen}×`
                    : ' · nog geen biedingen'}
                </p>
                <span className="kavel-tile__cta">Bieden</span>
              </button>
            </article>
          ))}
        </div>

        {stand.length === 0 && !fout && (
          <p className="empty">Er zijn nog geen actieve kavels.</p>
        )}
      </div>

      {/* Onder de projectie-grid: goede doelen blijven buiten eerste viewport. */}
      <Charities />

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
