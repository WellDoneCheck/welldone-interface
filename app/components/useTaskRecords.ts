'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSiteChrome } from './SiteChrome';
import { api } from '../utils/api';
import { rememberTasks, rememberedTasks } from '../utils/taskCache';
import { isFinished, renameTask, retryRecognition, toRecord, type Task, type TaskProgress, type TaskRecord } from '../utils/tasks';

// How often maps still being cut or recognised have their progress read again
const POLL_MS = 5000;
// Listing the ones read last, they are read again only once the page transition is over (globals.css: 650-750ms): the
// answers re-rendering the page in its frames would make it stutter
const REREAD_AFTER_MS = 800;

// The imported maps from the backend with their progress, polled until each finishes, and the changes made to them;
// none read while not enabled (e.g. nobody logged in)
export function useTaskRecords(enabled = true) {
  const userId = useSiteChrome().session?.userId ?? null;
  // the ones read last are listed at once, while they are read again
  const [tasks, setTasks] = useState<Task[] | null>(() => rememberedTasks(userId)?.tasks ?? null);
  const [progress, setProgress] = useState<Record<string, TaskProgress>>(() => rememberedTasks(userId)?.progress ?? {});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (userId && tasks) rememberTasks(userId, { tasks, progress });
  }, [userId, tasks, progress]);

  // no-store: the progress's ETag stops changing once cutting ends, and a cached answer would freeze the AI's (§5)
  const readProgress = useCallback(async (ids: string[]) => {
    const answers = await Promise.allSettled(ids.map((id) => api<TaskProgress>(`/tasks/${id}/progress`, { cache: 'no-store' })));
    setProgress((current) => {
      const next = { ...current };
      answers.forEach((answer, index) => {
        if (answer.status === 'fulfilled') next[ids[index]] = answer.value;
      });
      return next;
    });
  }, []);

  const [listedAtStart] = useState(tasks !== null);
  useEffect(() => {
    if (!enabled) return;
    const read = () =>
      api<Task[]>('/tasks').then(
        (list) => {
          setTasks(list);
          readProgress(list.map((task) => task.id));
        },
        (error: Error) => setLoadError(error.message),
      );
    if (!listedAtStart) {
      read();
      return;
    }
    const timer = setTimeout(read, REREAD_AFTER_MS);
    return () => clearTimeout(timer);
  }, [enabled, readProgress, listedAtStart]);

  const records: TaskRecord[] = useMemo(() => (tasks ?? []).map((task) => toRecord(task, progress[task.id])), [tasks, progress]);

  // joined into one string, so the polling restarts only when which maps are unfinished changes
  const unfinished = records.filter((record) => !isFinished(record)).map((record) => record.id).join(',');
  useEffect(() => {
    if (!enabled || !unfinished) return;
    const timer = setInterval(() => readProgress(unfinished.split(',')), POLL_MS);
    return () => clearInterval(timer);
  }, [enabled, unfinished, readProgress]);

  const replaceTask = (changed: Task) => setTasks((current) => (current ?? []).map((task) => (task.id === changed.id ? changed : task)));

  const rename = async (id: string, name: string) => {
    const task = tasks?.find((candidate) => candidate.id === id);
    if (task) replaceTask(await renameTask(task, name));
  };

  const remove = async (id: string) => {
    await api(`/tasks/${id}`, { method: 'DELETE' });
    setTasks((current) => (current ?? []).filter((task) => task.id !== id));
  };

  // Sends its failed and unreached tiles to the AI again, then reads its progress (polled again as it recognises)
  const retry = async (id: string) => {
    await retryRecognition(id);
    await readProgress([id]);
  };

  // A map just uploaded: listed first, as the newest
  const add = (task: Task) => {
    setTasks((current) => [task, ...(current ?? [])]);
    readProgress([task.id]);
  };

  return { records, loading: tasks === null && loadError === null, loadError, rename, remove, retry, add };
}
