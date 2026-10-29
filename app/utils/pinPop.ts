// How long a pin just come onto the map takes to pop in (the pin-pop animation in globals.css)
export const PIN_POP_MS = 600;
// Pins popping in together go one after another this far apart, all started within PIN_STAGGER_MAX_MS (a whole map's
// pins too)
const PIN_STAGGER_MS = 60;
const PIN_STAGGER_MAX_MS = 1200;

// The wells whose pins the map does not draw yet (settled: those it does), to pop in
export function unsettledIds(ids: string[], settled: ReadonlySet<string>): string[] {
  return ids.filter((id) => !settled.has(id));
}

interface ScreenPoint {
  x: number;
  y: number;
}

// The pins coming onto the map, where they are on screen: those on it (the map's size, with margin room around it for
// a pin standing just outside) pop in nearest to `from` first, spreading out from it; those off it are drawn by the map
// at once (popping in unseen, they would only hold up the ones on screen)
export function popOrder(
  pins: (ScreenPoint & { id: string })[],
  from: ScreenPoint,
  size: { width: number; height: number },
  margin: number,
): { onScreen: string[]; offScreen: string[] } {
  const isOnScreen = ({ x, y }: ScreenPoint) => x >= -margin && x <= size.width + margin && y >= -margin && y <= size.height + margin;
  const distance = ({ x, y }: ScreenPoint) => Math.hypot(x - from.x, y - from.y);
  const onScreen = pins.filter(isOnScreen).sort((a, b) => distance(a) - distance(b));
  return { onScreen: onScreen.map((pin) => pin.id), offScreen: pins.filter((pin) => !isOnScreen(pin)).map((pin) => pin.id) };
}

// When the index-th of count pins popping in together starts, in ms
export function popDelay(index: number, count: number): number {
  const step = count > 1 ? Math.min(PIN_STAGGER_MS, PIN_STAGGER_MAX_MS / (count - 1)) : 0;
  return index * step;
}

// How long count pins popping in together take, until the last has landed
export const popDuration = (count: number) => popDelay(count - 1, count) + PIN_POP_MS;
