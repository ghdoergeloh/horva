# Increment 6: GitLab-Integration (Task-Import)

**Ziel:** GitLab Issues können als Tasks importiert werden.

**Vorbedingungen:** Increment 1 (MVP) abgeschlossen. Die Architektur sollte idealerweise die gleiche Integrations-Schnittstelle nutzen wie Increment 5 (GitHub), um Code-Wiederverwendung zu maximieren.

---

## 1. Konzept

- Analog zu GitHub-Integration (Increment 5), aber für GitLab (Self-Hosted oder gitlab.com).
- Verbindung zu einem oder mehreren **GitLab-Projekten**.
- GitLab Issues → Zeittracker-Tasks.
- Unidirektional (nur Import).

---

## 2. Funktionale Anforderungen

| Nr.     | Anforderung                | Beschreibung                                                                                                     |
| ------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| F-GL-01 | GitLab verbinden           | Authentifizierung via Personal Access Token. Unterstützung für Self-Hosted-Instanzen (konfigurierbare Base-URL). |
| F-GL-02 | Projekt konfigurieren      | Ein oder mehrere GitLab-Projekte verbinden. Pro Projekt ein Default-Projekt im Zeittracker zuweisen.             |
| F-GL-03 | Issues abrufen             | Offene, dem Nutzer zugewiesene Issues abrufen.                                                                   |
| F-GL-04 | Issue als Task importieren | Issue wird als Task erstellt. Name = Issue-Titel, Referenz zur Issue-URL als Link/Bookmark.                      |
| F-GL-05 | Label-Mapping              | GitLab-Labels optional auf Zeittracker-Labels mappen.                                                            |
| F-GL-06 | Duplikat-Erkennung         | Bereits importierte Issues erkennen (über GitLab Issue-ID).                                                      |
| F-GL-07 | Sync                       | Manuell oder bei App-Start: neue/geänderte Issues prüfen. Geschlossene Issues optional als „erledigt" markieren. |

---

## 3. CLI-Erweiterung

```
tt gitlab connect             GitLab-Verbindung einrichten
tt gitlab repos               Verbundene Projekte anzeigen
tt gitlab import [Projekt]    Issues als Tasks importieren
```

Verhalten und Ausgabe analog zu `tt github import` (siehe Increment 5).
