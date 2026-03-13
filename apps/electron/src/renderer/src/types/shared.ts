export interface LabelRow {
  id: number;
  name: string;
}

export interface SlotRow {
  id: number;
  startedAt: Date | string;
  endedAt: Date | string | null;
  taskId: number | null;
  state: string;
  task?: {
    id: number;
    name: string;
    project: { name: string; color: string };
  } | null;
}
