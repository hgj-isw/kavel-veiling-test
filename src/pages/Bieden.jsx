import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import {
  euro,
  getKavel,
  hoogsteBodVoorKavel,
  listBiedingen,
  listKavels,
  placeBid,
} from '../data/store.js'

export default function Bieden() {
  const { isLoggedIn, user } = useAuth()
  const location = useLocation()
  const [kavelId, setKavelId] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [fout, setFout] = useState('')
  const [ok, setOk] = useState('')
  const [tick, setTick] = useState(0)

  const kavels = useMemo(
    () => listKavels().filter((k) => k.actief),
    [tick, ok],
  )

  useEffect(() => {
    if (!kavelId && kavels[0]) setKavelId(kavels[0].id)
  }, [kavels, kavelId])

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1)
    window.addEventListener('kavel-db-changed', refresh)
    return () => window.removeEventListener('kavel-db-changed', refresh)
  }, [])

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const kavel = kavelId ? getKavel(kavelId) : null
  const hoogste = kavel ? hoogsteBodVoorKavel(kavel.id) : 0
  const bidsCount = kavel ? listBiedingen({ kavelId: kavel.id }).length : 0
  const minimum =
    kavel && bidsCount === 0
      ? kavel.startBedrag
      : kavel
        ? hoogste + kavel.stapGrootte
        : 0

  function onSubmit(e) {
    e.preventDefault()
    setFout('')
    setOk('')
    try {
      const bid = placeBid({
        kavelId,
        bedrag,
        email: user.email,
      })
      setOk(`Gelukt! Je bod van ${euro(bid.bedrag)} op “${kavel.titel}” is geplaatst.`)
      setBedrag('')
      setTick((t) => t + 1)
    } catch (err) {
      setFout(err.message)
    }
  }

  return (
    <section className="panel">
      <p className="eyebrow">Biedpagina</p>
      <h1>Plaats een bod</h1>
      <p className="lede">
        Je biedt als <strong>{user.email}</strong>. Je bod moet minstens het
        hoogste bod plus de stapgrootte van die kavel zijn.
      </p>

      <form className="form form--bid" onSubmit={onSubmit}>
        <label>
          Kavel
          <select
            value={kavelId}
            onChange={(e) => {
              setKavelId(e.target.value)
              setFout('')
              setOk('')
            }}
            required
          >
            {kavels.map((k) => (
              <option key={k.id} value={k.id}>
                {k.titel}
              </option>
            ))}
          </select>
        </label>

        {kavel && (
          <div className="bid-info">
            <p>
              Huidig hoogste bod: <strong>{euro(hoogste)}</strong>
            </p>
            <p>
              Stapgrootte (min. overbieding):{' '}
              <strong>{euro(kavel.stapGrootte)}</strong>
            </p>
            <p>
              Minimum nieuw bod: <strong>{euro(minimum)}</strong>
            </p>
            <p className="muted">{kavel.omschrijving}</p>
          </div>
        )}

        <label>
          Jouw bod (€)
          <input
            type="number"
            inputMode="decimal"
            step="1"
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
            placeholder={minimum ? String(minimum) : ''}
            required
          />
        </label>
        {/* Geen HTML min= — die toont Engelse browserfouten; validatie gebeurt in placeBid(). */}

        {fout && (
          <p className="msg msg--error" role="alert">
            {fout}
          </p>
        )}
        {ok && (
          <p className="msg msg--ok" role="status">
            {ok}
          </p>
        )}

        <div className="btn-row">
          <button type="submit" className="btn btn--primary">
            Bod plaatsen
          </button>
          <Link className="btn btn--ghost" to="/">
            Terug naar stand
          </Link>
        </div>
      </form>
    </section>
  )
}
