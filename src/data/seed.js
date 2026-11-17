/** Start-nepdata voor de testveiling. Later vervangbaar door SharePoint-lijsten. */

export const SEED_KAVELS = [
  {
    id: 'k1',
    titel: 'Zelfgebakken taart',
    omschrijving: 'Een verse taart naar keuze, gebakken door ouders/docenten.',
    startBedrag: 5,
    stapGrootte: 1,
    actief: true,
  },
  {
    id: 'k2',
    titel: 'Vip-parkeerplaats (1 week)',
    omschrijving: 'Een week lang de beste parkeerplek bij school.',
    startBedrag: 10,
    stapGrootte: 2,
    actief: true,
  },
  {
    id: 'k3',
    titel: 'Lunch met de rector',
    omschrijving: 'Een informele lunch voor twee, op school.',
    startBedrag: 15,
    stapGrootte: 5,
    actief: true,
  },
  {
    id: 'k4',
    titel: 'Maatwerk-workshop',
    omschrijving: 'Keuze uit fotografie, koken of sportclinic (45 min).',
    startBedrag: 20,
    stapGrootte: 5,
    actief: true,
  },
  {
    id: 'k12',
    titel: 'Fiets-tune-up',
    omschrijving: 'Professionele onderhoudsbeurt voor je fiets.',
    startBedrag: 25,
    stapGrootte: 10,
    actief: true,
  },
]

export const SEED_BIEDINGEN = [
  {
    id: 'b1',
    kavelId: 'k1',
    bedrag: 6,
    email: 'elt@isw.info',
    tijdstip: '2026-11-16T10:00:00.000Z',
  },
  {
    id: 'b2',
    kavelId: 'k1',
    bedrag: 8,
    email: 'hgj@isw.info',
    tijdstip: '2026-11-16T11:30:00.000Z',
  },
  {
    id: 'b3',
    kavelId: 'k12',
    bedrag: 35,
    email: 'elt@isw.info',
    tijdstip: '2026-11-16T12:00:00.000Z',
  },
]
