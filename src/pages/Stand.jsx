import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { euro, getPubliekeStand, getTotaalOpgehaald } from '../data/store.js'

const REFRESH_MS = 60_000

export default function Stand() {
  const [stand, setStand] = useState(() => getPubliekeStand())
  const [totaal, setTotaal] = useState(() => getTotaalOpgehaald())
  const [laatste, setLaatste] = useState(() => new Date())
  const [seconden, setSeconden] = useState(60)

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

  return (
    <section className="stand">
      <div className="stand__hero">
        <p className="eyebrow">Live stand</p>
        <h1>ISW Hoogeland kavelveiling</h1>
        <p className="lede">
          Hoogste bod per kavel — zonder namen. De stand vernieuwt automatisch
          ongeveer elke minuut.
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

      <div className="kavel-grid" role="list">
        {stand.map((k) => (
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
