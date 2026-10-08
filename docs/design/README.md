Horva ist eine Zeiterfassung, die den ganzen Arbeitstag nebenher läuft. Das Design ist **ruhig, schnell und klar**: Es tritt zurück, bis man es braucht, und zeigt jederzeit auf einen Blick, ob gerade ein Slot läuft. Gilt für Desktop- und Web-App (gemeinsame React-Oberfläche, `@horva/ui`).

> Entwurf, Runde 2: Logo (Zeiger als Haken) und Ladeanimation, Datumsfeld und Zeitraum-Auswahl, Farbwähler mit 18 Projektfarben, überarbeitete Aufgabenkarte, Zeitleiste und Auswertung. Dazu die Aufgabenauswahl (TaskPicker). Noch offen: Dialog/Sheet, Toast, Seitenleiste, Leer- und Fehlerzustände.

## Grundsätze

1. **Der laufende Slot ist immer sichtbar.** Orange (`running`) bedeutet nur „läuft“ – nie Hervorhebung, nie Warnung.
2. **Grün führt.** Waldgrün (`primary`) für Primäraktionen, Auswahl, Fokus und aktive Navigation.
3. **Projektfarben ordnen.** Sie sind das wichtigste Ordnungsmittel und erscheinen als Punkt, Chip, Slot-Block und Tortenstück – nie als Text oder Fläche hinter Text.
4. **Zeiten sind Zahlen.** Jede Uhrzeit und Dauer steht in Geist Mono mit gleich breiten Ziffern.
5. **Alles per Tastatur.** Jede Aktion, die bei Hover erscheint, erscheint auch bei Fokus.
6. **Hell und dunkel gleichwertig.** Jedes Text-Flächen-Paar hält 4,5:1, jede Markierung 3:1 – in beiden Modi.

## Sprache und Ton

- Deutsch ist Standard, Englisch gleichwertig. Komponenten müssen 30 % längere Texte aushalten.
- Du-Form vermeiden; knappe Verben im Infinitiv: „Arbeit starten“, „Aufgabe wechseln“, „Stopp“.
- Zustände schlicht benennen: „Nicht am Arbeiten“, „läuft“, „überfällig“, „Keine Slots in dieser Woche“.
- Keine Emoji, keine Ausrufezeichen. Fehlermeldungen sagen, was passiert ist und was hilft: „Speichern fehlgeschlagen. Erneut versuchen?“

## Farbe

| Rolle    | Token                                                         | Verwendung                                                    |
| -------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| Waldgrün | `primary`, `primary-hover`, `accent`                          | Primärknopf, Auswahl, aktive Navigation, Fokusring (`ring`)   |
| Orange   | `running`, `running-text`, `running-soft`                     | ausschließlich „läuft“: Timer, laufender Slot, laufende Karte |
| Grautöne | `background`, `card`, `muted`, `secondary`, `border`          | leicht grün getönte Neutrale, statt violett                   |
| Zustände | `destructive`, `warning`, `success`, `info`                   | immer zusammen mit Symbol oder Wort                           |
| Projekte | `project-1` … `project-18`, `project-none`, `project-deleted` | Projektpunkt, Chip, Slot-Block, Diagramm, Farbwähler          |

- Text: `foreground` auf `background`/`card`; Nebentext `muted-foreground`.
- Orange nie als Fließtext auf Weiß; für die laufende Zeit gibt es `running-text`.
- `warning` ist Gelb und `success` ist Petrol, damit sie nicht mit Lauf-Orange und Waldgrün verwechselt werden.
- Die Projektpalette lässt Waldgrün und Orange bewusst aus. Jede Projektfarbe hat einen eigenen Wert für den dunklen Modus.
- `project-1` … `project-8` sind die Standardreihenfolge für neue Projekte und Diagramme; nebeneinander geprüft auf Unterscheidbarkeit, auch bei Rot-Grün-Schwäche. `project-9` … `project-18` sind weitere Voreinstellungen im Farbwähler. Gespeichert wird der Token-Name, damit der dunkle Modus die passende Stufe nimmt.
- Diagramme: Text nie in Projektfarbe; Legende immer sichtbar; 2 px Abstand in `card` zwischen Segmenten; Hover oder Fokus hebt ein Projekt hervor und dimmt die anderen.
- Diagramme ohne Projektbezug nutzen `chart-1` … `chart-5`.

## Schrift

- **Geist** für alles, **Geist Mono** für Zeiten. Stile: `display`, `title`, `heading`, `body`, `body-strong`, `small`, `caption`; Zeiten in `timer`, `duration`, `duration-small`.
- Normaler Text ist 14px (`body`). Seitentitel `display`, Abschnittsköpfe `heading`.

## Raum, Form, Tiefe

- 4px-Raster: `space-1` … `space-8`. Seitenrand `space-6`, Karteninnenabstand `space-3`/`space-4`.
- Radien: `radius-sm` Chips und Slot-Blöcke, `radius-md` Knöpfe und Felder, `radius-lg` Karten, `radius-xl` Dialoge.
- Tiefe sparsam: `shadow-sm` für Karten, `shadow-md` für Menüs und gezogene Karten, `shadow-lg` für Dialoge. Ränder (`border`) tragen die Struktur, nicht Schatten.
- Fokus: 2px durchgezogener `ring` mit 2px Abstand auf jedem bedienbaren Element.

## Bewegung und Ebenen

- Kurz und ruhig: `duration-fast` für Hover, `duration-base` für Aufklappen, `duration-slow` für Dialoge; Kurve `ease-out`.
- Nur der laufende Slot pulsiert (`duration-pulse`). Bei reduzierter Bewegung pulsiert nichts.
- Ebenen: `z-sticky` < `z-sidebar` < `z-overlay` < `z-modal` < `z-popover` < `z-toast`.

## Logo

Bildmarke „Zeiger als Haken“: ein Ring (`primary`) mit orangem Zeitbogen (`running`); die beiden Zeiger stehen auf 10 und 2 und bilden zugleich einen Haken, der orange Drehpunkt ist die Achse. So steckt im Zeichen alles, was Horva tut: Zeit erfassen (Uhr), Aufgaben abhaken (Haken). Flach, ohne Verläufe und Leuchten; ab 16 px erkennbar.

![Horva Wortmarke](assets/Logos/horva-wordmark.svg)

- `horva-app-icon.svg`: App-Symbol, Favicon, Taskleiste (grüne Fläche, helle Uhr, oranger Bogen).
- `horva-mark.svg` / `horva-mark-dark.svg`: Bildmarke in der Seitenleiste, auf hellem bzw. dunklem Grund.
- `horva-wordmark.svg` / `horva-wordmark-dark.svg`: Bildmarke mit „horva“ in Kleinbuchstaben (Geist SemiBold).
- Ladeanimation (_Loader_): dieselbe Marke, die Zeiger drehen wie bei einer Uhr – der Minutenzeiger 12-mal so schnell wie der Stundenzeiger. Bei reduzierter Bewegung stehen sie als Haken still.

## Symbole

lucide-react, 16px (in Knöpfen) bzw. 20px (Navigation), Strichstärke 2, Farbe `currentColor`. Wichtige: Play (Start), Square (Stopp), ArrowLeftRight (Wechseln), Repeat (Aktivität), Check (erledigt), Search, Plus.
