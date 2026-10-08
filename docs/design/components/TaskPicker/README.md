# TaskPicker

Auswahlfeld für Aufgaben (Select mit Suche): Aufgaben nach Projekt gruppiert und alphabetisch sortiert, Suche über Aufgaben- und Projektnamen, neue Aufgabe direkt anlegen – samt Projektwahl im selben Popover (#33).

- **Auslöser:** Select-Feld mit Projektpunkt, Aufgabe und Projekt. Wird genutzt in „Arbeit starten / Aufgabe wechseln“, in der Slot-Tabelle und im Slot-Dialog. In der Slot-Zeile öffnet es direkt mit Fokus im Suchfeld.
- **Liste:** Gruppenköpfe mit Projektpunkt, Name und Anzahl (bleiben beim Scrollen oben stehen); Projekte und Aufgaben alphabetisch (deutsch sortiert). Rechts die bisher erfasste Zeit in `duration-small`. Die aktuelle Auswahl trägt einen Haken. Ohne Suchbegriff steht „Ohne Aufgabe“ ganz oben.
- **Suche:** filtert Aufgabe **oder** Projekt (Projektname zeigt die ganze Gruppe); Treffer unterstrichen in `primary`. Keine Treffer → Hinweis, Enter legt neu an.
- **Ein Feld für alles:** Beim Öffnen liegt der Fokus im Suchfeld. Der getippte Text filtert die Liste und ist zugleich der Titel einer neuen Aufgabe – es gibt kein zweites Eingabefeld. Sobald Text da ist, steht ganz oben die Zeile „„Titel“ als neue Aufgabe in [Projekt ▾]“ (⌘/Strg+Enter); ohne Treffer genügt Enter.
- **Projekt für die neue Aufgabe:** als Auswahl direkt in der Neu-Zeile („„Titel“ als neue Aufgabe in [Projekt ▾]“), vorbelegt mit dem gefilterten oder zuletzt genutzten Projekt. Klick auf den Chip (oder Tab) wechselt im selben Popover zum Schritt **Projekt wählen** (Zurück-Pfeil, Suche, alle Projekte alphabetisch, „Neues Projekt …“); danach kehrt der Fokus ins Feld zurück. Die neue Aufgabe wird sofort ausgewählt.
- **Tastatur:** ↑/↓ bewegt (überspringt Gruppenköpfe), Enter übernimmt, ⌘/Strg+Enter legt neu an, Esc schließt und gibt den Fokus ans Feld zurück. Enter löst nie zwei Dinge aus (#34). Die Kurzhilfe steht im Fuß. Markiert ist standardmäßig der erste Treffer, nicht die Neu-Zeile.
- **Basis im Code:** React Aria `ComboBox` mit `ListBoxSection` je Projekt; als Dialogvariante (Aufgabe wechseln) dieselbe Liste in einem `Dialog`.
- 400 px: Popover nimmt die volle Breite ein, Kurzhilfe entfällt.
