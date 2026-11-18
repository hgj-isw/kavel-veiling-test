const DOELEN = [
  {
    id: 'zonnehof',
    naam: 'KDC Zonnehof',
    tekst:
      'Kinderdienstencentrum in Naaldwijk: dagbehandeling en een veilige, prikkelende plek voor kinderen met een ernstige meervoudige of verstandelijke beperking.',
    url: 'https://www.ipsedebruggen.nl/kinderdienstencentrum-zonnehof-naaldwijk',
  },
  {
    id: 'droom',
    naam: 'Droom Je Thuis',
    tekst:
      'Ouderinitiatief in hartje Naaldwijk: een warm, zelfstandig thuis voor jongvolwassenen met een verstandelijke of meervoudige beperking.',
    url: 'https://droomjethuis.nl/',
  },
  {
    id: 'gef',
    naam: 'Girls Empowerment Foundation',
    tekst:
      'Westlandse stichting die meisjes in Kenia steunt met onderwijs, een veilig thuis, voeding en de kans om hun eigen toekomst vorm te geven.',
    url: 'https://girlsempowerment.nl/',
  },
]

export default function Charities() {
  return (
    <section className="charities" aria-labelledby="charities-title">
      <div className="charities__intro">
        <h2 id="charities-title">ISW steunt drie goede doelen</h2>
        <p>
          Met deze kavelveiling haalt ISW Hoogeland geld op voor drie organisaties
          die dichtbij — en verder weg — écht verschil maken.
        </p>
      </div>
      <ul className="charities__list">
        {DOELEN.map((d) => (
          <li key={d.id} className="charities__item">
            <h3>
              <a
                className="charities__link"
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {d.naam}
              </a>
            </h3>
            <p>{d.tekst}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
