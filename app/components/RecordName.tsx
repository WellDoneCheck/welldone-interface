'use client';

import { useState, useSyncExternalStore } from 'react';
import InlineNameInput from './InlineNameInput';
import { defaultRecordName, type RecordItem } from '../data/mapRecords';
import { getRecordNames, getServerRecordNames, recordName, renameRecord, subscribeToRecordNames } from '../utils/recordNames';

type NamedRecord = Pick<RecordItem, 'id' | 'timestamp'>;

// Every map file's given name, by record id, kept up to date across pages and tabs
export function useRecordNames() {
  return useSyncExternalStore(subscribeToRecordNames, getRecordNames, getServerRecordNames);
}

function FileIcon({ size }: { size: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="shrink-0">
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 16.5l5-5 4 4 3-3 6 6" strokeLinecap="round" />
      <circle cx="15.5" cy="8.5" r="1.6" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden width="0.75em" height="0.75em" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M9.6 1.9l2.5 2.5-7.3 7.3-3 .5.5-3z" />
      <path d="M8.3 3.2l2.5 2.5" />
    </svg>
  );
}

interface RecordNameProps {
  record: NamedRecord;
  iconSize: number;
  // type size, weight and color; the icon, pencil and field follow the text color
  className?: string;
}

// The name of the map file a well was found in, renamed in place with the pencil beside it
export default function RecordName({ record, iconSize, className = '' }: RecordNameProps) {
  const names = useRecordNames();
  const [editing, setEditing] = useState(false);
  const name = recordName(record, names);

  const finishEditing = (draft: string | null) => {
    setEditing(false);
    if (draft !== null) renameRecord(record.id, draft);
  };

  return (
    <div className={`group/record flex min-w-0 items-center gap-[0.55em] ${className}`}>
      <FileIcon size={iconSize} />
      {editing ? (
        <InlineNameInput
          initial={names[record.id] ?? ''}
          placeholder={defaultRecordName(record)}
          label="圖檔名稱"
          onDone={finishEditing}
          className="border-current placeholder:opacity-50"
        />
      ) : (
        <>
          <span className="truncate">
            <span className="sr-only">圖檔：</span>
            {name}
          </span>
          <button
            type="button"
            aria-label={`重新命名圖檔「${name}」`}
            onClick={() => setEditing(true)}
            className="shrink-0 p-[0.2em] opacity-45 outline-none transition-opacity duration-300 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-current group-hover/record:opacity-80"
          >
            <PencilIcon />
          </button>
        </>
      )}
    </div>
  );
}
