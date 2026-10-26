'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { uploadInChunks } from '../utils/chunkedUpload';
import { canDelete, canRename, canRetry, canUpload, displayName, groupByYear, uploadError, type RecordStatus, type TaskRecord } from '../utils/tasks';
import { useTaskRecords } from './useTaskRecords';
import { useSiteChrome } from './SiteChrome';
import { useMapLink } from './useMapView';
import { useFitScale, type FitStage } from './useFitScale';
import SharedTransition, {
  ONLY_TO_UPLOAD,
  OPEN_MAP,
  PageBackgroundTransition,
  SHARED,
  UPLOAD_RECORD_SHARE,
  clearBackToUpload,
  isBackToUpload,
  pagePart,
  uploadRecordName,
} from './SharedTransition';
import { CONTENT_TOP, FRAME_MARGIN_X, FRAME_MARGIN_Y, PAGE_GAP, PAGE_GUTTER, useViewportSize } from './pageFrame';

// Figma stage: two panels (654 + 51 + 1079) by 869 tall, scaled to fit the content area lined up with the navbar.
// From xl (1280px) up the panels then stretch to fill that area; below it they stack at their own size.
const UPLOAD_STAGE: FitStage = { width: 1784, height: 869, marginX: FRAME_MARGIN_X, marginY: FRAME_MARGIN_Y, minViewportWidth: 1280 };

// the drop zone and file list fold away (FOLD_TIME) before an upload's progress takes their place; once it is done,
// the progress stays at 100% for DONE_PAUSE before they open again
const FOLD_TIME = 500;
const DONE_PAUSE = 800;
// the big progress bar's flowing dashes
const SENDING_STRIPES = 'repeating-linear-gradient(90deg, #3F7A7E 0 12px, #73BAC0 12px 24px)';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/* ─── Types ─────────────────────────────────────────────────────── */

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  // bytes of this file sent so far (for the overall progress and speed)
  loaded?: number;
  // the resumable upload's id, kept so a retry resumes rather than restarts
  uploadId?: string;
  // why it was not uploaded
  error?: string;
  // the backend would refuse this file's format (§5), so it is marked failed before any upload and never retried
  rejected?: boolean;
}

// A file the next upload will send: a new one, or one that failed at runtime (not a format rejection). A runtime
// failure resumes from its uploadId when the backend already holds chunks, or starts over when it has none.
function isUploadable(file: UploadFile): boolean {
  return file.status === 'pending' || (file.status === 'error' && !file.rejected);
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatSeconds(seconds: number): string {
  return seconds < 60 ? `${seconds} 秒` : `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* ─── Record row image & status styles ──────────────────────────── */

const STATUS_STYLES: Record<
  RecordStatus,
  { dot: string; bar: string }
> = {
  done: { dot: 'bg-emerald-400', bar: 'bg-emerald-400' },
  recognizing: { dot: 'bg-amber-400', bar: 'bg-amber-400' },
  cutting: { dot: 'bg-blue-400', bar: 'bg-blue-400' },
  waiting: { dot: 'bg-white/60', bar: 'bg-white/60' },
  failed: { dot: 'bg-[#E5534B]', bar: 'bg-[#E5534B]' },
};

/* ─── RecordRow component ───────────────────────────────────────── */

function RecordRow({ record, name }: { record: TaskRecord; name: string }) {
  const styles = STATUS_STYLES[record.status];
  // read ahead as the pointer or focus comes to the row, so the map page is ready (and its map started) when it opens
  const mapLink = useMapLink(record.id, OPEN_MAP);

  return (
    <Link
      href={mapLink.href}
      transitionTypes={OPEN_MAP}
      onNavigate={mapLink.onNavigate}
      onPointerEnter={mapLink.readAhead}
      onFocus={mapLink.readAhead}
      aria-label={`檢視 ${name} 的地圖`}
      className="group/row block outline-none"
    >
      {/* only the card lifts on hover; the link stays put so its clickable area never slips from under the pointer.
          Opening the map, the card grows into it (and the map shrinks back into it coming back) */}
      <SharedTransition name={uploadRecordName(record.id)} share={UPLOAD_RECORD_SHARE}>
        <div className="relative flex h-[93.24px] w-full flex-col justify-center overflow-clip drop-shadow-[8px_8px_10px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out group-hover/row:-translate-y-1">
          <div className="absolute inset-[0_0_0.24px_0] overflow-clip">
            <div className="absolute inset-[0_0_-18.49%_0] shadow-[8px_8px_50px_0_rgba(0,0,0,0.4)]">
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute left-[0.09%] top-[-766.25%] h-[868.58%] w-full">
                  <Image src="/upload/record-bg.webp" unoptimized alt="" fill sizes="995px" className="object-fill" />
                </div>
              </div>
              <div className="absolute inset-0 bg-white/20" />
            </div>
          </div>
          <div className="absolute inset-[0_0_0.24px_0] bg-[linear-gradient(90deg,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0.40)_50%,rgba(0,0,0,0.70)_100%)]" />

          <div className="relative flex flex-1 items-center justify-between px-4">
            <div className="flex min-w-[137px] flex-col items-start gap-1">
              <div className="text-2xl font-medium leading-5 tracking-[-0.35px] text-white">{name}</div>
              <div className="text-xs leading-4 text-white/70">{record.timestamp}</div>
            </div>

            <div className="flex flex-col items-end gap-1">
              {record.tiles && (
                <div className="text-base leading-4 text-white/70">
                  ({record.tiles.done}/{record.tiles.total})
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
                <span className="text-xl leading-5 text-white">{record.statusLabel}</span>
              </div>
            </div>
          </div>

          <div className="relative h-1 w-full bg-white/10">
            <div className={`h-full ${styles.bar}`} style={{ width: `${record.progress}%` }} />
          </div>
        </div>
      </SharedTransition>
    </Link>
  );
}

/* ─── Record actions tray ───────────────────────────────────────── */

type TrayMode = 'actions' | 'rename' | 'confirm-delete';

const TRAY_BUTTON = 'flex h-[36px] items-center gap-2 px-4 text-[17px] font-bold transition-colors duration-200';

function TrayButton({ label, icon, tone = 'plain', onClick }: { label: string; icon: React.ReactNode; tone?: 'plain' | 'danger'; onClick: () => void }) {
  const toneClass = tone === 'danger' ? 'text-[#F0A597] hover:bg-[#BC5646] hover:text-white' : 'text-white/85 hover:bg-white/10 hover:text-white';
  return (
    <button type="button" onClick={onClick} className={`${TRAY_BUTTON} ${toneClass}`}>
      {icon}
      {label}
    </button>
  );
}

const TRAY_ICON_PROPS = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

const MapIcon = () => (
  <svg {...TRAY_ICON_PROPS}>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);
const RenameIcon = () => (
  <svg {...TRAY_ICON_PROPS}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="m13 7 4 4" />
  </svg>
);
const RetryIcon = () => (
  <svg {...TRAY_ICON_PROPS}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 4v7h-7" />
  </svg>
);
const DeleteIcon = () => (
  <svg {...TRAY_ICON_PROPS}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

interface RecordTrayProps {
  record: TaskRecord;
  name: string;
  // what the user may do to it (buttons for the rest are left out)
  renamable: boolean;
  deletable: boolean;
  // its recognition can be retried (it stopped with tiles left) and the user may
  retriable: boolean;
  mode: TrayMode;
  onModeChange: (mode: TrayMode) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onRetry: () => void;
}

// Contents of the tray: the action list, the rename form or the delete confirmation
function RecordTray({ record, name, renamable, deletable, retriable, mode, onModeChange, onRename, onDelete, onRetry }: RecordTrayProps) {
  const [draft, setDraft] = useState(name);
  const mapLink = useMapLink(record.id, OPEN_MAP);

  if (mode === 'rename') {
    const save = () => {
      // saved only when changed: the shown default name ('… 匯入') is not the name itself
      if (draft.trim() && draft.trim() !== name) onRename(draft.trim());
      onModeChange('actions');
    };
    return (
      <form
        className="flex flex-1 items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && onModeChange('actions')}
          aria-label="新名稱"
          className="h-[36px] min-w-0 flex-1 border-b-[1.5px] border-[#73BAC0] bg-transparent px-2 text-[18px] text-white outline-none placeholder:text-white/40"
        />
        <button type="submit" className={`${TRAY_BUTTON} bg-[#62A4A7] text-white hover:bg-[#54999D]`}>
          儲存
        </button>
        <button type="button" onClick={() => onModeChange('actions')} className={`${TRAY_BUTTON} text-white/70 hover:bg-white/10`}>
          取消
        </button>
      </form>
    );
  }

  if (mode === 'confirm-delete') {
    return (
      <div className="flex flex-1 items-center gap-2">
        <span className="flex-1 truncate px-2 text-[17px] text-white/85">確定刪除「{name}」？</span>
        <button type="button" autoFocus onClick={onDelete} className={`${TRAY_BUTTON} bg-[#BC5646] text-white hover:bg-[#A84A3B]`}>
          刪除
        </button>
        <button type="button" onClick={() => onModeChange('actions')} className={`${TRAY_BUTTON} text-white/70 hover:bg-white/10`}>
          取消
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center gap-1">
      <Link
        href={mapLink.href}
        transitionTypes={OPEN_MAP}
        onNavigate={mapLink.onNavigate}
        onPointerEnter={mapLink.readAhead}
        onFocus={mapLink.readAhead}
        className={`${TRAY_BUTTON} text-white/85 hover:bg-white/10 hover:text-white`}
      >
        <MapIcon />
        開啟地圖
      </Link>
      {renamable && <TrayButton label="重新命名" icon={<RenameIcon />} onClick={() => onModeChange('rename')} />}
      {retriable && <TrayButton label="重試辨識" icon={<RetryIcon />} onClick={onRetry} />}
      <span className="ml-auto" />
      {deletable && <TrayButton label="刪除" icon={<DeleteIcon />} tone="danger" onClick={() => onModeChange('confirm-delete')} />}
    </div>
  );
}

// A record with its action tray, which slides out below it on hover or keyboard focus
// and stays open while renaming or confirming a delete
type RecordEntryProps = Pick<RecordTrayProps, 'record' | 'name' | 'renamable' | 'deletable' | 'retriable' | 'onRename' | 'onDelete' | 'onRetry'>;

function RecordEntry({ record, name, renamable, deletable, retriable, onRename, onDelete, onRetry }: RecordEntryProps) {
  const [mode, setMode] = useState<TrayMode>('actions');
  const pinnedOpen = mode !== 'actions';

  return (
    <div className="group">
      <RecordRow record={record} name={name} />
      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          pinnedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`mx-2 flex h-[52px] items-center bg-[#2C322F]/90 px-2 shadow-[inset_0_8px_10px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              pinnedOpen ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100'
            }`}
          >
            <RecordTray
              key={mode}
              record={record}
              name={name}
              renamable={renamable}
              deletable={deletable}
              retriable={retriable}
              mode={mode}
              onModeChange={setMode}
              onRename={onRename}
              onDelete={onDelete}
              onRetry={onRetry}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Icon components ───────────────────────────────────────────── */

/* ─── Year picker ───────────────────────────────────────────────── */

interface YearPickerProps {
  // the year at the top of the list now, and the years there are
  year: string;
  years: string[];
  // how the year last changed (it slides in from below when scrolling down, from above when scrolling up)
  direction: 'up' | 'down';
  switchCount: number;
  onPick: (year: string) => void;
}

// The list's year, opening a menu of its years to jump to
function YearPicker({ year, years, direction, switchCount, onPick }: YearPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // closed by a click outside it or Escape; opening it puts the focus on the year shown
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // up and down move between the years
  const moveFocus = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const options = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const at = options.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown' ? Math.min(at + 1, options.length - 1) : Math.max(at - 1, 0);
    options[next]?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`年份：${year}，選擇要跳到的年份`}
        onClick={() => setOpen((current) => !current)}
        className="group flex items-center gap-2 border-0 bg-transparent p-0 text-[32px] font-bold leading-[45px] text-[#2C322F] transition-colors duration-300 hover:text-[#62A4A7]"
      >
        {/* slides in as the year changes (keyed by each change, so the slide plays again) */}
        <span key={switchCount} className="inline-block overflow-hidden">
          <span
            className={`inline-block motion-reduce:animate-none ${
              switchCount === 0 ? '' : direction === 'down' ? 'animate-[yearTextSlideUp_0.7s_cubic-bezier(0.22,1,0.36,1)]' : 'animate-[yearTextSlideDown_0.7s_cubic-bezier(0.22,1,0.36,1)]'
            }`}
          >
            {year}
          </span>
        </span>
        <svg
          aria-hidden
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`mt-1 text-[#6F7468] transition-transform duration-300 group-hover:text-[#62A4A7] ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3.5 6l4.5 4.5L12.5 6" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="選擇年份"
          onKeyDown={moveFocus}
          className="absolute left-0 top-full z-30 mt-2 min-w-[150px] border border-[#2C322F]/10 bg-white py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
        >
          {years.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === year}
                onClick={() => {
                  setOpen(false);
                  onPick(option);
                }}
                className={`flex w-full items-center justify-between gap-6 px-4 py-2 text-left text-xl font-bold outline-none transition-colors duration-200 hover:bg-[#62A4A7]/10 focus-visible:bg-[#62A4A7]/15 ${
                  option === year ? 'text-[#62A4A7]' : 'text-[#2C322F]'
                }`}
              >
                {option}
                {option === year && (
                  <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 7.2l3 3 6-6.4" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[24px] border-[1.5px] border-[#73BAC0] bg-white transition-colors hover:bg-[#73BAC0]/10"
    >
      {children}
    </button>
  );
}

/* ─── File row ──────────────────────────────────────────────────── */

function FileRow({ file, index, onRemove }: { file: UploadFile; index: number; onRemove: (id: string) => void }) {
  const isDone = file.status === 'done';
  const hasError = file.status === 'error';
  const progress = isDone ? 100 : file.status === 'uploading' ? file.progress : 0;

  return (
    <div
      className={`relative flex h-[61px] items-start px-0.5 motion-reduce:animate-none ${
        isDone ? 'animate-[upload-done-flash_2s_ease-out_both]' : 'animate-[upload-file-in_400ms_ease-out_both]'
      }`}
    >
      <span className="mt-[19px] w-[33px] text-xl leading-[23px] text-[#6F7468]" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="mt-3 w-[406px] shrink-0">
        <p className="truncate text-[23px] leading-[33px] text-[#2C322F]">{file.file.name}</p>
        <div className="relative mt-[5px] h-[1.5px]">
          <Image src="/upload/progress-track.svg" alt="" width={406} height={2} className="absolute inset-0 h-[1.5px] w-full" />
          {!hasError && progress > 0 && (
            <div className="absolute inset-y-0 left-0 h-[1.5px]" style={{ width: `${progress}%` }}>
              <Image src="/upload/progress-fill.svg" alt="" width={303} height={2} className="absolute inset-0 h-[1.5px] w-full" />
              {file.status === 'uploading' && (
                <>
                  {/* teal dashes flowing to the right, with a glowing head at the leading edge */}
                  <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_12px,rgba(255,255,255,0.65)_12px_24px)] animate-[upload-stripes_1s_linear_infinite] motion-reduce:animate-none" />
                  <span className="absolute right-0 top-1/2 h-2 w-2 rounded-full bg-[#73BAC0] shadow-[0_0_10px_3px_rgba(115,186,192,0.9)] animate-[upload-glow_1s_ease-in-out_infinite] motion-reduce:animate-none" />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {!hasError && <span className="ml-3.5 mt-[19px] w-[75px] text-base leading-[23px] text-[#6F7468]">{formatSize(file.file.size)}</span>}

      <div className="ml-auto mt-[19px] flex items-center gap-4 text-base leading-[23px]">
        {hasError ? (
          <>
            <span className="max-w-[150px] truncate text-[#98412F]" title={file.error}>{file.error}</span>
            <button type="button" onClick={() => onRemove(file.id)} className="text-[#6F7468] underline hover:text-[#98412F]">
              移除
            </button>
          </>
        ) : isDone ? (
          <span className="text-[#3F7A7E] animate-[upload-check-pop_700ms_ease-out_both] motion-reduce:animate-none">✓ 完成</span>
        ) : file.status === 'uploading' ? (
          <span className="text-[#3F7A7E]">{Math.round(file.progress)}%</span>
        ) : (
          <span className="text-[#6F7468]">等待中</span>
        )}
      </div>

      <Image src="/upload/hairline.svg" alt="" width={582} height={1} className="absolute bottom-0 left-[-2px] h-px w-[582px] max-w-none" />
    </div>
  );
}

/* ─── Upload progress (takes the drop zone and file list's place while an upload is going) ──────── */

function UploadingIcon() {
  return (
    <span className="relative flex h-[64px] w-[64px] items-center justify-center">
      <span className="absolute inset-0 border-2 border-[#62A4A7] opacity-0 animate-[well-ripple_1.8s_cubic-bezier(0.22,1,0.36,1)_infinite] motion-reduce:hidden" />
      <span className="absolute inset-[10px] bg-[#73BAC0]/20" />
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3F7A7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative overflow-visible">
        <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
        <g className="animate-[upload-arrow-rise_1.2s_ease-in-out_infinite] motion-reduce:animate-none">
          <path d="M12 15V4" />
          <path d="M7 9l5-5 5 5" />
        </g>
      </svg>
    </span>
  );
}

function UploadProgress({ progress, fileName, fileNumber, fileCount, merging }: { progress: number; fileName: string; fileNumber: number; fileCount: number; merging: boolean }) {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 text-center">
      <UploadingIcon />
      <p className="text-[40px] font-bold leading-[48px] tabular-nums text-[#3F7A7E]">{Math.floor(progress)}%</p>
      <div className="relative h-[6px] w-[420px] overflow-hidden bg-[#73BAC0]/20">
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-100 ease-linear animate-[upload-stripes_1s_linear_infinite] motion-reduce:animate-none"
          style={{ width: `${progress}%`, backgroundImage: SENDING_STRIPES }}
        />
      </div>
      {fileNumber > 0 ? (
        <>
          <p className="max-w-[480px] truncate text-base leading-[23px] text-[#6F7468]">{`第 ${fileNumber}／${fileCount} 個　${fileName}`}</p>
          {merging ? (
            <p className="text-[13px] text-[#3F7A7E]">正在合併中…</p>
          ) : (
            <p className="text-[13px] text-[#6F7468]">上傳完成前無法加入新檔案</p>
          )}
        </>
      ) : (
        <p className="text-base leading-[23px] text-emerald-600">✓ 全部上傳完成</p>
      )}
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────────── */

export default function UploadPage() {
  // arrived by the map page's link back: the record list fades in instead of sliding in (read once as the page
  // arrives; React may run this twice while developing, so the flag is cleared in an effect, not here)
  const [backFromMap] = useState(isBackToUpload);
  useEffect(() => clearBackToUpload(), []);
  const scale = useFitScale(UPLOAD_STAGE);
  const viewport = useViewportSize();
  const framed = viewport.width >= UPLOAD_STAGE.minViewportWidth;
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  // the drop zone and file list folded away, the upload's progress in their place
  const [folded, setFolded] = useState(false);
  // the current file's chunks are all sent and the backend is merging them (progress sits at 100% meanwhile)
  const [merging, setMerging] = useState(false);
  // bytes per second over the wire, smoothed; 0 when not uploading
  const [speed, setSpeed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const yearRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // null until the list is scrolled: then the first year listed
  const [scrolledYear, setScrolledYear] = useState<string | null>(null);
  const [yearDirection, setYearDirection] = useState<'up' | 'down'>('down');
  // how many times the year has changed while scrolling (each change slides the new year in)
  const [yearSwitches, setYearSwitches] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { records, loading, loadError, rename, remove, retry, add } = useTaskRecords();
  // why the last rename, delete or retry failed
  const [actionError, setActionError] = useState<string | null>(null);
  const { session } = useSiteChrome();
  const uploadAllowed = session !== null && canUpload(session.role);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const query = searchQuery.trim().toLowerCase();
  const visibleGroups = groupByYear(
    query
      ? records.filter((r) => [displayName(r.name), r.statusLabel, r.timestamp].some((text) => text.toLowerCase().includes(query)))
      : records,
  );
  const currentYear = scrolledYear ?? visibleGroups[0]?.year ?? '';

  // Scroll to a specific year section
  const scrollToYear = useCallback((targetYear: string) => {
    const container = scrollRef.current;
    const el = yearRefs.current[targetYear];
    if (!container || !el) return;
    container.scrollTo({ top: el.offsetTop - 20, behavior: 'smooth' });
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [searchOpen]);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const scrollTop = container.scrollTop;
    let newYear = visibleGroups[0]?.year ?? '';
    for (const group of visibleGroups) {
      const el = yearRefs.current[group.year];
      if (el && el.offsetTop - 80 <= scrollTop) {
        newYear = group.year;
      }
    }
    if (newYear !== currentYear) {
      const currentIdx = visibleGroups.findIndex((g) => g.year === currentYear);
      const newIdx = visibleGroups.findIndex((g) => g.year === newYear);
      setYearDirection(newIdx > currentIdx ? 'down' : 'up');
      setYearSwitches((count) => count + 1);
      setScrolledYear(newYear);
    }
  }, [currentYear, visibleGroups]);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    // files the backend would refuse are marked at once (it answers other formats with a 500, Backend-SPEC §5)
    const newFiles: UploadFile[] = arr.map((f) => {
      const error = uploadError(f) ?? undefined;
      return { id: randomId(), file: f, progress: 0, status: error ? 'error' : 'pending', error, rejected: error != null };
    });
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploadAllowed && e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles, uploadAllowed]);

  const updateFile = (id: string, change: Partial<UploadFile>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...change } : f)));

  // One file at a time, each sent in resumable chunks and becoming a map in the list once the backend has merged it.
  // The drop zone and file list fold away first (FOLD_TIME) so the upload's progress can take their place.
  const startUpload = async () => {
    // new files plus ones that failed at runtime (a format rejection is left alone); each resumes from its uploadId
    // when the backend already holds chunks, or starts over when it has none
    const pending = files.filter(isUploadable);
    if (pending.length === 0) return;
    setUploading(true);
    setFolded(true);
    setSpeed(0);
    // the files sent last time make way, so this upload's progress is its own
    setFiles((prev) => prev.filter((f) => f.status !== 'done'));
    await delay(FOLD_TIME);

    // real upload speed, from the bytes actually going over the wire: completed files, plus the one in flight
    let completedBytes = 0;
    let sample = { time: performance.now(), bytes: 0 };
    for (const item of pending) {
      updateFile(item.id, { status: 'uploading', loaded: 0 });
      try {
        const task = await uploadInChunks(item.file, {
          onUploadId: (uploadId) => updateFile(item.id, { uploadId }),
          onMerging: () => setMerging(true),
          onProgress: (sent) => {
            updateFile(item.id, { loaded: sent, progress: (sent / item.file.size) * 100 });
            const now = performance.now();
            const total = completedBytes + sent;
            if (now - sample.time >= 400) {
              const instant = ((total - sample.bytes) / (now - sample.time)) * 1000;
              setSpeed((prev) => (prev > 0 ? prev * 0.6 + instant * 0.4 : instant));
              sample = { time: now, bytes: total };
            }
          },
        }, item.uploadId);
        updateFile(item.id, { status: 'done', progress: 100, loaded: item.file.size });
        setMerging(false);
        completedBytes += item.file.size;
        add(task);
      } catch (error) {
        setMerging(false);
        updateFile(item.id, { status: 'error', error: (error as Error).message });
      }
    }
    setUploading(false);
    setSpeed(0);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setFolded(false), DONE_PAUSE);
  };

  // while an upload is going, files dragged over the drop zone are refused (and not opened by the browser either)
  const refuseDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'none';
  }, []);

  // Runs a rename or delete, saying why when the backend refuses it
  const runAction = async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError((error as Error).message);
    }
  };

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const totalSize = files.reduce((s, f) => s + f.file.size, 0);
  const listMessage = loadError ?? (loading ? '載入中…' : records.length === 0 ? '尚無匯入紀錄' : visibleGroups.length === 0 ? '找不到符合的紀錄' : null);

  // the files going up in this upload, for the folded progress view and footer
  const sending = files.filter((f) => f.status === 'uploading' || f.status === 'done');
  const sendingSize = sending.reduce((s, f) => s + f.file.size, 0);
  const sentSize = sending.reduce((s, f) => s + (f.status === 'done' ? f.file.size : f.loaded ?? 0), 0);
  const overallProgress = sendingSize > 0 ? (sentSize / sendingSize) * 100 : 0;
  const currentNumber = sending.findIndex((f) => f.status !== 'done') + 1;
  const currentName = sending.find((f) => f.status !== 'done')?.file.name ?? '';
  const etaSeconds = speed > 0 ? Math.ceil((sendingSize - sentSize) / speed) : 0;

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>
      {/* ═══ Background: the aerial photo, covering the window from its top-left corner ═══ */}
      <PageBackgroundTransition>
        <div className="fixed inset-0 z-0 overflow-hidden">
          <div className="absolute left-0 top-0 aspect-[1958/1102] w-[max(100vw,calc(100dvh*1958/1102))]">
            <Image src="/aerial-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
          </div>
        </div>
      </PageBackgroundTransition>

      {/* ═══ Main Content — Two Floating Panels (fade out, then in, when moving to or from the map page) ═══ */}
      <div
        className={framed ? 'absolute z-10' : 'relative z-10 flex min-h-screen items-center justify-center px-14 pt-[120px]'}
        style={{ ...pagePart('upload-content'), ...(framed && { top: CONTENT_TOP, left: PAGE_GUTTER, right: PAGE_GUTTER, bottom: PAGE_GAP }) }}
      >
        <div
          className={framed ? 'flex gap-[51px]' : 'flex w-full max-w-[1784px] flex-col gap-[51px]'}
          style={{
            zoom: scale,
            ...(framed && { width: (viewport.width - FRAME_MARGIN_X) / scale, height: (viewport.height - FRAME_MARGIN_Y) / scale }),
          }}
        >

          {/* ── LEFT PANEL — Upload (the home page's start button grows into it) ── */}
          <SharedTransition name={SHARED.startUpload} share={ONLY_TO_UPLOAD}>
            <div className="relative flex h-[560px] xl:h-full w-full flex-col xl:w-[654px] xl:shrink-0 bg-white px-9 shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)]">
              <h1 className="pt-10 text-[32px] font-bold leading-[45px] text-[#2C322F]">上傳空拍影像</h1>

              {/* Ruler */}
              <div className="relative mt-5 h-[7px]">
                <Image src="/upload/ruler-ticks.svg" alt="" width={583} height={7} className="absolute inset-0 max-w-none" />
              </div>
              <Image src="/upload/hairline.svg" alt="" width={582} height={1} className="mt-0 h-px w-[582px] max-w-none" />

              {/* Drop Zone (folds up first when an upload starts; opens again once the progress has gone) */}
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${
                  folded ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] delay-500'
                }`}
              >
                <div className={`min-h-0 ${folded ? 'overflow-hidden' : ''}`}>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => uploadAllowed && inputRef.current?.click()}
                    className={`relative mt-4 h-[183.5px] w-[583.5px] max-w-none transition-opacity duration-300 ${
                      uploadAllowed ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                    } ${isDragging ? 'opacity-80 animate-[upload-drop-breathe_1.2s_ease-in-out_infinite] motion-reduce:animate-none' : ''}`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      multiple
                      accept=".tif,.tiff"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) addFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <Image src="/upload/drop-frame.svg" alt="" width={584} height={184} className="pointer-events-none absolute inset-0 max-w-none" />
                    {isDragging && (
                      <span className="pointer-events-none absolute left-1/2 top-[18px] -translate-x-1/2">
                        <svg aria-hidden width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3F7A7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-[upload-arrow-rise_1.2s_ease-in-out_infinite] motion-reduce:animate-none">
                          <path d="M12 19V5M5 12l7-7 7 7" />
                        </svg>
                      </span>
                    )}
                    <div className="flex flex-col items-center pt-[53px] text-center text-2xl leading-[34px]">
                      {uploadAllowed ? (
                        <p className="text-[#2C322F]">
                          拖曳檔案至此，或 <span className="text-[#3F7A7E]">選擇檔案</span>
                        </p>
                      ) : (
                        <p className="text-[#2C322F]">檢視者帳號無法上傳影像</p>
                      )}
                      <p className="text-[#6F7468]">支援 .tif／.tiff</p>
                    </div>
                  </div>
                  <div className="h-[44px]" />
                </div>
              </div>

              {/* File List (folds up with the drop zone; the upload's progress fades in in its place) */}
              <Image src="/upload/hairline.svg" alt="" width={582} height={1} className="h-px w-[582px] max-w-none" />
              <div className="relative min-h-0 flex-1" onDragOver={folded ? refuseDrop : undefined} onDrop={folded ? refuseDrop : undefined}>
                <div className={`h-full origin-top overflow-y-auto transition-[transform,opacity] duration-500 ease-in-out ${folded ? 'scale-y-0 opacity-0' : 'delay-500'}`}>
                  {files.length === 0 ? (
                    <div className="py-8 text-center text-base text-[#6F7468]">尚無檔案</div>
                  ) : (
                    files.map((file, idx) => <FileRow key={file.id} file={file} index={idx} onRemove={removeFile} />)
                  )}
                </div>
                <div className={`absolute inset-0 transition-opacity duration-500 ${folded ? 'opacity-100 delay-500' : 'pointer-events-none opacity-0'}`}>
                  <UploadProgress progress={overallProgress} fileName={currentName} fileNumber={currentNumber} fileCount={sending.length} merging={merging} />
                </div>
              </div>

              {/* Footer Bar */}
              <Image src="/upload/hairline.svg" alt="" width={582} height={1} className="h-px w-[582px] max-w-none" />
              <div className="flex h-[89px] items-start justify-between pt-3.5">
                {uploading ? (
                  <div className="pt-1.5 text-[13px] leading-8 tabular-nums text-[#6F7468]">
                    <span className="text-[#2C322F]">{formatSize(sentSize)} / {formatSize(sendingSize)}</span>
                    {speed > 0 && <>{' '}· {formatSize(speed)}/s · 剩約 {formatSeconds(etaSeconds)}</>}
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1 pt-1.5 text-[#2C322F]">
                    <span className="text-2xl leading-8">{files.length}</span>
                    <span className="text-[13px] text-[#6F7468]">個檔案 · {formatSize(totalSize)}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={startUpload}
                  disabled={!uploadAllowed || uploading || !files.some(isUploadable)}
                  className="h-[42px] w-[134px] rounded-sm bg-[#62A4A7] text-[14.5px] text-white transition-all hover:bg-[#54999D] disabled:opacity-50"
                >
                  {uploading ? '上傳中...' : '開始上傳 →'}
                </button>
              </div>
            </div>
          </SharedTransition>

          {/* ── RIGHT PANEL — Processing Status (its own layer on page changes: slides in from the right, or fades in when
              back from the map, see globals.css) ── */}
          <div
            className="flex h-[560px] xl:h-full w-full max-w-[1079px] xl:min-w-0 xl:max-w-none xl:flex-1 flex-col bg-white shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)]"
            style={{ viewTransitionName: backFromMap ? 'upload-records-back' : 'upload-records' }}
          >
            {/* Header with icons */}
            <div className="flex items-start justify-between pl-[46px] pr-[57px] pt-10">
              <div className="flex items-center gap-4">
                {/* the list's year: picks a year to jump to */}
                {currentYear && (
                  <YearPicker
                    year={currentYear}
                    years={visibleGroups.map((group) => group.year)}
                    direction={yearDirection}
                    switchCount={yearSwitches}
                    onPick={scrollToYear}
                  />
                )}
              </div>
              <div className="flex items-center gap-[18px]">
                <IconButton>
                  <Image src="/upload/icon-question.svg" alt="說明" width={20} height={20} />
                </IconButton>
                <div
                  className="flex items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: searchOpen ? '280px' : '50px' }}
                >
                  {/* Search input — fades in when open */}
                  <div
                    className="flex items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      width: searchOpen ? '230px' : '0px',
                      marginRight: searchOpen ? '8px' : '0px',
                      opacity: searchOpen ? 1 : 0,
                    }}
                  >
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜尋井號、狀態..."
                      className="h-[50px] w-full flex-1 border border-[#D1D5DB] bg-white px-4 text-sm text-[#2C322F] outline-none transition-colors focus:border-[#62A4A7] focus:shadow-[0_0_0_3px_rgba(98,164,167,0.15)]"
                    />
                  </div>
                  {/* Icon button — always visible, toggles between search/close */}
                  <IconButton
                    onClick={() => {
                      if (searchOpen) {
                        setSearchOpen(false);
                        setSearchQuery('');
                      } else {
                        setSearchOpen(true);
                      }
                    }}
                  >
                    {searchOpen ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M5 5L15 15M15 5L5 15" stroke="#6F7468" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <Image src="/upload/icon-search.svg" alt="搜尋" width={20} height={20} />
                    )}
                  </IconButton>
                </div>
              </div>
            </div>

            {/* Scrollable list — 37px gutter on the right holds the scroll indicator. Positioned, so each year's offsetTop
                is measured from the top of the list, as its scrollTop is */}
            <div
              ref={scrollRef}
              className="scroll-indicator relative mb-16 ml-[37px] mr-2.5 mt-[23px] min-h-0 flex-1 overflow-y-auto"
              onScroll={handleScroll}
            >
              {actionError && (
                <p role="alert" className="mb-3 bg-[#F7E5DF] px-4 py-2 text-base font-bold text-[#98412F]">
                  {actionError}
                </p>
              )}
              {listMessage && <p className="py-8 text-center text-base text-[#6F7468]">{listMessage}</p>}
              {visibleGroups.map((group, index) => (
                <div
                  key={group.year}
                  ref={(el) => {
                    yearRefs.current[group.year] = el;
                  }}
                  className={index > 0 ? 'mt-[17px]' : undefined}
                >
                  {/* each year's heading, but the first's: the year picker above names it. Never shown or hidden as the
                      list scrolls: a heading changing size there moved the list under the scroll position, changed the
                      year above and so the heading again, and the list twitched */}
                  {index > 0 && <h3 className="mb-7 text-[32px] font-bold leading-[45px] text-[#2C322F]">{group.year}</h3>}
                  <div className="flex w-full flex-col gap-[9.4px]">
                    {group.records.map((record) => (
                      <RecordEntry
                        key={record.id}
                        record={record}
                        name={displayName(record.name)}
                        renamable={session !== null && canRename(session.role)}
                        deletable={session !== null && canDelete(session, record)}
                        retriable={record.retryable && session !== null && canRetry(session.role)}
                        onRename={(name) => runAction(() => rename(record.id, name))}
                        onDelete={() => runAction(() => remove(record.id))}
                        onRetry={() => runAction(() => retry(record.id))}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
