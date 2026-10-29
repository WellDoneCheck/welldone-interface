// How long a pin just come onto the map takes to pop in (the pin-pop animation in globals.css)
export const PIN_POP_MS = 600;
// Pins popping in together go one after another this far apart, all started within PIN_STAGGER_MAX_MS (a whole map's
// pins too)
const PIN_STAGGER_MS = 60;
const PIN_STAGGER_MAX_MS = 1200;

// The wells whose pins pop in: those not on the map before (shown: null on the map's first pins, when they all do)
export function poppingIds(shown: ReadonlySet<string> | null, ids: string[]): string[] {
  return shown ? ids.filter((id) => !shown.has(id)) : ids;
}

// When the index-th of count pins popping in together starts, in ms
export function popDelay(index: number, count: number): number {
  const step = count > 1 ? Math.min(PIN_STAGGER_MS, PIN_STAGGER_MAX_MS / (count - 1)) : 0;
  return index * step;
}

// How long count pins popping in together take, until the last has landed
export const popDuration = (count: number) => popDelay(count - 1, count) + PIN_POP_MS;
