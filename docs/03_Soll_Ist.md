# Increment 3: Soll-/Ist-Vergleich für Arbeitszeit

**Ziel:** Der Nutzer kann eine tägliche Soll-Arbeitszeit definieren und sieht automatisch berechnete Abweichungen (Delta) pro Tag, Woche und als laufendes Gleitzeit-Saldo.

**Vorbedingungen:** Increment 1 (MVP) abgeschlossen. Increment 2 (GUI) empfohlen, aber nicht zwingend – Soll-/Ist-Werte können auch in der CLI angezeigt werden.

---

## 1. Konzept

### 1.1 Tagessollzeit

- Der Nutzer definiert eine **Tagessollzeit** (z. B. 8:00h).
- Optional: unterschiedliche Sollzeiten pro **Wochentag** (z. B. Mo–Do 8:12h, Fr 6:12h für eine 39h-Woche).
- Samstag und Sonntag haben standardmäßig **0:00h** Sollzeit (konfigurierbar).

### 1.2 Soll-/Ist-Delta

- **Pro Tag:** Ist-Arbeitszeit minus Tagessollzeit = Delta.
  - Positiv (+1:30h) = Überstunden.
  - Negativ (-2:00h) = Unterstunden.
- **Pro Woche:** Summe der Tages-Deltas.
- **Pro Monat:** Summe der Tages-Deltas des Monats.

### 1.3 Gleitzeit-Saldo

- Ein **laufendes Konto**, das alle Tages-Deltas kumuliert.
- Startdatum und Startsaldo konfigurierbar (z. B. „Ab 01.01.2026 mit Saldo +5:00h").
- Wird täglich automatisch aktualisiert.

---

## 2. Funktionale Anforderungen

| Nr.     | Anforderung                 | Beschreibung                                                                   |
| ------- | --------------------------- | ------------------------------------------------------------------------------ |
| F-SI-01 | Tagessollzeit konfigurieren | Globale Sollzeit oder individuelle Sollzeit pro Wochentag festlegen.           |
| F-SI-02 | Tages-Delta berechnen       | Automatische Berechnung: Ist-Arbeitszeit – Sollzeit = Delta.                   |
| F-SI-03 | Wochen-Delta                | Summe aller Tages-Deltas der Woche.                                            |
| F-SI-04 | Gleitzeit-Saldo             | Laufendes kumulatives Konto aller Tages-Deltas ab konfigurierbarem Startdatum. |
| F-SI-05 | Startsaldo setzen           | Initiales Saldo und Startdatum konfigurieren (für bestehende Gleitzeitkonten). |

---

## 3. Darstellung

### 3.1 CLI

**In `tt status`:**

```bash
$ tt status
▶ Working on #34 "API Refactoring" (Backend) since 14:00 (3:30h)

  Today so far: 7:15h / 8:00h target (-0:45h)
  Flexi balance: +12:30h
```

**In `tt log week --compact`:**

```
  Mon 16    8:12h  +0:12h  ████████████████████░░░░
  Tue 17    7:45h  -0:15h  ███████████████████░░░░░
  Wed 18    8:30h  +0:30h  █████████████████████░░░
  Thu 19    8:40h  +0:40h  ████████████████████░░░░
  Fri 20     –     -8:00h
                   Total: 33:07h | Week: -6:53h | Flexi: +5:37h
```

**In `tt summary`:**

```
  Total work time: 33:07h
  Target:          40:00h
  Week delta:       -6:53h
  Flexi balance:   +5:37h
```

### 3.2 GUI

- **Tagesübersicht:** Fortschrittsbalken Ist vs. Soll, Tages-Delta, Gleitzeit-Saldo.
- **Timeline-Ansicht:** Delta pro Tag neben den Zeitblöcken (wie im HR Works Screenshot).
- **Auswertung:** Wochen-/Monats-Zusammenfassung mit Soll/Ist/Delta.
