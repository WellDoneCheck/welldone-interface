'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { YEAR_GROUPS, type RecordItem, type RecordStatus } from '../data/mapRecords';
import { useFitScale, type FitStage } from './useFitScale';

// Figma stage: two panels (654 + 51 + 1079) by 869 tall, 56px beside and navbar (120) + 46px above/below
const UPLOAD_STAGE: FitStage = { width: 1784, height: 869, marginX: 112, marginY: 212, minViewportWidth: 1280 };

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

function RecordRow({ record }: { record: RecordItem }) {
  const styles = STATUS_STYLES[record.status];

  return (
    <Link
      href={`/map?record=${record.id}`}
      aria-label={`檢視 ${record.id} 的地圖`}
      className="relative flex h-[93.24px] w-full flex-col justify-center overflow-clip drop-shadow-[8px_8px_10px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out hover:-translate-y-1"
    >
      <div className="absolute inset-[0_0_0.24px_0] overflow-clip">
        <div className="absolute inset-[0_0_-18.49%_0] shadow-[8px_8px_50px_0_rgba(0,0,0,0.4)]">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute left-[0.09%] top-[-766.25%] h-[868.58%] w-full">
              <Image src="/upload/record-bg.png" alt="" fill sizes="995px" className="object-fill" />
            </div>
          </div>
          <div className="absolute inset-0 bg-white/20" />
        </div>
      </div>
      <div className="absolute inset-[0_0_0.24px_0] bg-[linear-gradient(90deg,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0.40)_50%,rgba(0,0,0,0.70)_100%)]" />

      <div className="relative flex flex-1 items-center justify-between px-4">
        <div className="flex min-w-[137px] flex-col items-start gap-1">
          <div className="text-2xl font-medium leading-5 tracking-[-0.35px] text-white">{record.id}</div>
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
    </Link>
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
  const scale = useFitScale(UPLOAD_STAGE);
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

  const visibleGroups = YEAR_GROUPS
    .map((group) => ({
      ...group,
      records: searchQuery.trim()
        ? group.records.filter((r) => {
            const q = searchQuery.toLowerCase();
            return (
              r.id.toLowerCase().includes(q) ||
              r.statusLabel.toLowerCase().includes(q) ||
              r.timestamp.toLowerCase().includes(q)
            );
          })
        : group.records,
    }))
    .filter((group) => group.records.length > 0);

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ fontFamily: 'var(--font-noto-serif-tc), serif' }}>
      {/* ═══ Background aerial photo ═══ */}
      <div className="fixed inset-0 z-0">
        <Image src="/aerial-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
      </div>

      {/* ═══ Main Content — Two Floating Panels ═══ */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-14 pt-[120px]">
        <div className="flex w-full max-w-[1784px] flex-col gap-[51px] xl:flex-row" style={{ zoom: scale }}>

          {/* ── LEFT PANEL — Upload ── */}
          <div className="relative flex h-[560px] xl:h-[869px] w-full flex-col xl:w-[654px] xl:shrink-0 bg-white px-9 shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)]">
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

          {/* ── RIGHT PANEL — Processing Status ── */}
          <div className="flex h-[560px] xl:h-[869px] w-full max-w-[1079px] flex-col bg-white shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)]">
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
                      <RecordRow key={record.id} record={record} />
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
