/**
 * Metric “snelst stijgend”:
 * procentuele stijging t.o.v. startbedrag =
 *   (hoogsteBod − startBedrag) / startBedrag × 100
 *
 * Alleen kavels met ≥1 echt bod. Geen “vorige poll”-delta:
 * die hangt van client-state af en verdwijnt bij refresh/hard reload.
 */
export function topStijgers(kavels, limit = 3) {
  return (kavels || [])
    .filter((k) => k.aantalBiedingen > 0 && Number(k.startBedrag) > 0)
    .map((k) => {
      const start = Number(k.startBedrag)
      const hoogste = Number(k.hoogsteBod)
      const stijgingPct = ((hoogste - start) / start) * 100
      return { ...k, stijgingPct }
    })
    .sort(
      (a, b) =>
        b.stijgingPct - a.stijgingPct ||
        b.hoogsteBod - a.hoogsteBod ||
        a.titel.localeCompare(b.titel, 'nl'),
    )
    .slice(0, limit)
}

export function formatStijgingPct(pct) {
  const rounded = Math.round(pct)
  const abs = Math.abs(rounded)
  return `${rounded > 0 ? '+' : ''}${abs.toLocaleString('nl-NL')}%`
}
