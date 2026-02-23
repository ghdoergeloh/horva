# Increment 1: MVP – Kernfunktionalität mit CLI

**Ziel:** Eine voll funktionsfähige Zeiterfassungs-Anwendung als CLI-Tool, das Slots, Tasks, Projekte und Labels verwaltet.

**Vorbedingungen:** Keine – dies ist das Basis-Increment.

---

## 1. Datenmodell

### 1.1 Slot

- Jeder Slot hat einen **Startzeitpunkt** und einen **Endzeitpunkt** (auf volle Minuten gerundet).
- Ein Slot kann **optional** einem Task zugeordnet sein.
- Es existiert zu jedem Zeitpunkt **maximal ein offener Slot** (Slot ohne Endzeitpunkt).
- Zwischen Slots dürfen **zeitliche Lücken** entstehen.
- Ein Slot hat eine von drei Zuordnungen:
  - **Task zugeordnet** – Slot ist einem konkreten Task zugewiesen.
  - **Kein Task** – Slot wurde ohne Task erstellt.
  - **Task gelöscht** – dem Slot war ein Task zugeordnet, der nachträglich gelöscht wurde.

### 1.2 Task

- Ein Task hat einen **Namen** und gehört **genau einem Projekt** an.
- Ohne explizite Projektzuordnung wird das **Default-Projekt** verwendet.
- Tasks können mit **einem oder mehreren Labels** versehen werden.
- Tasks können für ein **Datum** eingeplant werden (optional mit **Uhrzeit**).
- Ein Task kann über seine Lebenszeit **mehreren Slots** zugeordnet sein.
- Tasks können **Notizen** (Freitext) und **Links/Bookmarks** (URLs, Dateipfade) haben.
- **Status-Lebenszyklus:**
  - **Offen** – aktiv, kann bearbeitet und Slots zugeordnet werden.
  - **Erledigt** – abgeschlossen. Wird in Listen/Auswahl **ausgeblendet** (Toggle zum Einblenden). Bleibt in Auswertungen und bestehenden Slots erhalten.
  - **Archiviert** – ausgeblendet, bleibt in Slots und Auswertungen erhalten.
  - **Gelöscht** – unwiderruflich entfernt. Betroffene Slots erhalten die Markierung **„Task gelöscht"**.

### 1.3 Projekt

- Ein Projekt hat einen **Namen** und eine **Farbe**.
- Es existiert ein **Default-Projekt**, das nicht gelöscht oder archiviert werden kann.
- Projekte können **archiviert** oder **gelöscht** werden:
  - **Archivieren:** Projekt wird ausgeblendet, bleibt in Tasks, Slots und Auswertungen erhalten.
  - **Löschen:** Projekt wird als „gelöscht" markiert. Tasks bleiben erhalten und zeigen „Projekt gelöscht". Slots bleiben unverändert.

### 1.4 Label

- Labels sind **global** (ein Set für alle Projekte).
- Ein Task kann **mehrere Labels** haben.
- Labels können erstellt, Tasks zugewiesen und wieder entfernt werden.

---

## 2. Funktionale Anforderungen

### 2.1 Zeiterfassung (Slot-Management)

| Nr.     | Anforderung              | Beschreibung                                                                                                                                                                                                                                                                               |
| ------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-SL-01 | Task starten             | Erstellt einen neuen Slot mit dem gewählten Task. Startzeitpunkt = jetzt. Falls ein offener Slot existiert, wird dieser automatisch beendet (Endzeitpunkt = jetzt).                                                                                                                        |
| F-SL-02 | Task beenden             | Setzt den Endzeitpunkt des aktuellen Slots. Erstellt automatisch einen **neuen Slot ohne Task** (Startzeitpunkt = Endzeitpunkt des vorherigen).                                                                                                                                            |
| F-SL-03 | Arbeit starten ohne Task | Erstellt einen neuen Slot ohne Task-Zuordnung. Startzeitpunkt = jetzt.                                                                                                                                                                                                                     |
| F-SL-04 | Arbeit beenden           | Setzt den Endzeitpunkt des aktuellen Slots, **ohne** einen neuen Slot zu erstellen.                                                                                                                                                                                                        |
| F-SL-05 | Task dem Slot zuweisen   | Wenn der aktuelle Slot keinen Task hat, kann nachträglich ein Task zugewiesen werden (kein neuer Slot).                                                                                                                                                                                    |
| F-SL-06 | Zeiten bearbeiten        | Start- und Endzeitpunkt eines Slots können manuell angepasst werden.                                                                                                                                                                                                                       |
| F-SL-07 | Nachbar-Slot-Warnung     | Bei Zeitänderung mit Auswirkung auf Nachbar-Slot: **Anpassungsvorschlag** anzeigen. Nutzer muss bestätigen oder ablehnen.                                                                                                                                                                  |
| F-SL-08 | Exklusivität             | Maximal ein aktiver Task. Neuen Task starten beendet automatisch den vorherigen Slot.                                                                                                                                                                                                      |
| F-SL-09 | Lücken / Pausen          | Zeitliche Lücken zwischen Slots innerhalb eines Tages sind zulässig und werden als **Pausen** interpretiert. Pausen werden nicht explizit gespeichert, sondern aus den Lücken zwischen aufeinanderfolgenden Slots **hergeleitet**. In allen Ansichten werden Pausen visuell hervorgehoben. |

### 2.2 Task-Management

| Nr.     | Anforderung      | Beschreibung                                                    |
| ------- | ---------------- | --------------------------------------------------------------- |
| F-TA-01 | Task erstellen   | Name + Projekt (Default-Projekt falls keins angegeben).         |
| F-TA-02 | Task einplanen   | Datum zuweisen (optional mit Uhrzeit).                          |
| F-TA-03 | Labels zuweisen  | Ein oder mehrere globale Labels zuweisen/entfernen.             |
| F-TA-04 | Task erledigt    | Als erledigt markieren. Ausblenden aus aktiven Listen (Toggle). |
| F-TA-05 | Task archivieren | Ausblenden aus allen aktiven Ansichten.                         |
| F-TA-06 | Task löschen     | Unwiderruflich entfernen. Slots → „Task gelöscht".              |
| F-TA-07 | Notizen          | Freitext-Notizen an Tasks anhängen.                             |
| F-TA-08 | Links/Bookmarks  | URLs und Dateipfade an Tasks anhängen.                          |

### 2.3 Projekt-Management

| Nr.     | Anforderung         | Beschreibung                                              |
| ------- | ------------------- | --------------------------------------------------------- |
| F-PR-01 | Projekt erstellen   | Name + Farbe.                                             |
| F-PR-02 | Default-Projekt     | Systemseitig, nicht lösch-/archivierbar.                  |
| F-PR-03 | Projekt archivieren | Ausblenden, bleibt in Tasks/Slots/Auswertungen.           |
| F-PR-04 | Projekt löschen     | Als „gelöscht" markiert. Tasks zeigen „Projekt gelöscht". |

### 2.4 Label-Management

| Nr.     | Anforderung              | Beschreibung                                     |
| ------- | ------------------------ | ------------------------------------------------ |
| F-LA-01 | Label erstellen          | Globales Label mit Name.                         |
| F-LA-02 | Label zuweisen/entfernen | An Tasks hinzufügen/entfernen. Mehrere pro Task. |

---

## 3. CLI-Spezifikation

### 3.1 Design-Prinzipien

1. **Schnelligkeit** – häufige Aktionen mit minimaler Eingabe.
2. **Sinnvolle Defaults** – ohne Parameter interaktive Auswahl oder naheliegende Aktion.
3. **Konsistente Struktur** – `tt <ressource> <aktion> [optionen]` (Ausnahme: Zeiterfassungs-Befehle ohne Ressource).
4. **Farbige Ausgabe** – Projekte in Projektfarbe, Status und Labels visuell unterscheidbar.
5. **Kurze Aliase** – jeder Befehl hat einen Kurzalias.
6. **Kontextbewusstsein** – Befehle wissen, was gerade läuft.

### 3.2 Befehlsübersicht

```
tt <command> [options]

Zeiterfassung:
  tt start [Referenz]        Starte Task oder Arbeitszeit ohne Task     (Alias: tt s)
  tt stop                    Beende aktuellen Task, Arbeitszeit läuft   (Alias: tt x)
  tt done                    Beende Arbeitszeit komplett                 (Alias: tt d)
  tt status                  Zeige aktuellen Status                     (Alias: tt ?)

Tasks:
  tt task new [Name]         Neuen Task erstellen                       (Alias: tt t new)
  tt task list [Filter]      Tasks auflisten                            (Alias: tt t ls)
  tt task edit <ID>          Task bearbeiten                            (Alias: tt t edit)
  tt task done <ID>          Task als erledigt markieren                (Alias: tt t done)
  tt task reopen <ID>        Erledigten Task wieder öffnen              (Alias: tt t reopen)
  tt task archive <ID>       Task archivieren                           (Alias: tt t arch)
  tt task delete <ID>        Task unwiderruflich löschen                (Alias: tt t rm)
  tt task plan <ID> <Datum>  Task für Datum einplanen                   (Alias: tt t plan)

Projekte:
  tt project new [Name]      Neues Projekt erstellen                    (Alias: tt p new)
  tt project list            Projekte auflisten                         (Alias: tt p ls)
  tt project edit <ID>       Projekt bearbeiten                         (Alias: tt p edit)
  tt project archive <ID>    Projekt archivieren                        (Alias: tt p arch)
  tt project delete <ID>     Projekt unwiderruflich löschen             (Alias: tt p rm)

Labels:
  tt label new [Name]        Neues Label erstellen                      (Alias: tt l new)
  tt label list              Labels auflisten                           (Alias: tt l ls)
  tt label delete <ID>       Label löschen                              (Alias: tt l rm)

Auswertung:
  tt log [Zeitraum]          Zeitprotokoll anzeigen                     (Alias: tt lg)
  tt summary [Zeitraum]      Zusammenfassung anzeigen                   (Alias: tt sum)

Sonstiges:
  tt help [Befehl]           Hilfe anzeigen
```

### 3.3 Globale Optionen

```
  --help, -h          Hilfe für den jeweiligen Befehl
  --no-color          Farbige Ausgabe deaktivieren
  --json              Ausgabe als JSON (für Scripting/Integration)
  --quiet, -q         Minimale Ausgabe
```

### 3.4 Symbole & Konventionen

| Symbol | Bedeutung                          |
| ------ | ---------------------------------- |
| `▶`    | Task/Arbeit gestartet              |
| `■`    | Task/Arbeit gestoppt               |
| `⏺`    | Arbeitszeit ohne Task läuft        |
| `⏹`    | Arbeitszeit komplett beendet       |
| `✚`    | Etwas erstellt                     |
| `✎`    | Etwas bearbeitet                   |
| `✓`    | Task erledigt                      |
| `↺`    | Wiedereröffnen                     |
| `⊘`    | Archiviert                         |
| `✗`    | Gelöscht                           |
| `⚠`    | Warnung / Bestätigung erforderlich |
| `📅`   | Planung                            |
| `?`    | Interaktive Eingabe                |

---

### 3.5 Zeiterfassungs-Befehle

#### tt start – Task oder Arbeitszeit starten

```
tt start [Referenz] [Optionen]

Referenz (optional):
  #<ID>             Bestehenden Task starten
  <Text>            Neuen Task erstellen und starten
  (ohne)            Interaktive Auswahl oder Arbeitszeit ohne Task

Optionen:
  -p, --project <ID|Name>   Projekt zuweisen (nur bei neuem Task)
  -l, --label <Name>        Label zuweisen (nur bei neuem Task, mehrfach möglich)
  -a, --at <Zeit>            Startzeitpunkt überschreiben (z. B. "08:30")
  --assign                   Task dem aktuell laufenden Slot zuweisen (statt neuen Slot)
```

**Beispiele:**

```bash
# Task aus der Liste starten
$ tt start #34
▶ Working on #34 "API Refactoring" (Backend) since 08:54

# Neuen Task erstellen und direkt starten
$ tt start "Bug in Login fixen" -p Backend -l Bug
✚ Task #47 "Bug in Login fixen" created (Backend, Bug)
▶ Working on #47 "Bug in Login fixen" (Backend) since 09:30

# Rückwirkend starten
$ tt start #34 --at 08:00
▶ Working on #34 "API Refactoring" (Backend) since 08:00

# Interaktive Auswahl
$ tt start
? What do you want to do?
  ❯ Start without task
    #47 Bug in Login fixen          (Backend)     20min ago
    #34 API Refactoring             (Backend)     2h ago
    #28 Weekly Meeting vorbereiten  (Orga)        yesterday
    #15 Landingpage Design          (Frontend)    3 days ago
    Create new task...

# Task dem laufenden Slot zuweisen
$ tt start #34 --assign
⏺ Assigned #34 "API Refactoring" to current slot (started 08:54)

# Wenn bereits ein Task läuft
$ tt start #28
■ Stopped #47 "Bug in Login fixen" at 10:15 (09:30 - 10:15 | 0:45h)
▶ Working on #28 "Weekly Meeting vorbereiten" (Orga) since 10:15
```

#### tt stop – Aktuellen Task beenden

```
tt stop [Optionen]

Optionen:
  -a, --at <Zeit>    Endzeitpunkt überschreiben
```

**Beispiele:**

```bash
$ tt stop
■ Stopped #28 "Weekly Meeting vorbereiten" at 10:45 (10:15 - 10:45 | 0:30h)
⏺ Tracking work time without task since 10:45

# Wenn kein Task läuft
$ tt stop
■ Stopped working (no task) at 11:00 (10:45 - 11:00 | 0:15h)
⏺ Tracking work time without task since 11:00
```

#### tt done – Arbeitszeit komplett beenden

```
tt done [Optionen]

Optionen:
  -a, --at <Zeit>    Endzeitpunkt überschreiben
```

**Beispiele:**

```bash
$ tt done
■ Stopped #34 "API Refactoring" at 17:30 (14:00 - 17:30 | 3:30h)
⏹ Work ended at 17:30

  Today: 8:36h worked (7:15h on tasks, 1:21h without task)

# Wenn kein Slot offen ist
$ tt done
  Nothing to stop – no active slot.
```

#### tt status – Aktuellen Status anzeigen

```bash
# Task läuft
$ tt status
▶ Working on #34 "API Refactoring" (Backend) since 14:00 (3:30h)

  Today so far: 7:15h worked
  ├── Backend       4:45h  ████████████░░░░  65%
  ├── Orga          1:30h  ████░░░░░░░░░░░░  21%
  └── (no task)     1:00h  ███░░░░░░░░░░░░░  14%

# Arbeitszeit ohne Task
$ tt status
⏺ Working without task since 10:45 (0:15h)

  Today so far: 3:15h worked

# Kein Slot offen
$ tt status
⏹ Not working.

  Last session: today, 08:54 - 12:30 (3:36h)
```

---

### 3.6 Task-Befehle

#### tt task new

```
tt task new [Name] [Optionen]

Optionen:
  -p, --project <ID|Name>    Projekt zuweisen
  -l, --label <Name>         Label zuweisen (mehrfach möglich)
  -d, --date <Datum>         Für Datum einplanen
  -t, --time <Uhrzeit>       Uhrzeit für Planung
  -n, --note <Text>          Notiz hinzufügen
  --link <URL>               Link/Bookmark hinzufügen
```

**Beispiele:**

```bash
$ tt task new "Deployment vorbereiten" -p Backend -l Release -d tomorrow
✚ Task #48 "Deployment vorbereiten" created
  Project: Backend | Labels: Release | Planned: 2026-02-20

# Interaktiv
$ tt task new
? Task name: Code Review PR #234
? Project:
    #1 Backend
    #2 Frontend
    #3 Orga
  ❯ #4 DevOps
    Create new project...
? Labels (comma-separated, optional): Review
✚ Task #49 "Code Review PR #234" created
  Project: DevOps | Labels: Review
```

#### tt task list

```
tt task list [Filter] [Optionen]

Filter:
  (ohne)                Alle offenen Tasks
  -p, --project <ID>    Nur Tasks eines Projekts
  -l, --label <Name>    Nur Tasks mit Label
  --planned [Datum]     Nur geplante Tasks
  --today               Für heute geplante Tasks
  --all                 Alle Tasks inkl. erledigte
  --done                Nur erledigte Tasks
  --archived            Nur archivierte Tasks

Optionen:
  --sort <Feld>         Sortierung: recent (default), name, project, date
```

**Beispiele:**

```bash
$ tt task list
  Open tasks:

  #  Task                         Project      Labels          Planned
  48 Deployment vorbereiten       Backend      Release         tomorrow
  49 Code Review PR #234          DevOps       Review
  47 Bug in Login fixen           Backend      Bug
  34 API Refactoring              Backend
  28 Weekly Meeting vorbereiten   Orga

  5 open tasks (3 more done – use --all to show)

$ tt task list --today
  Tasks planned for today (Thu, 2026-02-19):

  Now:
  28 Weekly Meeting vorbereiten   Orga                          (no time set)
  47 Bug in Login fixen           Backend      Bug              (no time set)

  Later:
  48 Deployment vorbereiten       Backend      Release          15:00
```

#### tt task edit

```
tt task edit <ID> [Optionen]

Optionen:
  -n, --name <Name>         Name ändern
  -p, --project <ID|Name>   Projekt ändern
  -l, --label <Name>        Label hinzufügen (mehrfach möglich)
  --remove-label <Name>     Label entfernen
  -d, --date <Datum>        Geplantes Datum ändern
  -t, --time <Uhrzeit>      Geplante Uhrzeit ändern
  --clear-date              Planung entfernen
  --note <Text>             Notiz hinzufügen/ersetzen
  --link <URL>              Link hinzufügen
  --remove-link <URL>       Link entfernen
```

**Beispiele:**

```bash
$ tt task edit #47 -l Urgent --date today
✎ Task #47 "Bug in Login fixen" updated
  + Label: Urgent
  + Planned: 2026-02-19

$ tt task edit #34 -n "API Refactoring v2"
✎ Task #34 renamed: "API Refactoring" → "API Refactoring v2"
```

#### tt task done / reopen / archive / delete

```bash
$ tt task done #47
✓ Task #47 "Bug in Login fixen" marked as done.

$ tt task reopen #47
↺ Task #47 "Bug in Login fixen" reopened.

$ tt task archive #47
⊘ Task #47 "Bug in Login fixen" archived.

$ tt task delete #47
⚠ This will permanently delete task #47 "Bug in Login fixen".
  2 slots are linked to this task and will be marked as "task deleted".
? Are you sure? (y/N) y
✗ Task #47 "Bug in Login fixen" deleted. 2 slots updated.
```

#### tt task plan

```
tt task plan <ID> <Datum> [Optionen]

Datum:
  today, tomorrow, monday, 2026-02-25, next week, ...

Optionen:
  -t, --time <Uhrzeit>    Uhrzeit festlegen
  --clear                 Planung entfernen
```

**Beispiele:**

```bash
$ tt task plan #34 tomorrow -t 10:00
📅 Task #34 "API Refactoring v2" planned for 2026-02-20 at 10:00

$ tt task plan #34 --clear
📅 Task #34 "API Refactoring v2" – planning removed.
```

---

### 3.7 Projekt-Befehle

```bash
$ tt project new "Mobile App" --color blue
✚ Project #5 "Mobile App" created (blue)

$ tt project list
  Projects:

  #  Project        Color    Tasks (open/total)
  1  Backend        red      3 / 5
  2  Frontend       green    1 / 2
  3  Orga           yellow   1 / 1
  4  DevOps         purple   1 / 1
  5  Mobile App     blue     0 / 0

  5 active projects (0 archived – use --all to show)

$ tt project edit #5 --color cyan -n "Mobile App v2"
✎ Project #5 renamed: "Mobile App" → "Mobile App v2" (cyan)

$ tt project archive #5
⊘ Project #5 "Mobile App v2" archived. 0 tasks affected.

$ tt project delete #5
⚠ This will permanently delete project #5 "Mobile App v2".
  0 tasks will be marked as "project deleted".
? Are you sure? (y/N) y
✗ Project #5 "Mobile App v2" deleted.
```

---

### 3.8 Label-Befehle

```bash
$ tt label new "Urgent"
✚ Label "Urgent" created

$ tt label list
  Labels:

  Label      Tasks (open/total)
  Bug        1 / 2
  Release    1 / 1
  Review     1 / 1
  Urgent     1 / 1

$ tt label delete "Review"
⚠ This will delete the label "Review". It will be removed from 1 task.
? Are you sure? (y/N) y
✗ Label "Review" deleted. Removed from 1 task.
```

---

### 3.9 Auswertungs-Befehle

#### tt log – Zeitprotokoll

```
tt log [Zeitraum] [Optionen]

Zeitraum:
  (ohne)             Heute
  today              Heute
  yesterday          Gestern
  week               Aktuelle Woche
  last-week          Letzte Woche
  month              Aktueller Monat
  <Datum>            Bestimmter Tag
  <Von>..<Bis>       Zeitraum (z. B. 2026-02-10..2026-02-15)

Optionen:
  --tasks-only       Nur Slots mit Task
  -p, --project <ID> Nur Slots eines Projekts
  -l, --label <Name> Nur Slots mit Label
  --compact          Kompakte Darstellung
```

**Beispiele:**

```bash
$ tt log
  Thu, 2026-02-19

  From  - To    | Time   | Task                         | Project
  08:00 - 08:54 | 0:54h  | -                            |
  08:54 - 09:30 | 0:36h  | #34 API Refactoring v2       | Backend
  09:30 - 10:15 | 0:45h  | #47 Bug in Login fixen       | Backend
  10:15 - 10:45 | 0:30h  | #28 Weekly Meeting vorber... | Orga
  10:45 - 11:00 | 0:15h  | -                            |
  11:00 - 12:30 | 1:30h  | #34 API Refactoring v2       | Backend
        - 13:00           (lunch break – 0:30h gap)
  13:00 - 13:15 | 0:15h  | -                            |
  13:15 - 17:30 | 4:15h  | #34 API Refactoring v2       | Backend
                                                    Total: 8:40h

$ tt log week --compact
  Week 8 (2026-02-16 – 2026-02-22)

  Mon 16    8:12h  ██████████████████░░░░░░  (farbige Projektanteile)
  Tue 17    7:45h  █████████████████░░░░░░░
  Wed 18    8:30h  ███████████████████░░░░░
  Thu 19    8:40h  ████████████████████░░░░
  Fri 20     –
                                                    Total: 33:07h

  ● Backend  ● Frontend  ● Orga  ○ (no task)
```

Die `--compact` Ansicht zeigt die Balken **farbig codiert** nach Projektanteilen (nicht einzelne Slots, sondern aggregierte Zeitanteile pro Projekt). Eine Legende am Ende zeigt die Farbzuordnung.

#### tt summary – Zusammenfassung

```
tt summary [Zeitraum] [Optionen]

Optionen:
  -l, --label <Name>     Label-Aufschlüsselung aktivieren
```

**Beispiele:**

```bash
$ tt summary week
  Week 8 (2026-02-16 – 2026-02-22)

  Total work time: 33:07h

  Project breakdown:
  █████████████████████░░░░░░░░░  Backend      22:50h   69%
  ████████░░░░░░░░░░░░░░░░░░░░░░  Orga          3:12h   10%
  ██████░░░░░░░░░░░░░░░░░░░░░░░░  Frontend      2:30h    8%
  █████░░░░░░░░░░░░░░░░░░░░░░░░░  (no task)     4:35h   14%

  Top tasks:
  #34 API Refactoring v2       Backend      18:30h
  #28 Weekly Meeting vorber... Orga          2:00h
  #15 Landingpage Design       Frontend      2:30h
  #47 Bug in Login fixen       Backend       2:15h

$ tt summary week -l Bug
  Week 8 (2026-02-16 – 2026-02-22)

  Total work time: 33:07h | Filter: Label "Bug"

  Project breakdown (Bug / other):
  █████████████████████░░░░░░░░░  Backend      22:50h   69%
    ├── with "Bug"    2:15h  ██░░░░░░░░  10%
    └── without       20:35h ████████░░  90%
  ████████░░░░░░░░░░░░░░░░░░░░░░  Orga          3:12h   10%
    ├── with "Bug"    0:00h  ░░░░░░░░░░   0%
    └── without        3:12h ██████████ 100%
  ...

  Tasks with label "Bug":
  #47 Bug in Login fixen       Backend       2:15h
                                       Label total: 2:15h (7%)
```

---

## 4. Nicht-funktionale Anforderungen

| Nr.    | Anforderung     | Beschreibung                                                                                                                            |
| ------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| NFA-01 | Einzelnutzer    | Die Anwendung wird für einen einzelnen Nutzer entwickelt. Die Architektur soll eine spätere Erweiterung auf mehrere Nutzer ermöglichen. |
| NFA-02 | Persistenz      | Daten werden lokal persistiert. Das Speicherformat soll für zukünftige Integrationen (Export, Sync) geeignet sein.                      |
| NFA-03 | Erweiterbarkeit | Die Architektur soll das Hinzufügen von GUI, Integrationen und weiteren Features ohne größere Refactorings ermöglichen.                 |
