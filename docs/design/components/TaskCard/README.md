# TaskCard

Eine Aufgabe oder Aktivität als Karte auf „Heute“ und in den Aufgabenlisten.

- **Vorn, direkt nebeneinander:** Checkbox zum Abhaken und runder Start-Knopf (`hv-play`). Läuft die Aufgabe, wird der Start-Knopf orange (`running`) und zeigt Stopp.
- **Einplanen, zwei Wege:**
  - Knopf **„Heute“** (Kalender-Plus) plant mit einem Klick für heute ein – kein Datumswähler. Erscheint bei Hover und Tastaturfokus, wenn die Aufgabe nicht schon für heute geplant ist.
  - **Datums-Chip** (`hv-when`) öffnet den [DateField](#)-Kalender für jedes andere Datum. Ohne Datum gestrichelt („Datum“), gesetzt durchgezogen, überfällig in `destructive`.
- Zustände: offen, **läuft** (`running-soft`, Rand `running`, Marke „läuft“), **überfällig**, **Aktivität** (Wiederholen-Symbol statt Checkbox, nie erledigt), **erledigt** (Haken auf `success`, Titel durchgestrichen in `muted-foreground`, kein Start-Knopf).
- Projekt als Chip mit Projektpunkt; Labels als neutrale Chips. Gesamtzeit rechts in `duration`.
- Tastatur: Leertaste hakt ab, `S` startet, `H` plant für heute ein, `D` öffnet das Datum (Vorschlag).
- Aktivität: Das Wiederholen-Symbol vorn ist ein Knopf „Für heute erledigt“; er schiebt die Aktivität auf ihren nächsten Termin, die Leertaste auf der Karte ebenso (Entscheidung vom 08.10.2026).
- Checkbox: Beim Überfahren grüner Rand, Fläche `accent` und ein blasser Haken – man sieht vor dem Klick, dass man abhakt.
