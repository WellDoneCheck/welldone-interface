import { useSyncExternalStore } from 'react';
import { getServerWellVerdicts, getWellVerdicts, subscribeToWellVerdicts } from '../utils/wellVerdicts';

// Every well's verdict as verified so far (utils/wellVerdicts), kept up to date across pages and tabs
export function useWellVerdicts() {
  return useSyncExternalStore(subscribeToWellVerdicts, getWellVerdicts, getServerWellVerdicts);
}
