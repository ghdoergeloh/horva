# DateRangePicker

Zeitraum-Auswahl für Auswertungen und Zeitleiste: zwei Datumsfelder in einem, Voreinstellungen links, Kalender rechts, × zum Leeren.

- Voreinstellungen: Heute, Gestern, Diese Woche, Letzte Woche, Dieser Monat, Letzter Monat, Letzte 30 Tage. Ein Klick übernimmt sofort.
- Im Kalender: erster Klick setzt den Anfang, zweiter das Ende; dazwischen `accent`, Ränder `primary`. Fuß zeigt die Anzahl Tage.
- Neben dem Feld blättern ‹ › um die Länge des Zeitraums (Woche → Woche, Monat → Monat).
- Auf 400 px Breite stehen die Voreinstellungen als waagerechte, scrollbare Chip-Reihe über dem Kalender.
- Basis im Code: React Aria `DateRangePicker` / `RangeCalendar`.
