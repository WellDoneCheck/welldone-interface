'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import AccountSubPage from './AccountSubPage';
import { SearchBox } from './UserManagementPage';
import { useServerLog } from './useServerLog';
import { downloadLog, lineLevel, LOG_LEVELS, LOG_SOURCES, type LogLevel, type LogSource } from '../utils/serverLogs';

// As wide as the user management page (the account panel widens for both, see LoginPanel)
const CONTENT_WIDTH = 1100;
const LOG_HEIGHT = 640;
// Typing in the search box asks the backend once it has stopped for this long
const SEARCH_DELAY_MS = 400;
// Scrolled within this of the bottom, the log keeps showing its newest lines as they come
const STICK_PX = 40;

const LINE_COLOR: Record<LogLevel | 'none', string> = {
  error: 'text-[#F0907C]',
  warn: 'text-[#E6C06A]',
  none: 'text-[#E8E6DF]',
};

function SourceTabs({ value, onChange }: { value: LogSource; onChange: (source: LogSource) => void }) {
  return (
    <div className="flex">
      {LOG_SOURCES.map(({ source, label }) => (
        <button
          key={source}
          type="button"
          aria-pressed={source === value}
          onClick={() => onChange(source)}
          className={`h-[64px] border-b-[4px] px-[22px] fs-26 font-bold transition-colors ${
            source === value ? 'border-[#62A4A7] text-[#2C322F]' : 'border-transparent text-[#6F7468] hover:text-[#2C322F]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function LevelPicker({ value, onChange }: { value: LogLevel | null; onChange: (level: LogLevel | null) => void }) {
  return (
    <span className="inline-flex border-2 border-[#62A4A7]">
      {LOG_LEVELS.map(({ level, label }) => (
        <button
          key={label}
          type="button"
          aria-pressed={level === value}
          onClick={() => onChange(level)}
          className={`h-[56px] px-[16px] fs-22 font-bold transition-colors ${level === value ? 'bg-[#62A4A7] text-white' : 'text-[#3F7A7E] hover:bg-[#D1E6E7]'}`}
        >
          {label}
        </button>
      ))}
    </span>
  );
}

function ToolButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-[44px] border-2 border-[#62A4A7] px-[16px] fs-20 font-bold text-[#3F7A7E] transition-colors hover:bg-[#D1E6E7] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

// The text typed, once typing has stopped for SEARCH_DELAY_MS
function useSettled(text: string): string {
  const [settled, setSettled] = useState(text);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);
  return settled;
}

// The servers' logs for root: the backend's own or the splitter's, newest lines at the bottom as they are written,
// narrowed to a level or some text, and the whole month's file to download
export default function ServerLogsPage() {
  const [source, setSource] = useState<LogSource>('backend');
  const [level, setLevel] = useState<LogLevel | null>(null);
  const [typed, setTyped] = useState('');
  const text = useSettled(typed);
  const [paused, setPaused] = useState(false);
  const log = useServerLog(source, { text, level }, paused);

  const boxRef = useRef<HTMLDivElement>(null);
  // the log (and filter) scrolled up from its newest lines, if any: another one starts at its newest again
  const [scrolledUpOn, setScrolledUpOn] = useState<string | null>(null);
  const stuck = scrolledUpOn !== log.key;
  const toBottom = () => boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  const onScroll = () => {
    const box = boxRef.current!;
    setScrolledUpOn(box.scrollHeight - box.scrollTop - box.clientHeight < STICK_PX ? null : log.key);
  };
  useLayoutEffect(() => {
    if (stuck) toBottom();
  }, [log.lines, stuck]);

  const [downloadError, setDownloadError] = useState<string | null>(null);
  const download = () => {
    setDownloadError(null);
    downloadLog(source, log.page!.file).catch((failure: Error) => setDownloadError(failure.message));
  };

  const emptyText = log.error ?? (log.page ? (text || level ? '沒有符合的行' : '這個月還沒有 log') : '載入中…');
  const error = downloadError ?? (log.lines.length > 0 ? log.error : null);

  return (
    <AccountSubPage
      title="伺服器日誌"
      description="後端與切圖服務本月的 log，每 3 秒接上新寫入的行"
      width={CONTENT_WIDTH}
      action={<ToolButton label="下載本月 log" disabled={!log.page} onClick={download} />}
    >
      <div className="mt-[28px] flex items-end justify-between gap-[20px] border-b-2 border-[#ECE9E0]">
        <SourceTabs value={source} onChange={setSource} />
        <div className="flex items-center gap-[14px] pb-[12px]">
          <LevelPicker value={level} onChange={setLevel} />
          <SearchBox value={typed} label="搜尋 log" onChange={setTyped} />
        </div>
      </div>

      <div className="mt-[14px] flex h-[48px] items-center justify-between gap-[14px] fs-20 font-bold text-[#6F7468]">
        <span className="truncate">
          {log.page?.file ?? ''}
          {log.page && ` · ${log.lines.length} 行`}
          {error && <span className="ml-[12px] text-[#98412F]">! {error}</span>}
        </span>
        <span className="flex shrink-0 gap-[8px]">
          {!stuck && <ToolButton label="跳到最新 ↓" onClick={toBottom} />}
          <ToolButton label={paused ? '繼續更新' : '暫停更新'} onClick={() => setPaused((on) => !on)} />
        </span>
      </div>

      <div
        ref={boxRef}
        onScroll={onScroll}
        role="log"
        aria-live="off"
        className="mt-[6px] overflow-y-auto bg-[#2C322F] px-[18px] py-[14px] font-mono fs-16 leading-[1.55] [scrollbar-width:thin]"
        style={{ height: LOG_HEIGHT }}
      >
        {log.lines.length === 0 && <p className="py-[48px] text-center font-[inherit] text-[#8A8E86]">{emptyText}</p>}
        {log.lines.map((line, index) => (
          <div key={index} className={`whitespace-pre-wrap break-all font-normal ${LINE_COLOR[lineLevel(line) ?? 'none']}`}>
            {line}
          </div>
        ))}
      </div>
    </AccountSubPage>
  );
}
