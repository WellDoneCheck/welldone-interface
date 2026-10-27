// Where the map tiles come from: each imported map's own tiles, cut by the splitter and served by the backend
// (Backend-SPEC §4.4), over the National Land Surveying and Mapping Center's electronic map.
import { api } from './api';
import { getSession } from './session';

type Bounds = [west: number, south: number, east: number, north: number];

// An imported map's tiles as the backend describes them (GET /tasks/:taskId/tiles/tilejson); only the fields the site uses
export interface Imagery {
  // absolute addresses (the backend's BACKEND_URL), without the token
  tiles: string[];
  // WGS84
  bounds: Bounds;
  minzoom: number;
  maxzoom: number;
}

export const IMAGERY_TILE_SIZE = 256;

// 404 until the map has been cut
export const fetchImagery = (taskId: string) => api<Imagery>(`/tasks/${encodeURIComponent(taskId)}/tiles/tilejson`);

// The site's own path to the backend (next.config.ts forwards it there). The imagery's tiles are asked for through it:
// asked for at the backend's address, the token's header made the browser check with the backend first (a CORS
// preflight), for every tile, so zooming out took twice the requests to fill the map
export const BACKEND_PROXY_PATH = '/backend';

// An imagery tile address (a template from the backend) on the site's own origin, through BACKEND_PROXY_PATH
export function throughSite(template: string, siteOrigin: string): string {
  return siteOrigin + BACKEND_PROXY_PATH + template.replace(/^https?:\/\/[^/]+/, '');
}

// An imagery tile address (a template from the backend) asking for WebP rather than PNG: the backend makes either
// (§4.4), and a WebP tile is about a ninth the size, so a moved map fills sooner
export function asWebp(template: string): string {
  return template.replace(/\{y\}\.png(?=\?|$)/, '{y}.webp');
}

// For MapLibre's transformRequest: the backend's tiles (asked for through the site, throughSite) need the logged-in
// user's token (§2.4); others (the electronic map) go as they are
export function authorizeTile(url: string, siteOrigin: string): { url: string; headers?: Record<string, string> } {
  const token = getSession()?.token;
  const fromBackend = url.startsWith(siteOrigin + BACKEND_PROXY_PATH + '/');
  return token && fromBackend ? { url, headers: { Authorization: `Bearer ${token}` } } : { url };
}

// Shown while a map has no imagery yet (still being cut): the whole of Taiwan
export const TAIWAN_BOUNDS: Bounds = [119.3, 21.8, 122.1, 25.4];

// The base map around the survey: the National Land Surveying and Mapping Center's general electronic map (EMAP),
// from its public WMTS (row {y} before column {x}). Drawn down to zoom 20; closer in, its zoom 20 tiles are enlarged.
export const BASEMAP_TILES = 'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}';
export const BASEMAP_MAX_ZOOM = 20;
export const BASEMAP_ATTRIBUTION = '© 內政部國土測繪中心';
