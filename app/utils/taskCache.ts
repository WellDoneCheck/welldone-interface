import type { Task, TaskProgress } from './tasks';

export interface RememberedTasks {
  tasks: Task[];
  progress: Record<string, TaskProgress>;
}

// The imported maps (and their progress) read last, per user: a page coming back to them lists them at once while they
// are read again, so the map page's link back finds its record's row there to shrink into
const remembered = new Map<string, RememberedTasks>();

export function rememberTasks(userId: string, tasks: RememberedTasks): void {
  remembered.set(userId, tasks);
}

export function rememberedTasks(userId: string | null): RememberedTasks | null {
  return (userId && remembered.get(userId)) || null;
}
