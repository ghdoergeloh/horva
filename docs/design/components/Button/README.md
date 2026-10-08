# Button

Knopf für jede Aktion; Varianten `primary`, `secondary`, `quiet`, `destructive` und nur Symbol.

- **Primär** (`primary` / `primary-foreground`): höchstens einer je Bereich – „Arbeit starten“, „Speichern“.
- **Sekundär** (`secondary`): „Wechseln“, „Abbrechen“. **Ruhig**: Aktionen in Karten und Listen.
- **Fehler** (`destructive`): nur für Löschen, immer mit Bestätigungsdialog.
- **Nur Symbol**: braucht ein `aria-label`; Tooltip mit Tastenkürzel.
- Höhe 36px (klein 30px), Radius `radius-md`, Text `body-strong`. Fokus: 2px `ring`, 2px Abstand.
- Lucide-Symbol 16px links vom Text, Abstand `space-2`. Kürzel als `hv-kbd` rechts.
