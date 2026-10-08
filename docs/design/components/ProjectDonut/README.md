# ProjectDonut

Projektanteile im Zeitraum als Ring mit Summe in der Mitte und verknüpfter Legende (Projekt, Stunden, Prozent).

- Ring statt Torte: Mitte trägt die Summe; Segmente in `project-n`, 2 px Abstand in `card` zwischen Segmenten.
- Reihenfolge nach Anteil absteigend, „ohne Aufgabe“ immer zuletzt in `project-none`.
- Mehr als 8 Projekte: die kleinsten werden zu „Weitere“ zusammengefasst (aufklappbar in der Legende).
- Hover oder Fokus auf Segment **oder** Legendenzeile hebt beide hervor und dimmt den Rest; Tooltip mit Projekt, Prozent, Stunden.
- Text immer in Textfarben, nie in Projektfarbe.
