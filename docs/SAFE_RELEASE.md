# WvH-Schulchor — sichere Veröffentlichung und Datensicherung

Stand: 20.11.2026. Dieses Dokument ist ein Ablaufplan, **kein durchgeführtes Backup und keine Freigabe**.

## Schutz bestehender Daten
- Vor jeder Änderung prüfen: vorhandene Konten, Liedzuweisungen, Aufnahmen und Storage-Dateien bleiben erhalten.
- Niemals `auth.users`, `public.profiles`, `public.recordings`, `public.assignments` oder Storage-Buckets löschen, neu anlegen oder zurücksetzen, um eine neue Frontend-Version zu veröffentlichen.
- GitHub-Pages-Änderungen am Frontend verändern Supabase-Daten normalerweise nicht. SQL-Migrationen und Storage-Aktionen sind separat zu kontrollieren.
- Preview bleibt unter `/preview/`; Root-Seite erst nach ausdrücklicher Schulfreigabe ändern.

## Wiederherstellbare Sicherung — vor Veröffentlichung ausführen
1. Zugriff auf das Supabase-Projekt durch berechtigte schulische Betreuung klären. Sicherungsdateien **nicht** in GitHub oder öffentliche Chatnachrichten hochladen.
2. Mit einem geeigneten administrativen Supabase-Backupverfahren eine vollständige PostgreSQL-Sicherung erstellen, einschließlich `auth`-Daten, `public`-Tabellen, Schema, Rollen-/Berechtigungskonfiguration und migrationsrelevanten Objekten. Verfügbarkeit automatischer Backups hängt vom Tarif ab.
3. Die **Datei-Inhalte** beider privaten Storage-Buckets `recordings` und `accompaniments` separat gesichert herunterladen. Ein SQL-Dump von Storage-Metadaten enthält **nicht** die Audio-/Videodateien.
4. Sicherung verschlüsselt und zugriffsbeschränkt auf schulisch genehmigtem Speicher aufbewahren; Zeit, Versionsstand, Dateianzahl und Prüfsummen protokollieren.
5. Wiederherstellung in einem **isolierten Testprojekt** erproben. Erst wenn Konten-Zuordnungen, Lieder, Aufnahmen und Abspielbarkeit geprüft sind, Backup als belastbar markieren.
6. Vor jedem sicherheitsrelevanten Datenbank-Update erneut sichern. Keine Zugangsdaten oder Service-Role-Schlüssel im Repository ablegen.

## Sicherheitsprüfung
- RLS ist für `public.profiles`, `public.songs`, `public.assignments`, `public.recordings` aktiv. Dies ersetzt keine echten Tests mit getrennten Schüler- und Lehrerkonten.
- Storage-Buckets sind privat. Schüler dürfen nur eigene Aufnahmen bzw. zugewiesene Begleitungen sehen. Lehrerzugriffe müssen ebenfalls mit Konten geprüft werden.
- `public.is_teacher()` ist eine `SECURITY DEFINER`-Funktion, die von RLS-Policies verwendet wird. **Nicht** pauschal EXECUTE entziehen oder zu SECURITY INVOKER ändern; dies kann bestehende Rechteprüfungen stören.
- `public.song_submission_counts()` ist ebenfalls `SECURITY DEFINER` und liefert rollenabhängig Statistiken. Änderungen erst nach Prüfung von Aufrufern, Ergebnissen und UI.
- Supabase-Sicherheitswarnungen (Stand 20.11.2026): die zwei genannten Funktionen und deaktivierter Schutz gegen bekannte geleakte Passwörter. Letzterer benötigt laut Supabase-Dokumentation Pro oder höher.
- Authentifizierung im Frontend benutzt eine persistente Session; keine geheimen API-Schlüssel im Browser einbauen.

## Freigabe und Test
- Schule/Frau Nolte legt den rechtmäßigen Umgang mit Schülerstimmen, Zugriffsrechten, Aufbewahrung/Löschung, Information und erforderlichen Einwilligungen fest. Das ist **nicht** durch technische Funktionstests ersetzt.
- Getrennt prüfen: Schüler A kann nichts von Schüler B lesen/ändern; Schüler B ebenso; Lehrer kann berechtigte Eingänge sehen; nicht eingeloggter Besucher erhält keine privaten Audios.
- Zwei Aufnahmen mischen und WAV exportieren ist im Test gelungen; mögliches Übersprechen der Begleitmusik bei Mikrofonaufnahme bleibt gesondert zu testen (Kopfhörer).
- Aufnahmen, Gesang, Export und Wiederanmeldung am vorgesehenen PC testen. Mobile Tests sind optional für den gewählten PC-Einsatz.
- Nach erfolgreicher technischer Prüfung und schulischer Freigabe Root-Seite veröffentlichen und erneut auf mehreren Konten prüfen.

## Abnahmekriterien
Ein Release gilt erst als fertig, wenn (a) Sicherung **einschließlich Datei-Inhalten** und Wiederherstellung geprüft, (b) Rechte praktisch geprüft, (c) nötige schulische Freigabe erteilt und (d) Produktionsseite ausdrücklich freigegeben ist.
