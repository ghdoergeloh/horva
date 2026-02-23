# Increment 10: Idle Detection (Pausen-Erkennung)

**Ziel:** Inaktivitätsphasen am Computer werden automatisch erkannt und können nachträglich als Pausen in die Zeiterfassung eingefügt werden, wobei der betroffene Slot automatisch gesplittet wird.

**Vorbedingungen:** Increment 1 (MVP) abgeschlossen. Increment 2 (GUI) empfohlen für komfortable Pausen-Verwaltung.

---

## 1. Konzept

### 1.1 Idle-Erkennung

- Ein **Hintergrundprozess** überwacht Maus- und Tastaturaktivität.
- Wird keine Aktivität für länger als **1 Minute** (konfigurierbar) erkannt, wird der Beginn der Inaktivität als **potentieller Pausenbeginn** gemerkt.
- Sobald Aktivität zurückkehrt, wird der **Zeitpunkt der Rückkehr** als potentielles Pausenende gemerkt.
- Diese erkannten Inaktivitätsphasen werden in einer **Pausen-Vorschlagsliste** gesammelt.

### 1.2 Pausen-Vorschlagsliste

- Enthält alle erkannten Inaktivitätsphasen des Tages mit Start, Ende und Dauer.
- Der Nutzer kann pro Vorschlag entscheiden:
  - **Als Pause einfügen** → Slot wird gesplittet.
  - **Ignorieren** → Vorschlag wird verworfen.
  - **Später entscheiden** → Vorschlag bleibt in der Liste.

### 1.3 Slot-Splitting bei Pausen-Einfügung

Wenn eine Pause eingefügt wird, wird der betroffene Slot wie folgt behandelt:

**Vorher:**

```
09:00 - 12:00  #34 API Refactoring  (ein Slot, 3h)
```

**Pause einfügen: 10:30 - 10:45**

**Nachher:**

```
09:00 - 10:30  #34 API Refactoring  (Slot 1, 1:30h)
       -- Lücke / Pause 10:30 - 10:45 (0:15h) --
10:45 - 12:00  #34 API Refactoring  (Slot 2, 1:15h)
```

Der Task bleibt bei beiden resultierenden Slots zugeordnet.

---

## 2. Funktionale Anforderungen

| Nr.     | Anforderung                   | Beschreibung                                                                                                                                          |
| ------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-ID-01 | Aktivitätsüberwachung         | Hintergrundprozess überwacht Maus-/Tastaturaktivität. Inaktivitäts-Schwelle konfigurierbar (Default: 1 Minute).                                       |
| F-ID-02 | Inaktivität erkennen          | Wenn keine Eingabe für länger als die Schwelle erkannt wird: Beginn und Ende der Inaktivität als Pausen-Vorschlag speichern.                          |
| F-ID-03 | Pausen-Vorschlagsliste        | Liste aller erkannten Inaktivitätsphasen des Tages. Anzeige mit Start, Ende, Dauer.                                                                   |
| F-ID-04 | Pause einfügen                | Nutzer wählt einen Vorschlag → betroffener Slot wird gesplittet. Beide resultierenden Slots behalten den Task des Original-Slots.                     |
| F-ID-05 | Vorschlag ignorieren          | Nutzer verwirft den Vorschlag. Wird nicht erneut angezeigt.                                                                                           |
| F-ID-06 | Benachrichtigung bei Rückkehr | Optional: Bei Rückkehr aus Inaktivität eine Benachrichtigung anzeigen mit der Frage „Waren Sie X Minuten pausiert? Als Pause einfügen?"               |
| F-ID-07 | Schwelle konfigurieren        | Mindest-Inaktivitätsdauer konfigurierbar (z. B. 1min, 5min, 15min).                                                                                   |
| F-ID-08 | Datenschutz                   | Es werden **keine Inhalte** überwacht – ausschließlich ob Eingaben stattfinden (ja/nein). Keine Screenshots, keine App-Titel, keine Tastatureingaben. |

---

## 3. CLI-Erweiterung

```
tt idle list                  Erkannte Inaktivitätsphasen anzeigen
tt idle insert <ID>           Pausen-Vorschlag als Pause einfügen
tt idle ignore <ID>           Pausen-Vorschlag verwerfen
tt idle config                Idle-Detection-Einstellungen anzeigen/ändern
```

**Beispiel:**

```bash
$ tt idle list
  Detected idle periods today:

  ID  From  - To    | Duration | During
  1   10:32 - 10:47 | 0:15h    | #34 API Refactoring (Backend)
  2   14:05 - 14:12 | 0:07h    | #34 API Refactoring (Backend)
  3   16:30 - 16:33 | 0:03h    | #47 Bug fixen (Backend)

$ tt idle insert 1
  Inserting break 10:32 - 10:47 into slot #34 "API Refactoring"...

  Before: 09:00 - 12:00 | 3:00h | #34 API Refactoring
  After:  09:00 - 10:32 | 1:32h | #34 API Refactoring
          10:47 - 12:00 | 1:13h | #34 API Refactoring
          (break: 0:15h)

✓ Break inserted. Slot split into 2 parts.

$ tt idle ignore 3
✓ Idle period 3 ignored.
```
