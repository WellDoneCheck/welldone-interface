'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { YEAR_GROUPS, type RecordItem, type RecordStatus } from '../data/mapRecords';
import { recordName, renameRecord } from '../utils/recordNames';
import { useRecordNames } from './RecordName';
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

/* ─── Types ─────────────────────────────────────────────────────── */

interface UploadFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
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
};

/* ─── RecordRow component ───────────────────────────────────────── */

function RecordRow({ record, name }: { record: RecordItem; name: string }) {
  const styles = STATUS_STYLES[record.status];

  return (
    <Link
      href={`/map?record=${record.id}`}
      transitionTypes={OPEN_MAP}
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
              <div className="text-base leading-4 text-white/70">
                ({record.current}/{record.total})
              </div>
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
const DeleteIcon = () => (
  <svg {...TRAY_ICON_PROPS}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

interface RecordTrayProps {
  record: RecordItem;
  name: string;
  mode: TrayMode;
  onModeChange: (mode: TrayMode) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

// Contents of the tray: the action list, the rename form or the delete confirmation
function RecordTray({ record, name, mode, onModeChange, onRename, onDelete }: RecordTrayProps) {
  const [draft, setDraft] = useState(name);

  if (mode === 'rename') {
    const save = () => {
      if (draft.trim()) onRename(draft.trim());
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
      <Link href={`/map?record=${record.id}`} transitionTypes={OPEN_MAP} className={`${TRAY_BUTTON} text-white/85 hover:bg-white/10 hover:text-white`}>
        <MapIcon />
        開啟地圖
      </Link>
      <TrayButton label="重新命名" icon={<RenameIcon />} onClick={() => onModeChange('rename')} />
      <span className="ml-auto" />
      <TrayButton label="刪除" icon={<DeleteIcon />} tone="danger" onClick={() => onModeChange('confirm-delete')} />
    </div>
  );
}

// A record with its action tray, which slides out below it on hover or keyboard focus
// and stays open while renaming or confirming a delete
function RecordEntry({ record, name, onRename, onDelete }: { record: RecordItem; name: string; onRename: (name: string) => void; onDelete: () => void }) {
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
            <RecordTray key={mode} record={record} name={name} mode={mode} onModeChange={setMode} onRename={onRename} onDelete={onDelete} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Icon components ───────────────────────────────────────────── */

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
    <div className="relative flex h-[61px] items-start px-0.5">
      <span className="mt-[19px] w-[33px] text-xl leading-[23px] text-[#6F7468]" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="mt-3 w-[406px] shrink-0">
        <p className="truncate text-[23px] leading-[33px] text-[#2C322F]">{file.name}</p>
        <div className="relative mt-[5px] h-[1.5px]">
          <Image src="/upload/progress-track.svg" alt="" width={406} height={2} className="absolute inset-0 h-[1.5px] w-full" />
          {!hasError && progress > 0 && (
            <Image
              src="/upload/progress-fill.svg"
              alt=""
              width={303}
              height={2}
              className="absolute inset-y-0 left-0 h-[1.5px]"
              style={{ width: `${progress}%` }}
            />
          )}
        </div>
      </div>

      {!hasError && <span className="ml-3.5 mt-[19px] w-[75px] text-base leading-[23px] text-[#6F7468]">{formatSize(file.size)}</span>}

      <div className="ml-auto mt-[19px] flex items-center gap-4 text-base leading-[23px]">
        {hasError ? (
          <>
            <span className="text-[#98412F]">格式錯誤</span>
            <button type="button" onClick={() => onRemove(file.id)} className="text-[#6F7468] underline hover:text-[#98412F]">
              移除
            </button>
          </>
        ) : isDone ? (
          <span className="text-[#3F7A7E]">完成</span>
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
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const yearRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [currentYear, setCurrentYear] = useState(YEAR_GROUPS[0].year);
  const [yearDirection, setYearDirection] = useState<'up' | 'down'>('down');
  const yearAnimKey = useRef(0);
  const [, forceUpdate] = useState(0);
  const yearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [yearAnimating, setYearAnimating] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Local edits to the placeholder records until they are saved to the backend
  // shared with the map, check and compare pages, which can rename the files too
  const recordNames = useRecordNames();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    let newYear = YEAR_GROUPS[0].year;
    for (const group of YEAR_GROUPS) {
      const el = yearRefs.current[group.year];
      if (el && el.offsetTop - 80 <= scrollTop) {
        newYear = group.year;
      }
    }
    if (newYear !== currentYear) {
      const currentIdx = YEAR_GROUPS.findIndex((g) => g.year === currentYear);
      const newIdx = YEAR_GROUPS.findIndex((g) => g.year === newYear);
      setYearDirection(newIdx > currentIdx ? 'down' : 'up');
      if (yearTimerRef.current) clearTimeout(yearTimerRef.current);
      yearAnimKey.current += 1;
      setYearAnimating(true);
      setCurrentYear(newYear);
      forceUpdate((n) => n + 1);
      yearTimerRef.current = setTimeout(() => setYearAnimating(false), 800);
    }
  }, [currentYear]);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    const newFiles: UploadFile[] = arr.map((f) => ({
      id: randomId(),
      name: f.name,
      size: f.size,
      progress: 0,
      status: 'pending' as const,
    }));
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
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const startUpload = useCallback(() => {
    setUploading(true);
    setFiles((prev) => prev.map((f) => f.status === 'done' ? f : { ...f, status: 'uploading' as const }));
    const interval = setInterval(() => {
      setFiles((prev) => {
        const updated = prev.map((f) => {
          if (f.status === 'done') return f;
          if (f.status === 'error') return f;
          const next = Math.min(f.progress + Math.random() * 15 + 5, 100);
          return next >= 100 ? { ...f, progress: 100, status: 'done' as const } : { ...f, progress: next };
        });
        if (updated.every((f) => f.status === 'done' || f.status === 'error')) {
          clearInterval(interval);
          setUploading(false);
        }
        return updated;
      });
    }, 500);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  const nameOf = (record: RecordItem) => recordName(record, recordNames);

  const visibleGroups = YEAR_GROUPS
    .map((group) => ({
      ...group,
      records: group.records.filter((r) => !deletedIds.has(r.id)),
    }))
    .map((group) => ({
      ...group,
      records: searchQuery.trim()
        ? group.records.filter((r) => {
            const q = searchQuery.toLowerCase();
            return (
              nameOf(r).toLowerCase().includes(q) ||
              r.statusLabel.toLowerCase().includes(q) ||
              r.timestamp.toLowerCase().includes(q)
            );
          })
        : group.records,
    }))
    .filter((group) => group.records.length > 0);

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

              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative mt-4 h-[183.5px] w-[583.5px] max-w-none cursor-pointer transition-opacity duration-300 ${
                  isDragging ? 'opacity-80' : ''
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".tif,.tiff,.geotiff"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <Image src="/upload/drop-frame.svg" alt="" width={584} height={184} className="pointer-events-none absolute inset-0 max-w-none" />
                <div className="flex flex-col items-center pt-[53px] text-center text-2xl leading-[34px]">
                  <p className="text-[#2C322F]">
                    拖曳檔案至此，或 <span className="text-[#3F7A7E]">選擇檔案</span>
                  </p>
                  <p className="text-[#6F7468]">支援 .tif／.tiff，單檔上限 2GB</p>
                </div>
              </div>

              {/* File List */}
              <Image src="/upload/hairline.svg" alt="" width={582} height={1} className="mt-[44px] h-px w-[582px] max-w-none" />
              <div className="flex-1 overflow-y-auto">
                {files.length === 0 ? (
                  <div className="py-8 text-center text-base text-[#6F7468]">尚無檔案</div>
                ) : (
                  files.map((file, idx) => <FileRow key={file.id} file={file} index={idx} onRemove={removeFile} />)
                )}
              </div>

              {/* Footer Bar */}
              <Image src="/upload/hairline.svg" alt="" width={582} height={1} className="h-px w-[582px] max-w-none" />
              <div className="flex h-[89px] items-start justify-between pt-3.5">
                <div className="flex items-baseline gap-1 pt-1.5 text-[#2C322F]">
                  <span className="text-2xl leading-8">{files.length}</span>
                  <span className="text-[13px] text-[#6F7468]">個檔案 · {formatSize(totalSize)}</span>
                </div>
                <button
                  type="button"
                  onClick={startUpload}
                  disabled={uploading || files.length === 0}
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
                {/* Year label — clickable, smooth slide animation */}
                <button
                  type="button"
                  key={yearAnimKey.current}
                  onClick={() => {
                    const currentIdx = YEAR_GROUPS.findIndex((g) => g.year === currentYear);
                    const nextIdx = (currentIdx + 1) % YEAR_GROUPS.length;
                    scrollToYear(YEAR_GROUPS[nextIdx].year);
                  }}
                  className="inline-block cursor-pointer border-0 bg-transparent p-0 text-[32px] font-bold leading-[45px] text-[#2C322F] transition-colors duration-300 hover:text-[#62A4A7]"
                  style={{
                    animation: yearAnimating
                      ? (yearDirection === 'down'
                          ? 'yearTextSlideUp 0.7s cubic-bezier(0.22,1,0.36,1)'
                          : 'yearTextSlideDown 0.7s cubic-bezier(0.22,1,0.36,1)')
                      : 'none',
                  }}
                >
                  {currentYear}
                </button>
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

            {/* Scrollable list — 37px gutter on the right holds the scroll indicator */}
            <div
              ref={scrollRef}
              className="scroll-indicator mb-16 ml-[37px] mr-2.5 mt-[23px] min-h-0 flex-1 overflow-y-auto"
              onScroll={handleScroll}
            >
              {visibleGroups.map((group, index) => (
                <div
                  key={group.year}
                  ref={(el) => {
                    yearRefs.current[group.year] = el;
                  }}
                  className={index > 0 ? 'mt-[17px]' : undefined}
                >
                  <div
                    className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      maxHeight: group.year === currentYear ? '0px' : '100px',
                      opacity: group.year === currentYear ? 0 : 1,
                    }}
                  >
                    <h3 className="mb-7 text-[32px] font-bold leading-[45px] text-[#2C322F]">{group.year}</h3>
                  </div>
                  <div className="flex w-full flex-col gap-[9.4px]">
                    {group.records.map((record) => (
                      <RecordEntry
                        key={record.id}
                        record={record}
                        name={nameOf(record)}
                        onRename={(name) => renameRecord(record.id, name)}
                        onDelete={() => setDeletedIds((current) => new Set(current).add(record.id))}
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
