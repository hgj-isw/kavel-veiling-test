-- Start-kavels + allowlist. Geen biedersnamen op de stand (alleen in biedingen-tabel).
-- Voer uit na schema.sql (lokaal of remote).

DELETE FROM biedingen;
DELETE FROM sessions;
DELETE FROM kavels;
DELETE FROM allowlist;

INSERT INTO allowlist (email, is_admin, active) VALUES
  ('hgj@isw.info', 1, 1),
  ('elt@isw.info', 0, 1);

INSERT INTO kavels (id, titel, omschrijving, start_bedrag, stap_grootte, actief, sort_order) VALUES
  ('k1', 'Zelfgebakken taart', 'Een verse taart naar keuze, gebakken door ouders/docenten.', 5, 1, 1, 1),
  ('k2', 'Vip-parkeerplaats (1 week)', 'Een week lang de beste parkeerplek bij school.', 10, 2, 1, 2),
  ('k3', 'Lunch met de rector', 'Een informele lunch voor twee, op school.', 15, 5, 1, 3),
  ('k4', 'Maatwerk-workshop', 'Keuze uit fotografie, koken of sportclinic (45 min).', 20, 5, 1, 4),
  ('k5', 'Huiswerkhulp (2 uur)', 'Persoonlijke bijles of huiswerkbegeleiding door een docent.', 12, 2, 1, 5),
  ('k6', 'Klassenfeest-DJ', 'DJ-set van een uur tijdens een klasactiviteit.', 25, 5, 1, 6),
  ('k7', 'Ontbijt op school', 'Vers ontbijt voor twee, geserveerd in de aula.', 8, 1, 1, 7),
  ('k8', 'Foto-shoot campus', 'Professionele portretfoto’s op het schoolterrein.', 18, 3, 1, 8),
  ('k9', 'Sportles naar keuze', 'Eigen sportles van 45 minuten (voetbal, hockey of fitness).', 10, 2, 1, 9),
  ('k10', 'Kunstwerk van leerlingen', 'Uniek schilderij of collage gemaakt door de kunstklas.', 15, 5, 1, 10),
  ('k11', 'Koffie voor de klas', 'Koffie/thee-rondje voor een hele klas tijdens een lesuur.', 20, 2, 1, 11),
  ('k12', 'Fiets-tune-up', 'Professionele onderhoudsbeurt voor je fiets.', 25, 10, 1, 12),
  ('k13', 'Plantjes-pakket', 'Drie kamerplanten met potten, klaar voor je kamer of klas.', 7, 1, 1, 13),
  ('k14', 'Escape-room avond', 'Plaatsen voor vier personen bij een lokale escape room.', 40, 5, 1, 14),
  ('k15', 'Homemade soep + brood', 'Verse soep voor vier personen, met knapperig brood.', 12, 2, 1, 15),
  ('k16', 'Schoolmerchandise-pakket', 'Trui, mok en stickerpakket van ISW Hoogeland.', 30, 5, 1, 16),
  ('k17', 'Bordspellenmiddag', 'Begeleide bordspellenmiddag voor max. zes personen.', 10, 2, 1, 17),
  ('k18', 'Tech-hulp thuis', 'Laptop/telefoon opruimen, updates en tips (60 min).', 15, 5, 1, 18),
  ('k19', 'Zelfgemaakte jam', 'Drie potten seizoensjam, thuis ingemaakt.', 6, 1, 1, 19),
  ('k20', 'Yoga-sessie', 'Rustige yogales van 45 minuten voor beginners.', 12, 2, 1, 20),
  ('k21', 'Filmavond-pakket', 'Popcorn, snacks en streaming-avond voor de klas.', 22, 3, 1, 21),
  ('k22', 'Tuinier-workshop', 'Zaaien en stekken in de schooltuin (60 min).', 8, 2, 1, 22),
  ('k23', 'Karaoke-uur', 'Karaoke-set + begeleiding voor een feestelijk lesuur.', 18, 3, 1, 23),
  ('k24', 'Bakles cupcakes', 'Cupcakes bakken en versieren met een docent/ouder.', 14, 2, 1, 24),
  ('k25', 'VIP-zitplaats aula', 'Voorste rij bij de volgende schoolvoorstelling.', 9, 1, 1, 25),
  ('k26', 'Handgemaakte kaarsen', 'Set van vier geurkaarsen, handgemaakt door ouders.', 11, 2, 1, 26),
  ('k27', 'Quizmaster voor een les', 'Kant-en-klare quiz met prijzen voor één lesuur.', 16, 4, 1, 27),
  ('k28', 'Picknick-mand', 'Gevulde picknickmand voor twee, klaar voor het park.', 20, 5, 1, 28);

INSERT INTO biedingen (id, kavel_id, bedrag, email, tijdstip) VALUES
  ('b1', 'k1', 6, 'elt@isw.info', '2026-11-16T10:00:00.000Z'),
  ('b2', 'k1', 8, 'hgj@isw.info', '2026-11-16T11:30:00.000Z'),
  ('b3', 'k12', 35, 'elt@isw.info', '2026-11-16T12:00:00.000Z'),
  ('b4', 'k3', 25, 'hgj@isw.info', '2026-11-16T13:00:00.000Z'),
  ('b5', 'k14', 50, 'elt@isw.info', '2026-11-16T14:00:00.000Z'),
  ('b6', 'k21', 28, 'hgj@isw.info', '2026-11-16T15:00:00.000Z');
