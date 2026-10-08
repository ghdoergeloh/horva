# SlotTable

Die Slots eines Tages als Tabelle: lesen, Lücken füllen, bearbeiten.

- Spalten: Von, Bis (Monospace), Dauer (rechtsbündig, `muted-foreground`), Aufgabe, Projekt-Chip, Bearbeiten.
- **Lücke:** kursive Zeile „Lücke“ mit Dauer und Knopf „Slot eintragen“.
- **Bearbeiten:** Zeile wird `accent`; Start/Ende als Zeitfelder, Aufgabe über die Aufgabenauswahl; **Speichern und Abbrechen sind immer sichtbar**. Enter speichert (nur das, nie zusätzlich Aufklappen), Escape verwirft, Klick nach außen behält den Entwurf und markiert ihn (#34).
- Hinweis unter der Zeile, wenn ein Nachbar-Slot angepasst wird (`info`-Symbol).
- **Läuft:** Bis-Spalte zeigt „jetzt“ (`hv-live`), Dauer in `running-text`.
