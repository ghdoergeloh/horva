# Increment 5: GitHub-Integration (Task-Import)

**Ziel:** GitHub Issues können als Tasks importiert werden, um Entwicklungsarbeit direkt im Zeittracker zu erfassen.

**Vorbedingungen:** Increment 1 (MVP) abgeschlossen.

---

## 1. Konzept

- Verbindung zu einem oder mehreren **GitHub-Repositories** herstellen.
- GitHub Issues werden als **Tasks** importiert.
- Zugeordnetes Projekt kann pro Repository vorkonfiguriert werden.
- GitHub Labels können optional als Zeittracker-Labels gemappt werden.
- Die Verbindung ist **unidirektional** (Import) – es werden keine Daten zurück an GitHub geschrieben.

---

## 2. Funktionale Anforderungen

| Nr.     | Anforderung                | Beschreibung                                                                                                     |
| ------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| F-GH-01 | GitHub verbinden           | Authentifizierung via Personal Access Token oder OAuth.                                                          |
| F-GH-02 | Repository konfigurieren   | Ein oder mehrere Repos verbinden. Pro Repo ein Default-Projekt im Zeittracker zuweisen.                          |
| F-GH-03 | Issues abrufen             | Offene, dem Nutzer zugewiesene Issues abrufen.                                                                   |
| F-GH-04 | Issue als Task importieren | Issue wird als Task erstellt. Name = Issue-Titel, Referenz zur Issue-URL als Link/Bookmark.                      |
| F-GH-05 | Label-Mapping              | GitHub-Labels können optional auf Zeittracker-Labels gemappt werden.                                             |
| F-GH-06 | Duplikat-Erkennung         | Bereits importierte Issues erkennen (über GitHub Issue-ID).                                                      |
| F-GH-07 | Sync                       | Manuell oder bei App-Start: neue/geänderte Issues prüfen. Geschlossene Issues optional als „erledigt" markieren. |

---

## 3. CLI-Erweiterung

```
tt github connect             GitHub-Verbindung einrichten
tt github repos               Verbundene Repos anzeigen
tt github import [Repo]       Issues als Tasks importieren
```

**Beispiel:**

```bash
$ tt github import myorg/backend
  Open issues assigned to you in myorg/backend:

  #  Issue                               Labels
  142 Fix auth middleware                 bug, security
  138 Add rate limiting to API            enhancement
  135 Update dependency versions          maintenance

  ✓ already imported: #130 Refactor DB layer (#34)

? Import issues? (select with space)
  ❯ [x] #142 Fix auth middleware
    [x] #138 Add rate limiting to API
    [ ] #135 Update dependency versions

✚ Task #55 "Fix auth middleware" created (Backend, Bug)
  🔗 https://github.com/myorg/backend/issues/142
✚ Task #56 "Add rate limiting to API" created (Backend)
  🔗 https://github.com/myorg/backend/issues/138
```
