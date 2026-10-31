// The map's events this needs (a MapLibre map has them)
export interface RestingMap {
  on(type: string, listener: (event?: { sourceDataType?: string }) => void): unknown;
  off(type: string, listener: (event?: { sourceDataType?: string }) => void): unknown;
}

// What changes what the map draws: moved (panned, zoomed, resized) or its sources (e.g. tiles loaded) or style changed
const CHANGES = ['move', 'resize', 'sourcedata', 'styledata'];

// Calls onRest once each time the map comes to rest after a change: at the first idle that follows it, not at the
// idles after the draws asked for then. Something asking for one more draw at rest (to read what the map drew) must
// not take a draw asked for by something else for a change, or the two would ask for each other's forever, a draw on
// every frame of the map standing still.
export function onEachRest(map: RestingMap, onRest: () => void): () => void {
  let changed = true;
  // a source saying it has finished loading is no change of its own
  const change = (event?: { sourceDataType?: string }) => {
    if (event?.sourceDataType !== 'idle') changed = true;
  };
  const idle = () => {
    if (!changed) return;
    changed = false;
    onRest();
  };
  for (const type of CHANGES) map.on(type, change);
  map.on('idle', idle);
  return () => {
    for (const type of CHANGES) map.off(type, change);
    map.off('idle', idle);
  };
}
