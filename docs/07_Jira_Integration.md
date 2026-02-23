# Increment 7: Jira-Integration (Task-Import)

**Ziel:** Jira Issues können als Tasks importiert werden.

**Vorbedingungen:** Increment 1 (MVP) abgeschlossen. Sollte die gleiche Integrations-Schnittstelle nutzen wie Increment 5/6.

---

## 1. Konzept

- Verbindung zu einer **Jira-Instanz** (Cloud oder Server/Data Center).
- Jira Issues → Zeittracker-Tasks.
- Filter über **JQL** (Jira Query Language) konfigurierbar, um relevante Issues auszuwählen.
- Unidirektional (nur Import).

---

## 2. Funktionale Anforderungen

| Nr.     | Anforderung                 | Beschreibung                                                                                                                         |
| ------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| F-JI-01 | Jira verbinden              | Authentifizierung via API Token (Cloud) oder Personal Access Token (Server). Konfigurierbare Base-URL.                               |
| F-JI-02 | Board/Projekt konfigurieren | Ein oder mehrere Jira-Projekte verbinden. Pro Jira-Projekt ein Default-Projekt im Zeittracker zuweisen.                              |
| F-JI-03 | Issues abrufen              | Issues über konfigurierbare JQL-Filter abrufen (z. B. „assignee = currentUser() AND status != Done").                                |
| F-JI-04 | Issue als Task importieren  | Issue wird als Task erstellt. Name = Issue-Key + Summary (z. B. „PROJ-123 Fix login bug"). Referenz zur Issue-URL als Link/Bookmark. |
| F-JI-05 | Label-Mapping               | Jira-Labels und/oder Issue-Typen optional auf Zeittracker-Labels mappen.                                                             |
| F-JI-06 | Duplikat-Erkennung          | Bereits importierte Issues erkennen (über Jira Issue-Key).                                                                           |
| F-JI-07 | Sync                        | Manuell oder bei App-Start: neue/geänderte Issues prüfen. Abgeschlossene Issues optional als „erledigt" markieren.                   |

---

## 3. CLI-Erweiterung

```
tt jira connect               Jira-Verbindung einrichten
tt jira projects              Verbundene Projekte anzeigen
tt jira import [Projekt]      Issues als Tasks importieren
```

**Beispiel:**

```bash
$ tt jira import PROJ
  Open issues assigned to you in PROJ:

  Key       Summary                          Type     Labels
  PROJ-142  Fix auth middleware               Bug      security
  PROJ-138  Add rate limiting                 Story
  PROJ-135  Update dependencies              Task     maintenance

? Import issues? (select with space)
  ❯ [x] PROJ-142 Fix auth middleware
    [x] PROJ-138 Add rate limiting
    [ ] PROJ-135 Update dependencies

✚ Task #57 "PROJ-142 Fix auth middleware" created (Backend, Bug)
  🔗 https://mycompany.atlassian.net/browse/PROJ-142
✚ Task #58 "PROJ-138 Add rate limiting" created (Backend)
  🔗 https://mycompany.atlassian.net/browse/PROJ-138
```
