const DOELEN = [
  {
    id: 'zonnehof',
    naam: 'KDC Zonnehof',
    tekst:
      'Een veilige, prikkelende buitenruimte voor kinderen met een ernstige meervoudige beperking.',
  },
  {
    id: 'droom',
    naam: 'Droom Je Thuis',
    tekst:
      'Een warm thuis in Naaldwijk voor jongvolwassenen met een verstandelijke of meervoudige beperking.',
  },
  {
    id: 'gef',
    naam: 'Girls Empowerment Foundation',
    tekst:
      'Onderwijs, veiligheid en kansen voor meisjes in Kenia, vanuit een stichting met Westlandse basis.',
  },
]

export default function Charities() {
  return (
    <section className="charities" aria-labelledby="charities-title">
      <div className="charities__intro">
        <h2 id="charities-title">De drie goede doelen</h2>
        <p>Twee doelen dichtbij, één met de blik verder weg.</p>
      </div>
      <ul className="charities__list">
        {DOELEN.map((d) => (
          <li key={d.id} className="charities__item">
            <h3>{d.naam}</h3>
            <p>{d.tekst}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
