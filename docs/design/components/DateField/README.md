# DateField

Datumsfeld zum Tippen (Segmente TT.MM.JJJJ) mit Kalender-Popover und einem ×, das das Datum direkt im Feld entfernt.

- Aufbau: Segmente · × (nur wenn ein Wert gesetzt ist) · Trennlinie · Kalender-Knopf. Das × löscht sofort, ohne das Popover zu öffnen; der Fokus bleibt im Feld.
- Kalender: Montag zuerst, heute mit Punkt in `primary`, Auswahl als `primary`-Fläche. Fuß mit **Heute**, **Morgen**, **Entfernen**.
- Optional mit Uhrzeit (`HH:MM`, 24 h oder 12 h laut Einstellung).
- Tastatur: Pfeil hoch/runter ändert das Segment, `Entf`/`Backspace` auf leerem Segment springt zurück; `Alt+↓` öffnet den Kalender; im Kalender Pfeiltasten, `Bild↑/↓` Monat, Enter wählt, Escape schließt und fokussiert das Feld. `T` setzt heute.
- Ungültig: Rand `destructive` plus Meldung darunter (`hv-help is-error`).
- Basis im Code: React Aria `DatePicker` / `DateField` / `Calendar`.
