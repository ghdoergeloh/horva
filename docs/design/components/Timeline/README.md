# Timeline

Wochenansicht der Zeitleiste: je Tag ein waagerechter Balken mit Stundenskala, Slot-Blöcken in Projektfarbe und Tagessumme; ein Tag lässt sich zur Slot-Tabelle aufklappen.

- Raster: Spalten `Tag | Balken | Summe` (64 px · flexibel · 56 px). Skala und Balken teilen exakt dieselbe Spalte, damit nichts versetzt ist (#58).
- Der Bereich der Skala reicht vom frühesten Start bis zum spätesten Ende der Woche, gerundet auf volle Stunden, **inklusive des laufenden Slots** (#75). Stundenlinien als feine `border`-Linien im Balken.
- Spur `card` mit Rand `border` (auf `muted` erreichen nicht alle Projektfarben 3:1), Slot-Blöcke `project-n` mit `radius-sm`/4 px Ecken und 1 px Abstand zur Spur, sodass aufeinanderfolgende Slots getrennt bleiben.
- **Laufender Slot:** Projektfarbe mit orangen Schrägstreifen, pulsiert ruhig, orange „Jetzt“-Kante am Ende.
- Hover und Tastaturfokus auf einem Block zeigen den Tooltip (Aufgabe, Projekt, Von–Bis, Dauer) und heben ihn mit Ring hervor; Klick öffnet den Slot in der Tabelle.
- Heute: Tagesname in `primary`. Lücken bleiben als leere Spur sichtbar.
- Bei 400 px: Skala nur jede zweite Stunde, Summe unter dem Tagesnamen.
