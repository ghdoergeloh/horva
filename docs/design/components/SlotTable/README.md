# SlotTable

Die Slots eines Tages als Tabelle: lesen, Lücken füllen, bearbeiten.

- Spalten: Von, Bis (Monospace), Dauer (rechtsbündig, `muted-foreground`), Aufgabe, Projekt-Chip, Bearbeiten.
- **Lücke:** kursive Zeile „Lücke“ mit Dauer und Knopf „Slot eintragen“.
- **Bearbeiten:** Zeile wird `accent`; Start/Ende als Zeitfelder, Aufgabe über die Aufgabenauswahl; **Speichern und Abbrechen sind immer sichtbar**. Enter speichert (nur das, nie zusätzlich Aufklappen), Escape verwirft, Klick nach außen speichert einen gültigen Entwurf; ist er ungültig, bleibt die Zeile offen und zeigt den Hinweis (#34, Entscheidung vom 08.10.2026).
- Hinweis unter der Zeile, wenn ein Nachbar-Slot angepasst wird (`info`-Symbol).
- **Läuft:** Bis-Spalte zeigt „jetzt“ (`hv-live`), Dauer in `running-text`.
