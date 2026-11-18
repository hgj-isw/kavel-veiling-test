import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { euro, placeBid } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function BidModal({ kavel, onClose, onSuccess }) {
  const { isLoggedIn, user } = useAuth()
  const navigate = useNavigate()
  const titleId = useId()
  const inputRef = useRef(null)
  const [bedrag, setBedrag] = useState('')
  const [fout, setFout] = useState('')
  const [ok, setOk] = useState('')
  const [bezig, setBezig] = useState(false)

  const minimum = kavel?.minimumVolgendBod ?? 0

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!kavel) return null

  function gaLogin() {
    onClose()
    navigate('/login', { state: { from: '/' } })
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!isLoggedIn) {
      gaLogin()
      return
    }
    setFout('')
    setOk('')
    setBezig(true)
    try {
      const bid = await placeBid({ kavelId: kavel.id, bedrag })
      setOk(`Gelukt! Je bod van ${euro(bid.bedrag)} is geplaatst.`)
      setBedrag('')
      onSuccess?.()
    } catch (err) {
      setFout(err.message || 'Bod plaatsen mislukt.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal__head">
          <div>
            <p className="eyebrow">Bieden</p>
            <h2 id={titleId}>{kavel.titel}</h2>
          </div>
          <button
            type="button"
            className="btn btn--ghost modal__close"
            onClick={onClose}
            aria-label="Sluiten"
          >
            Sluiten
          </button>
        </div>

        <p className="muted">{kavel.omschrijving}</p>

        <div className="bid-info">
          <p>
            Huidig hoogste bod: <strong>{euro(kavel.hoogsteBod)}</strong>
          </p>
          <p>
            Stapgrootte: <strong>{euro(kavel.stapGrootte)}</strong>
          </p>
          <p>
            Minimum nieuw bod: <strong>{euro(minimum)}</strong>
          </p>
          {isLoggedIn ? (
            <p className="muted">Je biedt als {user.email}</p>
          ) : (
            <p className="muted">Log in om een bod te plaatsen.</p>
          )}
        </div>

        {!isLoggedIn ? (
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={gaLogin}>
              Inloggen om te bieden
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Annuleren
            </button>
          </div>
        ) : (
          <form className="form form--bid" onSubmit={onSubmit}>
            <label>
              Jouw bod (€)
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                step="1"
                value={bedrag}
                onChange={(e) => setBedrag(e.target.value)}
                placeholder={minimum ? String(minimum) : ''}
                required
              />
            </label>

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
              <button
                type="submit"
                className="btn btn--primary"
                disabled={bezig}
              >
                {bezig ? 'Bezig…' : 'Bod bevestigen'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Annuleren
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
