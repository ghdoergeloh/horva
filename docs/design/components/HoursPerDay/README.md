# HoursPerDay

Stunden je Tag als Säulen, gestapelt nach Projekt, mit gestrichelter Soll-Linie (z. B. 8:00).

- Eine y-Achse in Stunden, feine Rasterlinien in `border`, Achsentext `muted-foreground` in Geist Mono.
- Segmente in `project-n` mit 2 px Abstand, Summe über jeder Säule. Leere Tage bleiben als Achsenbeschriftung sichtbar.
- Legende oben; Hover/Fokus auf ein Segment dimmt die anderen Projekte und zeigt Tooltip (Projekt, Tag, Dauer).
- Ab 15 Tagen: Säulen ohne Summen-Beschriftung, Wochen-Trenner. „Tabelle anzeigen“ blendet die Werte als Tabelle ein.
