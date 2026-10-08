# Loader

Ladeanimation aus der Bildmarke E: Ring und oranger Zeitbogen stehen, die beiden Zeiger drehen sich wie bei einer Uhr um den orangen Drehpunkt.

- **Verhältnis wie bei einer echten Uhr:** Der lange Zeiger (Minute) dreht 12-mal so schnell wie der kurze (Stunde). Eine Minutenrunde dauert `--loader-minute` (Standard 1,2 s), der Stundenzeiger braucht 14,4 s.
- Start- und Ruhestellung ist das Logo: Zeiger auf 10 und 2 bilden den Haken.
- Farben: Ring und Zeiger `primary`, Bogen und Drehpunkt `running`. In gefüllten Knöpfen (`on-fill`) nehmen Ring und Zeiger die Textfarbe des Knopfs an.
- Größen: 16 px in Knöpfen, 20–32 px in Listen und Karten, 64 px für ganze Seiten (Start der Desktop-App, Einrichtung).
- `role="img"` mit `aria-label="Lädt"`; im Knopf zusätzlich `aria-busy="true"` und ein Text („Speichern …“).
- Unter 400 ms keinen Lader zeigen (Flackern vermeiden); stattdessen Skelettflächen in `muted`.
- `prefers-reduced-motion`: Die Zeiger stehen still in der Haken-Stellung.
