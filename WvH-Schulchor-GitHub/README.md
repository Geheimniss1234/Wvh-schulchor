# WvH Schulchor – Vorführversion

Eine lokal im Browser laufende **technische Vorführversion** der virtuellen Schulchor-Plattform. Gestaltung in Waldgrün, Creme und Gold.

## Starten

`index.html` in einem Browser öffnen. Für Mikrofonaufnahmen muss die Seite über HTTPS oder `localhost` bereitgestellt werden. Alternativ lokal im Projektordner `python -m http.server 8000` starten und `http://localhost:8000` öffnen.

## Was bereits demonstriert wird

- Lehrkraft- und Schüleransicht
- Chorprojekte erstellen (gespeichert im Browser)
- Mikrofonaufnahme und Wiedergabe (in der laufenden Sitzung)
- Aufnahmen zur Prüfung freigeben
- Hörraum für freigegebene Aufnahmen
- Einfaches Mehrspur-Mischpult mit Lautstärkereglern

## Noch nicht implementiert

- Microsoft 365 Anmeldung, echte Benutzerverwaltung und Rollenprüfung
- Sichere Speicherung auf einem Server, Datensicherung und Datenschutzfreigabe
- Synchronisation der Aufnahmen, Audioexport und professionelle Klangbearbeitung
- Dateien/Noten hochladen, Nachrichtenversand und Schülerzuweisungen

**Wichtig:** Keine echten Schülerdaten oder personenbezogenen Aufnahmen für diese Vorführung verwenden. Die Lehrkraft-/Schülerumschaltung ist keine Zugriffskontrolle.
