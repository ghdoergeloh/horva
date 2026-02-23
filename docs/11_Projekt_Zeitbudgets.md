# Increment 11: Projekt-Zeitbudgets

**Ziel:** Projekten kann ein Stunden-Budget zugewiesen werden. Der Fortschritt wird verfolgt und bei Annäherung an das Limit wird gewarnt.

**Vorbedingungen:** Increment 1 (MVP) abgeschlossen. Increment 2 (GUI) empfohlen für visuelle Fortschrittsanzeige.

---

## 1. Konzept

- Jedem Projekt kann ein **Zeitbudget** in Stunden zugewiesen werden (z. B. 40h für Projekt X).
- Optional: **Zeitraum** für das Budget (z. B. „40h pro Monat" oder „120h insgesamt").
- Die erfasste Gesamtzeit aller Slots des Projekts wird gegen das Budget gerechnet.
- **Warn-Schwellwerte** bei Annäherung (z. B. 80%) und bei Überschreitung (100%).

---

## 2. Funktionale Anforderungen

| Nr.     | Anforderung                | Beschreibung                                                                            |
| ------- | -------------------------- | --------------------------------------------------------------------------------------- |
| F-ZB-01 | Budget zuweisen            | Einem Projekt ein Zeitbudget in Stunden zuweisen.                                       |
| F-ZB-02 | Budget-Typ                 | Budget-Typ konfigurieren: **Gesamt** (einmalig) oder **pro Monat** (wiederkehrend).     |
| F-ZB-03 | Fortschritt berechnen      | Automatische Berechnung: erfasste Zeit / Budget = Fortschritt in %.                     |
| F-ZB-04 | Warn-Schwellwerte          | Warnung bei konfigurierbaren Schwellwerten (Default: 80% und 100%).                     |
| F-ZB-05 | Warnung bei Überschreitung | Beim Starten eines Tasks in einem Projekt mit überschrittenem Budget: Hinweis anzeigen. |
| F-ZB-06 | Budget-Übersicht           | Anzeige aller Projekte mit Budget, Fortschritt und verbleibenden Stunden.               |

---

## 3. CLI-Erweiterung

**Projekt-Budget setzen:**

```bash
$ tt project edit #1 --budget 40h --budget-type monthly
✎ Project #1 "Backend" updated
  Budget: 40:00h / month
```

**Budget-Übersicht in `tt project list`:**

```bash
$ tt project list
  Projects:

  #  Project     Color   Tasks    Budget         Used      Remaining
  1  Backend     red     3 / 5    40:00h/month   32:15h    7:45h (81%) ⚠
  2  Frontend    green   1 / 2    20:00h/month   12:30h    7:30h (63%)
  3  Orga        yellow  1 / 1    –              –         –
  4  DevOps      purple  1 / 1    10:00h total   8:45h     1:15h (88%) ⚠
```

**Warnung beim Task-Start:**

```bash
$ tt start #34
⚠ Project "Backend" is at 81% of monthly budget (32:15h / 40:00h, 7:45h remaining)
▶ Working on #34 "API Refactoring v2" (Backend) since 14:00
```

---

## 4. GUI-Darstellung

- **Projekt-Liste:** Fortschrittsbalken pro Projekt (grün → gelb → rot).
- **Tagesübersicht:** Dezenter Hinweis bei Tasks aus Projekten mit hohem Budget-Verbrauch.
- **Auswertung:** Budget-Verbrauch als zusätzliche Spalte in der Projekt-Detailansicht.
