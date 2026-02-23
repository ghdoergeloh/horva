# Increment 9: Moco Export (Projektzeiten)

**Ziel:** Erfasste Zeiten für bestimmte Projekte können an Moco exportiert werden – inklusive Task-Details für die Projektabrechnung.

**Vorbedingungen:** Increment 1 (MVP) abgeschlossen.

---

## 1. Konzept

- Export von **Projektzeiten** an Moco (Projektmanagement- und Abrechnungstool).
- Im Gegensatz zum HR Works Export (nur Arbeitsblöcke) werden hier **Task-Details** übermittelt.
- Nur **konfigurierte Projekte** werden exportiert – der Nutzer legt fest, welche Zeittracker-Projekte an welches Moco-Projekt gemappt werden.
- Slots ohne Task oder mit nicht-gemapptem Projekt werden **nicht** exportiert.

---

## 2. Funktionale Anforderungen

| Nr.     | Anforderung        | Beschreibung                                                                                                      |
| ------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| F-MO-01 | Moco verbinden     | Authentifizierung gegenüber der Moco API konfigurieren (API-Key + Subdomain).                                     |
| F-MO-02 | Projekt-Mapping    | Zeittracker-Projekte auf Moco-Projekte mappen. Optional: Zeittracker-Tasks auf Moco-Aufgaben (Activities) mappen. |
| F-MO-03 | Export Vorschau    | Vor dem Export anzeigen: Welche Slots mit welchen Tasks an welches Moco-Projekt exportiert werden.                |
| F-MO-04 | Export durchführen | Zeiteinträge an Moco API senden. Pro Slot ein Moco-Zeiteintrag mit Projekt, Aufgabe und Dauer.                    |
| F-MO-05 | Zeitraum wählen    | Export für einen bestimmten Tag, eine Woche oder einen frei wählbaren Zeitraum.                                   |
| F-MO-06 | Export-Status      | Bereits exportierte Slots markieren, um Doppel-Exporte zu vermeiden.                                              |
| F-MO-07 | Beschreibungsfeld  | Task-Name wird als Beschreibung im Moco-Zeiteintrag übermittelt.                                                  |

---

## 3. Mapping-Beispiel

**Konfiguration:**

```
Zeittracker-Projekt "Kiteto"   → Moco-Projekt "Kiteto Development"
Zeittracker-Projekt "PIA"      → Moco-Projekt "PIA Consulting"
Zeittracker-Projekt "Orga"     → (nicht gemappt, wird nicht exportiert)
```

**Slots eines Tages:**

```
08:54 - 09:30  #34 API Refactoring     (Kiteto)
09:30 - 10:15  #47 Bug fixen           (Kiteto)
10:15 - 10:45  #28 Meeting             (Orga)        ← nicht gemappt
10:45 - 11:00  (kein Task)                            ← kein Task
11:00 - 12:30  #55 PIA Export          (PIA)
```

**Ergebnis für Moco:**

```
Moco-Projekt: Kiteto Development
  08:54 - 09:30  0:36h  "API Refactoring"
  09:30 - 10:15  0:45h  "Bug fixen"

Moco-Projekt: PIA Consulting
  11:00 - 12:30  1:30h  "PIA Export"
```

---

## 4. CLI-Erweiterung

```
tt export moco [Zeitraum]        Projektzeiten an Moco exportieren
tt moco mapping                  Projekt-Mapping anzeigen/bearbeiten

Zeitraum:
  today, yesterday, week, last-week, month, <Datum>, <Von>..<Bis>
```

**Beispiel:**

```bash
$ tt export moco yesterday
  Moco Export – Wed, 2026-02-18

  Moco Project: Kiteto Development
    08:54 - 09:30 | 0:36h | #34 API Refactoring
    09:30 - 10:15 | 0:45h | #47 Bug fixen
    13:00 - 17:30 | 4:30h | #34 API Refactoring
                    Subtotal: 5:51h

  Moco Project: PIA Consulting
    11:00 - 12:30 | 1:30h | #55 PIA Export
                    Subtotal: 1:30h

  Skipped (not mapped): 1:15h (Orga, no task)

? Export to Moco? (y/N) y
✓ Exported 4 entries to Moco (2 projects, 7:21h total).
```
