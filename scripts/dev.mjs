// `npm run dev`: starts `next dev`, then requests every page once so each one is compiled before it is first opened.
// Dev compiles a page on its first visit; opening a page that is still compiling mid view transition times the transition
// out (TimeoutError), or shows the loading screen instead.
import { spawn } from 'node:child_process';
import { findStaticRoutes } from './devRoutes.mjs';

const RETRY_MS = 500;
const origin = `http://localhost:${process.env.PORT ?? 3000}`;

const next = spawn('next', ['dev', ...process.argv.slice(2)], { stdio: 'inherit' });
next.on('exit', (code) => process.exit(code ?? 0));
// stopping this script stops next dev too, instead of leaving it holding the port
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => next.kill(signal));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path) {
  try {
    return (await fetch(origin + path)).ok;
  } catch {
    return false;
  }
}

async function warmUp() {
  while (!(await request('/'))) await sleep(RETRY_MS);

  const started = Date.now();
  const routes = findStaticRoutes('app').filter((route) => route !== '/');
  // one at a time, so the pages do not compete for the compiler
  for (const route of routes) await request(route);
  console.log(`✓ Pre-compiled ${routes.length + 1} pages in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

warmUp();
