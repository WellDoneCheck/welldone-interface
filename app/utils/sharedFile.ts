import { fetchFile } from './api';

// A backend file read once for everyone showing it at the same time (e.g. a capture both in the film strip and in the
// compare view): the first to hold it starts the read; the last to let go stops the read if still running and frees
// its address
interface SharedFile {
  url: Promise<string>;
  abort: AbortController;
  holders: number;
}

const files = new Map<string, SharedFile>();

function startRead(path: string): SharedFile {
  const abort = new AbortController();
  const url = fetchFile(path, abort.signal).then((blob) => URL.createObjectURL(blob));
  return { url, abort, holders: 0 };
}

// The file's address as an <img> can show it, and the way to let go of it (once; again does nothing)
export function holdFile(path: string): { url: Promise<string>; release: () => void } {
  const file = files.get(path) ?? startRead(path);
  files.set(path, file);
  file.holders += 1;
  let released = false;

  const release = () => {
    if (released) return;
    released = true;
    file.holders -= 1;
    if (file.holders > 0) return;
    files.delete(path);
    file.abort.abort();
    file.url.then(URL.revokeObjectURL, () => undefined);
  };
  return { url: file.url, release };
}
