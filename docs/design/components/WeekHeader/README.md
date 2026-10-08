# WeekHeader

Kopf der Zeitleiste: Woche blättern, zurück zu „Diese Woche“, Projektfilter, Umschalter Slots / Aufgaben / Arbeitszeiten. Die Vorschau zeigt die Ansicht **Arbeitszeiten**.

- Titel in `title`, Pfeile als ruhige Symbolknöpfe; „Nächste Woche“ deaktiviert, wenn sie in der Zukunft liegt.
- Umschalter = `hv-segmented` (React Aria ToggleButtonGroup), Pfeiltasten wechseln. Der Umschalter ändert nur, was ein **aufgeklappter Tag** zeigt – die Tagesbalken bleiben, wie bei Slots und Aufgaben.
- Ansicht **Arbeitszeiten** (#76):
  - Tagesbalken zeigen die zusammengefassten Zeiträume als durchgehende Blöcke in `primary` (statt der einzelnen Slots in Projektfarbe); der laufende Zeitraum wie gewohnt gestreift.
  - Aufgeklappt erscheint statt der Slot-Tabelle die Liste der Zeiträume: Von, Bis, Dauer, was darin steckt (Anzahl Slots, Projekte), dazwischen die Pausen als ruhige Zeilen.
  - Kopieren je Zeitraum und „Tag kopieren“ im Fuß (kopiert z. B. „09:20–12:02, 13:05–18:12“); Fuß zeigt Arbeitszeit und Pausensumme.
- Bei 400 px bricht der Kopf in zwei Zeilen: Woche oben, Filter und Umschalter darunter.
