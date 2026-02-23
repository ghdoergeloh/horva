# Increment 8: HR Works Export (Arbeitszeit)

**Ziel:** Erfasste Arbeitszeiten können an HR Works exportiert werden – ausschließlich als aggregierte Arbeitszeit-Slots (ohne Task-/Projekt-Details).

**Vorbedingungen:** Increment 1 (MVP) abgeschlossen.

---

## 1. Konzept

- Export der **reinen Arbeitszeiten** an HR Works.
- Es werden **keine Task-Wechsel** übermittelt – nur die zusammengefassten Arbeits-Blöcke eines Tages (Start erste Arbeit bis Ende letzte Arbeit, mit Pausen als Unterbrechungen).
- Slots werden zu **zusammenhängenden Arbeitsblöcken** aggregiert: aufeinanderfolgende Slots werden zusammengefasst, Lücken werden als Pausen interpretiert.

---

## 2. Funktionale Anforderungen

| Nr.     | Anforderung               | Beschreibung                                                                                                             |
| ------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| F-HW-01 | HR Works verbinden        | Authentifizierung gegenüber der HR Works API konfigurieren.                                                              |
| F-HW-02 | Arbeitsblöcke aggregieren | Slots eines Tages zu Arbeitsblöcken zusammenfassen: aufeinanderfolgende Slots (ohne Lücke) = ein Block. Lücken = Pausen. |
| F-HW-03 | Export Vorschau           | Vor dem Export eine Vorschau anzeigen: Welche Tage mit welchen Arbeitsblöcken und Pausen werden übermittelt.             |
| F-HW-04 | Export durchführen        | Arbeitsblöcke an HR Works API senden.                                                                                    |
| F-HW-05 | Zeitraum wählen           | Export für einen bestimmten Tag, eine Woche oder einen frei wählbaren Zeitraum.                                          |
| F-HW-06 | Export-Status             | Bereits exportierte Tage markieren, um Doppel-Exporte zu vermeiden.                                                      |
| F-HW-07 | Konflikterkennung         | Warnung, wenn in HR Works bereits Einträge für den Zeitraum existieren.                                                  |

---

## 3. Aggregationslogik

**Beispiel:** Ein Tag mit folgenden Slots:

```
08:54 - 09:30  #34 API Refactoring     (Backend)
09:30 - 10:15  #47 Bug fixen           (Backend)
10:15 - 10:45  #28 Meeting             (Orga)
10:45 - 11:00  (kein Task)
        -- 30min Lücke (Pause) --
11:30 - 12:30  #34 API Refactoring     (Backend)
12:30 - 17:30  #34 API Refactoring     (Backend)
```

**Ergebnis für HR Works:**

```
Arbeitsblock 1: 08:54 - 11:00 (2:06h)
Pause:          11:00 - 11:30 (0:30h)
Arbeitsblock 2: 11:30 - 17:30 (6:00h)
```

Task- und Projekt-Informationen werden **nicht** übermittelt.

---

## 4. CLI-Erweiterung

```
tt export hrworks [Zeitraum]     Arbeitszeit an HR Works exportieren

Zeitraum:
  today, yesterday, week, last-week, month, <Datum>, <Von>..<Bis>
```

**Beispiel:**

```bash
$ tt export hrworks week
  HR Works Export – Week 8 (2026-02-16 – 2026-02-20)

  Day        Blocks                              Total
  Mon 16     08:42 - 12:15, 12:45 - 18:03       8:51h
  Tue 17     09:38 - 12:00, 12:30 - 18:16       8:08h
  Wed 18     09:26 - 12:30, 13:00 - 18:46       8:50h
  Thu 19     09:13 - 12:00, 12:30 - 18:16       8:33h
  Fri 20     08:46 - 10:40                       1:54h  (today, in progress)

  ⚠ Fri 20 is still in progress. Only completed days will be exported.

? Export Mon 16 – Thu 19 to HR Works? (y/N) y
✓ Exported 4 days to HR Works.
```
