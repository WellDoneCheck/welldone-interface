// Lets Excel detect UTF-8 so the Chinese text is not garbled
const UTF8_BOM = '﻿';

function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCsv(rows: string[][]): string {
  return UTF8_BOM + rows.map((row) => row.map(escapeField).join(',')).join('\r\n');
}

// Splits CSV text into rows of fields: quoted fields may hold commas, quotes ("") and line breaks; blank lines are dropped
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    if (row.some((value) => value.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      endField();
    } else if (char === '\n') {
      endRow();
    } else if (char !== '\r') {
      field += char;
    }
  }
  endRow();
  return rows;
}

// UTF-8 when the bytes are valid UTF-8 (a BOM is dropped), otherwise Big5 as exported by Taiwanese government systems
export function decodeCsv(bytes: ArrayBuffer | Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('big5').decode(bytes);
  }
}

export function downloadCsv(fileName: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
