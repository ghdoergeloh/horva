# Increment 4: Kalender-Integration (Task-Import)

**Ziel:** Kalender-Events aus externen Kalendern (Google Calendar, iCal/CalDAV) können als Tasks importiert und der Tagesplanung zugeordnet werden.

**Vorbedingungen:** Increment 1 (MVP) abgeschlossen.

---

## 1. Konzept

- Verbindung zu einem oder mehreren **externen Kalendern** herstellen.
- Kalender-Events werden als **geplante Tasks** importiert oder vorgeschlagen.
- Der Import ist **nicht automatisch** – der Nutzer entscheidet, welche Events übernommen werden.
- Importierte Tasks verhalten sich wie normale Tasks (Projekt zuweisbar, Labels, Zeiterfassung).

---

## 2. Funktionale Anforderungen

| Nr.     | Anforderung                 | Beschreibung                                                                                                                                                       |
| ------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-KI-01 | Kalender verbinden          | Verbindung zu Google Calendar (OAuth) und/oder CalDAV/iCal-URL herstellen.                                                                                         |
| F-KI-02 | Events abrufen              | Anstehende Events des Tages/der Woche abrufen und als Import-Vorschläge anzeigen.                                                                                  |
| F-KI-03 | Event als Task importieren  | Ein Kalender-Event wird als Task erstellt. Name = Event-Titel, geplantes Datum/Uhrzeit = Event-Zeitpunkt. Projekt und Labels können beim Import zugewiesen werden. |
| F-KI-04 | Batch-Import                | Mehrere Events auf einmal importieren (z. B. alle Events des Tages).                                                                                               |
| F-KI-05 | Duplikat-Erkennung          | Bereits importierte Events werden markiert und nicht erneut vorgeschlagen.                                                                                         |
| F-KI-06 | Regelmäßige Synchronisation | Konfigurierbar: bei App-Start, manuell, oder in festem Intervall neue Events prüfen.                                                                               |

---

## 3. CLI-Erweiterung

```
tt calendar list              Verbundene Kalender anzeigen
tt calendar connect <URL>     Kalender verbinden (CalDAV/iCal)
tt calendar import [Datum]    Events des Tages als Tasks importieren
```

**Beispiel:**

```bash
$ tt calendar import today
  Events for today (Thu, 2026-02-19):

  Time   Event                        Calendar       Status
  10:00  Daily Standup                 Work           ✓ already imported (#52)
  12:00  OM DevCon                     Work           new
  15:00  kiteto Daily                  Work           new

? Import events? (select with space, enter to confirm)
  ❯ [x] 12:00 OM DevCon
    [x] 15:00 kiteto Daily

? Assign project for "OM DevCon": Orga
? Assign project for "kiteto Daily": Kiteto

✚ Task #53 "OM DevCon" created (Orga, planned: today 12:00)
✚ Task #54 "kiteto Daily" created (Kiteto, planned: today 15:00)
```
