'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Map as MapLibreMap, MapMouseEvent, PaddingOptions } from 'maplibre-gl';
import TileMap, { MapShade, type Bounds } from './TileMap';
import SharedTransition, { PageBackgroundTransition, UPLOAD_RECORD_SHARE, uploadRecordName } from './SharedTransition';
import type { MapCamera } from '../utils/mapCamera';

// The survey map shared by the map and compare pages (the (survey) route group's layout): it stays as it is when moving
// between them, each page only fitting it to its own area and adding its own pins or markers, instead of every page
// starting a map of its own during its page transition. Leaving the group (the check or upload page) it goes with the
// page, so those transitions still zoom it in on a well or shrink it into an upload row.

// What a page wants of the map: the area to fit it to (moved to when it changes), how it starts (the first page shown
// decides: camera, placeholder, startAfter, see TileMap) and what clicks and rests on it do
export interface SurveyMapSettings {
  fit: { bounds: Bounds; padding: PaddingOptions };
  camera?: MapCamera;
  placeholder?: string;
  startAfter?: number;
  onMapClick?: (event: MapMouseEvent) => void;
  onRestImage?: (image: Blob) => void;
}

interface SurveyMapState {
  map: MapLibreMap | null;
  setSettings: (settings: SurveyMapSettings) => void;
}

const SurveyMapContext = createContext<SurveyMapState | null>(null);

export default function SurveyMap({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SurveyMapSettings | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  // the imported map shown, for its row on the upload page to grow into the map (and the map to shrink back into it);
  // the last one named, while a page or sheet without one is shown
  const record = useSearchParams().get('record');
  const [mapFileId, setMapFileId] = useState(record);
  if (record && record !== mapFileId) setMapFileId(record);
  // a new value only when the map is: a page hands its settings over on every render (useSurveyMap), and a new value
  // on each of those would render the page again, and so on
  const state = useMemo(() => ({ map, setSettings }), [map]);

  return (
    <SurveyMapContext value={state}>
      <PageBackgroundTransition>
        <div className="fixed inset-0 overflow-hidden">
          {/* its own layer inside the page background, which keeps its own transitions to and from the check page.
              Always there (with a name that pairs with no row while no map file is named): adding it when the address
              first names one would change the tree around the map, and so start a new map in place of this one */}
          <SharedTransition name={uploadRecordName(mapFileId ?? 'none')} share={UPLOAD_RECORD_SHARE}>
            <div className="absolute inset-0">
              {settings && <TileMap {...settings} interactive onReady={setMap} />}
              <MapShade />
            </div>
          </SharedTransition>
        </div>
      </PageBackgroundTransition>
      {children}
    </SurveyMapContext>
  );
}

// For a page in the (survey) group: hands the map its settings (again whenever they change) and gives back the map, once
// it has started. The page's own parts go over it: the map takes pointer events only where nothing of the page is.
export function useSurveyMap(settings: SurveyMapSettings): MapLibreMap | null {
  const context = useContext(SurveyMapContext);
  if (!context) throw new Error('useSurveyMap is for pages in the (survey) route group');
  const { map, setSettings } = context;
  useLayoutEffect(() => setSettings(settings));
  return map;
}
