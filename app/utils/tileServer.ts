// Where the map tiles come from: titiler (docker-compose.yml) serving the splitter's cut tiles of the survey.
// NEXT_PUBLIC_TITILER_URL points the site at another titiler; see docs/map-tiles.md.
import { IMAGERY_TASK_ID } from '../data/xizhouImagery';

export const TITILER_URL = process.env.NEXT_PUBLIC_TITILER_URL ?? 'http://localhost:8080';

// The splitter's virtual mosaic of all the survey's tiles, as titiler sees it (the tiles folder is mounted at /data)
const IMAGERY_DATASET = `/data/${IMAGERY_TASK_ID}/merged.vrt`;

// 512 px tiles: a quarter as many requests as 256 px ones, each reading the source tiles once. WebP keeps the areas
// outside the strip transparent.
export const IMAGERY_TILE_SIZE = 512;
export const IMAGERY_TILES = `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.webp?tilesize=${IMAGERY_TILE_SIZE}&url=${encodeURIComponent(IMAGERY_DATASET)}`;

// The base map around the survey: the National Land Surveying and Mapping Center's general electronic map (EMAP),
// from its public WMTS (row {y} before column {x}). Drawn down to zoom 20; closer in, its zoom 20 tiles are enlarged.
export const BASEMAP_TILES = 'https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}';
export const BASEMAP_MAX_ZOOM = 20;
export const BASEMAP_ATTRIBUTION = '© 內政部國土測繪中心';
