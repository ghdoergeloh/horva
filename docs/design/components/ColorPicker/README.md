# ColorPicker

Farbwahl für Projekte: 18 abgestimmte Voreinstellungen (`project-1` … `project-18`) plus Feld für eine eigene Hex-Farbe.

- Die ersten acht sind auf Unterscheidbarkeit nebeneinander geprüft (auch bei Rot-Grün-Schwäche) und werden neuen Projekten der Reihe nach vergeben.
- 9–18 sind weitere Voreinstellungen; Waldgrün und Orange fehlen absichtlich, damit Projekte nicht wie „primär“ oder „läuft“ aussehen.
- Jede Voreinstellung hat einen eigenen Wert für den dunklen Modus. Gespeichert wird der Token-Name (z. B. `project-3`), nicht der Hex-Wert; nur eigene Farben werden als Hex gespeichert.
- Auswahl: Ring in `foreground` und Haken. Tastatur: Pfeiltasten im Raster (Radiogruppe), Enter übernimmt.
