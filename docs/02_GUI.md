# Increment 2: GUI als Webanwendung

**Ziel:** Eine webbasierte Benutzeroberfläche, die alle Zeiterfassungs- und Auswertungsfunktionen visuell zugänglich macht. Die GUI ergänzt die CLI – beide arbeiten auf denselben Daten.

**Vorbedingungen:** Increment 1 (MVP) abgeschlossen.

---

## 1. Allgemeine GUI-Anforderungen

| Nr.     | Anforderung        | Beschreibung                                                                                            |
| ------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| NFA-G01 | Schnelle Bedienung | Häufige Aktionen (Task starten, wechseln, beenden, Arbeit beenden) mit **minimalen Klicks** erreichbar. |
| NFA-G02 | Maus-Optimierung   | Gesamte Bedienung vollständig per Maus möglich, ohne zwingende Tastatureingaben.                        |
| NFA-G03 | Farbcodierung      | Projekte werden durchgängig in ihrer definierten **Projektfarbe** dargestellt.                          |
| NFA-G04 | Parallelbetrieb    | GUI und CLI arbeiten auf denselben Daten. Änderungen in der CLI sind in der GUI sichtbar und umgekehrt. |

---

## 2. Ansichten

### 2.1 Tagesübersicht

Die Tagesübersicht ist die **Startseite** und zeigt alle für den aktuellen Tag relevanten Informationen.

**Aktive Zeiterfassung (oben):**

- Anzeige des aktuell **laufenden Slots** mit Startzeitpunkt, bisheriger Dauer und zugeordnetem Task (falls vorhanden).
- Schnellzugriff-Buttons: **Task wechseln**, **Task beenden**, **Arbeit beenden**.
- Falls kein Slot offen: Button **Arbeit starten** (mit/ohne Task).

**Bereich 1: Anstehende Aufgaben (jetzt fällig)**

- Tasks für heute geplant, **ohne Uhrzeit** oder mit Uhrzeit **in der Vergangenheit**.
- Jeder Task zeigt: Name, Projekt (in Projektfarbe), Labels, bisherige Gesamtzeit.
- Per Klick: Task direkt starten.

**Bereich 2: Später geplante Aufgaben**

- Tasks für heute geplant, deren Uhrzeit **noch in der Zukunft** liegt.
- Gleiche Darstellung wie Bereich 1, aber visuell als „noch nicht akut" erkennbar.

### 2.2 Kalenderansicht

- Darstellung aller Slots in einer **klassischen Kalenderansicht** (Tages-/Wochen-/Monatsansicht).
- Jeder Slot wird in der **Farbe des Projekts** des zugeordneten Tasks dargestellt.
- Slots ohne Task: **neutrale Farbe** (z. B. Grau).
- Slots mit „Task gelöscht": visuell unterscheidbar (z. B. schraffiert).
- **Lücken** zwischen Slots werden visuell hervorgehoben (z. B. gestrichelte Markierung).
- Klick auf Slot: Detail-Ansicht mit Bearbeitungsmöglichkeit.

### 2.3 Timeline-Ansicht

- **Horizontale Zeitblöcke pro Tag** (ähnlich HR Works Wochenansicht).
- Jeder Tag als eine Zeile, Slots als farbige Blöcke in Projektfarbe.
- Zeitachse von erstem bis letztem Slot des Tages.
- Lücken als leere Bereiche sichtbar.
- Schneller visueller Überblick über die Arbeitswoche.

### 2.4 Zeitraum-Auswertung

**Zeitraum-Vorauswahl:** Heute, Gestern, Aktuelle Woche, Letzte Woche, Aktueller Monat, Freie Auswahl.

**Inhalte:**

**1. Gesamte Arbeitszeit**

- Summe aller Slot-Dauern im gewählten Zeitraum.

**2. Kreisdiagramm: Projektanteile**

_Ohne Label-Filter:_

- Jedes Projekt als Kreisabschnitt in **Grundfarbe**.
- Slots ohne Projekt/Task als eigener Abschnitt (neutral).

_Mit Label-Filter (ein Label ausgewählt):_

- Jeder Projekt-Abschnitt wird aufgeteilt:
  - **Dunklerer Farbton:** Tasks **mit** dem gewählten Label.
  - **Hellerer Farbton:** Tasks **ohne** das Label.
- Beispiel: Projekt A (Rot) → Dunkelrot (mit Label) + Hellrot (ohne Label).
- Immer nur **ein Label** gleichzeitig als Filter (keine Überschneidungen).

**3. Detailansicht pro Projekt**

- Liste aller Projekte mit **Gesamtzeit**.
- Jedes Projekt **aufklappbar:**
  - Bei aktivem Label-Filter: Aufteilung in „Zeit mit Label" / „Zeit ohne Label".
  - Auflistung aller Tasks mit jeweiliger Zeit.

**4. Zusätzliche Metriken**

- **Gesamtzeit pro Tag** im gewählten Zeitraum (als Balkendiagramm oder Tabelle).
- **Gesamtzeit pro Woche** (bei Monatsauswahl).
- **Gesamtzeit pro Projekt** (Tabelle mit Sortierung).
- **Durchschnittliche Tagesarbeitszeit** im gewählten Zeitraum.

---

## 3. Interaktionen

### 3.1 Task starten (aus GUI)

- **Aus der Tagesübersicht:** Klick auf einen geplanten Task → Task starten.
- **Schnellstart:** Suchfeld / Dropdown mit letzten Tasks → Auswahl → Start.
- **Neuer Task inline:** Neuen Task direkt aus dem Schnellstart-Dialog erstellen und starten.

### 3.2 Slot bearbeiten

- Klick auf einen Slot (Kalender oder Timeline) → Bearbeitungs-Dialog:
  - Start-/Endzeitpunkt ändern (Zeitpicker).
  - Task zuweisen/ändern/entfernen.
  - Bei Auswirkung auf Nachbar-Slot: Warnung mit Anpassungsvorschlag.

### 3.3 Task-/Projekt-/Label-Verwaltung

- Eigene Verwaltungsseiten für Tasks, Projekte und Labels.
- CRUD-Operationen (Erstellen, Bearbeiten, Archivieren, Löschen).
- Projekt-Farbwähler bei Erstellung/Bearbeitung.
- Toggle für „Erledigte anzeigen" in Task-Listen.
