import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// A folder that is not its own URL: a parallel-route slot (@modal), an intercepting route ((.)export),
// a dynamic segment ([code]) that needs a value, or a private folder (_lib)
const isSkipped = (segment) => /^[@[_]|^\(\.+\)/.test(segment);
// A route group, (marketing), adds nothing to the URL
const isGroup = (segment) => /^\(.+\)$/.test(segment);

// Every page URL under the app directory that can be requested as is, e.g. ['/', '/map']
export function findStaticRoutes(appDir, segments = []) {
  const entries = readdirSync(join(appDir, ...segments), { withFileTypes: true });
  const routes = entries.some((entry) => entry.isFile() && /^page\.(tsx|ts|jsx|js)$/.test(entry.name))
    ? [`/${segments.filter((segment) => !isGroup(segment)).join('/')}`]
    : [];

  for (const entry of entries) {
    if (entry.isDirectory() && !isSkipped(entry.name)) routes.push(...findStaticRoutes(appDir, [...segments, entry.name]));
  }
  return [...new Set(routes)].sort();
}
