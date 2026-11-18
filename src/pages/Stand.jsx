import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { euro, fetchStand } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import BidModal from '../components/BidModal.jsx'
import Charities from '../components/Charities.jsx'
import {
  formatStijgingPct,
  topHoogsteBedragen,
  topStijgers,
} from '../lib/stijgers.js'

const REFRESH_MS = 60_000
/**
 * Kavels per projectie-subtab.
 * 8 = 2 rijen × 4 kolommen op typische 16:9-schoolschermen,
 * zodat de derde rij niet buiten beeld valt.
 */
const PAGE_SIZE = 8
/** Automatische doorrotatie van subtabs op schoolschermen. */
const PAGE_ROTATE_MS = 15_000
/** Fade-out duur laadscherm → stand (houd synchroon met CSS). */
const LOAD_OUT_MS = 520

const logoSrc = `${import.meta.env.BASE_URL}brand/isw-hoogeland-logo.png`

export default function Stand() {
  const { isLoggedIn } = useAuth()
  const [stand, setStand] = useState([])
  const [totaal, setTotaal] = useState(0)
  const [page, setPage] = useState(0)
  const [laden, setLaden] = useState(true)
  const [loaderVisible, setLoaderVisible] = useState(true)
  const [loaderLeaving, setLoaderLeaving] = useState(false)
  const [fout, setFout] = useState('')
  const [actieveKavel, setActieveKavel] = useState(null)
  const loadOutTimer = useRef(null)
  const firstLoadDone = useRef(false)

  const pageCount = Math.max(1, Math.ceil(stand.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageStart = safePage * PAGE_SIZE
  const pageItems = stand.slice(pageStart, pageStart + PAGE_SIZE)
  const rangeLabel =
    stand.length === 0
      ? 'geen kavels'
      : `kavel ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, stand.length)}`
  const stijgers = topStijgers(stand, 3)
  const hoogste = topHoogsteBedragen(stand, 3)

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
      if (!firstLoadDone.current) {
        firstLoadDone.current = true
        setLoaderLeaving(true)
        if (loadOutTimer.current) clearTimeout(loadOutTimer.current)
        loadOutTimer.current = setTimeout(() => {
          setLoaderVisible(false)
          setLoaderLeaving(false)
        }, LOAD_OUT_MS)
      }
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
    return () => {
      if (loadOutTimer.current) clearTimeout(loadOutTimer.current)
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

  function scrollNaarDoelen(event) {
    event.preventDefault()
    const el = document.getElementById('charities-title')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section className="stand">
      {loaderVisible && (
        <div
          className={
            loaderLeaving
              ? 'stand-loading stand-loading--out'
              : 'stand-loading'
          }
          aria-busy={!loaderLeaving}
          aria-live="polite"
          aria-hidden={loaderLeaving || undefined}
        >
          <img
            className="stand-loading__logo"
            src={logoSrc}
            alt="ISW Hoogeland"
            width={220}
            height={64}
          />
          <p className="stand-loading__text">Laden…</p>
        </div>
      )}

      {!laden && (
        <div
          className={
            loaderVisible
              ? 'stand__ready stand__ready--enter'
              : 'stand__ready'
          }
        >
          {/* Projectie-blok: eerste viewport vrij van charities. */}
          <div className="stand__stage">
            <aside className="totaal-banner" aria-live="polite">
              <p className="totaal-banner__label">Totaal opgehaald</p>
              <p className="totaal-banner__bedrag">{euro(totaal)}</p>
            </aside>

            {(stijgers.length > 0 || hoogste.length > 0) && (
              <div className="stand-highlights">
                {stijgers.length > 0 && (
                  <div
                    className="stijgers-bar"
                    aria-label="Top 3 snelst stijgend ten opzichte van startbedrag"
                  >
                    <p className="stijgers-bar__label">Snelst stijgend</p>
                    <ol className="stijgers-bar__list">
                      {stijgers.map((k, i) => (
                        <li key={k.id} className="stijgers-bar__item">
                          <span className="stijgers-bar__rank">{i + 1}</span>
                          <button
                            type="button"
                            className="stijgers-bar__hit"
                            onClick={() => openBieden(k)}
                          >
                            <span className="stijgers-bar__titel">{k.titel}</span>
                            <span className="stijgers-bar__pct">
                              {formatStijgingPct(k.stijgingPct)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {hoogste.length > 0 && (
                  <div
                    className="stijgers-bar stijgers-bar--bedrag"
                    aria-label="Top 3 hoogste bedragen met echt bod"
                  >
                    <p className="stijgers-bar__label">Hoogste bedragen</p>
                    <ol className="stijgers-bar__list">
                      {hoogste.map((k, i) => (
                        <li key={k.id} className="stijgers-bar__item">
                          <span className="stijgers-bar__rank">{i + 1}</span>
                          <button
                            type="button"
                            className="stijgers-bar__hit"
                            onClick={() => openBieden(k)}
                          >
                            <span className="stijgers-bar__titel">{k.titel}</span>
                            <span className="stijgers-bar__pct">
                              {euro(k.hoogsteBod)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

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
                <article
                  key={k.id}
                  className="kavel-tile kavel-tile--bid"
                  role="listitem"
                >
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

            <p className="stand__scroll-cue">
              <a href="#charities-title" onClick={scrollNaarDoelen}>
                ↓ Goede doelen
              </a>
            </p>
          </div>

          {/* Onder de fold, direct na stage — bereikbaar via scroll/cue. */}
          <Charities />
        </div>
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
