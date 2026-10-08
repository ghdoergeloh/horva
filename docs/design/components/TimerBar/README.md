# TimerBar

Die Leiste oben im Hauptbereich zeigt immer, ob und woran gerade gearbeitet wird.

- **Ruhezustand:** grauer Punkt (`project-none`), „Nicht am Arbeiten“, Tages- und Wochensumme, Primärknopf „Arbeit starten“.
- **Läuft:** Fläche `running-soft`, Rand und pulsierender Punkt `running`, Zeit in `timer` mit `running-text`, Projekt mit Projektpunkt; „Wechseln“ (sekundär) und „Stopp“ (nur Symbol).
- Lange Aufgabennamen werden mit … gekürzt, voller Name im Tooltip. Die Zeit wird nie gekürzt.
- `role="status"`; die Sekunden werden nicht vorgelesen (aria-live nur bei Zustandswechsel).
- Bei 400px Breite: Summen ausblenden, Knöpfe nur als Symbol.
