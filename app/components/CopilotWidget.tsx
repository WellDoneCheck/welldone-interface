'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type FormEvent } from 'react';
import Image from 'next/image';
import { useCopilotChat } from './useCopilotChat';
import { useFitScale, type FitStage } from './useFitScale';
import { COPILOT_NAME, COPILOT_STATUS, COPILOT_SUGGESTIONS, type CopilotMessage } from '../data/copilot';

// Laid out for the 1920×1080 Figma frame and scaled to the viewport
const STAGE: FitStage = { width: 1920, height: 1080, marginX: 0, marginY: 0, minViewportWidth: 0 };
// Full-height drawer docked to the right edge; the tab is its handle
const TAB_WIDTH = 56;
const DRAWER_WIDTH = 600;

const MOTION = 'ease-[var(--ease-expo)] motion-reduce:transition-none';
const MESSAGE_ENTER = 'animate-[copilotMessageIn_400ms_var(--ease-expo)] motion-reduce:animate-none';

/* ─── Header ────────────────────────────────────────────────────── */

function CopilotAvatar({ size }: { size: 'sm' | 'lg' }) {
  const isLarge = size === 'lg';
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-[var(--mint)] ${isLarge ? 'size-12 rounded-2xl' : 'size-8 rounded-xl'}`}
    >
      <Image src="/copilot/sparkles.svg" alt="" width={isLarge ? 22 : 15} height={isLarge ? 22 : 15} />
    </div>
  );
}

function ChatHeader() {
  return (
    <header className="flex shrink-0 items-center gap-3.5 border-b border-[#E5E2D9] bg-[var(--bg-sunlit)] px-7 pb-5 pt-8">
      <CopilotAvatar size="lg" />
      <div className="flex flex-col gap-1 leading-none">
        <p className="text-[26px] font-semibold tracking-tight text-[var(--ink)]">{COPILOT_NAME}</p>
        <p className="flex items-center gap-1.5 text-sm text-[var(--brand-ink)]">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#12B76A] opacity-60 motion-reduce:animate-none" />
            <span className="relative size-2 rounded-full bg-[#12B76A]" />
          </span>
          {COPILOT_STATUS}
        </p>
      </div>
    </header>
  );
}

/* ─── Messages ──────────────────────────────────────────────────── */

// "座標: 23.84, 120.51" is shown as a label/value pair; anything else as plain text
function DetailItem({ detail }: { detail: string }) {
  const [label, value] = detail.split(/:\s(.*)/);
  return (
    <li className="flex gap-3 border-b border-[#E5E2D9] py-2 last:border-b-0">
      {value ? (
        <>
          <span className="w-24 shrink-0 text-[var(--ink-soft)]">{label}</span>
          <span className="font-medium text-[var(--ink)]">{value}</span>
        </>
      ) : (
        <span className="text-[var(--brand-ink)]">{detail}</span>
      )}
    </li>
  );
}

function AssistantMessage({ message }: { message: CopilotMessage }) {
  return (
    <div className={`flex gap-3 ${MESSAGE_ENTER}`}>
      <CopilotAvatar size="sm" />
      <div className="flex max-w-[440px] flex-col gap-1.5">
        <p className="text-[13px] text-[var(--ink-soft)]">
          {COPILOT_NAME} · {message.time}
        </p>
        <div className="flex flex-col gap-3 rounded-2xl rounded-tl-md border border-[#E5E2D9] bg-white px-4 py-3 shadow-[var(--shadow-card)]">
          <p className="text-[15px] leading-[1.6] text-[var(--ink)]">{message.text}</p>
          {message.details && (
            <ul className="rounded-xl bg-[var(--surface-muted)] px-3.5 py-1 text-sm">
              {message.details.map((detail) => (
                <DetailItem key={detail} detail={detail} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: CopilotMessage }) {
  return (
    <div className={`flex flex-col items-end gap-1.5 ${MESSAGE_ENTER}`}>
      <p className="max-w-[400px] rounded-2xl rounded-tr-md bg-[image:var(--gradient-primary)] px-4 py-3 text-[15px] leading-[1.6] text-white shadow-[var(--shadow-brand-glow)]">
        {message.text}
      </p>
      <p className="text-[13px] text-[var(--ink-soft)]">{message.time}</p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className={`flex gap-3 ${MESSAGE_ENTER}`}>
      <CopilotAvatar size="sm" />
      <div
        role="status"
        aria-label={`${COPILOT_NAME} 正在輸入`}
        className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-[#E5E2D9] bg-white px-4 py-4 shadow-[var(--shadow-card)]"
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-2 animate-bounce rounded-full bg-[var(--brand)] motion-reduce:animate-none"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageThread({ messages, typing, active }: { messages: CopilotMessage[]; typing: boolean; active: boolean }) {
  const threadRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing, active]);

  return (
    <div
      ref={threadRef}
      aria-live="polite"
      className="flex min-h-px flex-1 flex-col gap-6 overflow-y-auto bg-[image:var(--gradient-paper-strata)] px-7 py-6"
    >
      <p className="flex items-center gap-3 text-xs text-[var(--ink-soft)] before:h-px before:flex-1 before:bg-[#E5E2D9] after:h-px after:flex-1 after:bg-[#E5E2D9]">
        今天
      </p>
      {messages.map((message) =>
        message.role === 'user' ? <UserMessage key={message.id} message={message} /> : <AssistantMessage key={message.id} message={message} />,
      )}
      {typing && <TypingIndicator />}
    </div>
  );
}

/* ─── Composer ──────────────────────────────────────────────────── */

function Suggestions({ onPick, disabled }: { onPick: (text: string) => void; disabled: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COPILOT_SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          disabled={disabled}
          onClick={() => onPick(suggestion)}
          className={`rounded-full border border-[rgba(98,164,167,0.35)] bg-white px-3.5 py-1.5 text-sm text-[var(--brand-ink)] transition-[background-color,transform] duration-300 ${MOTION} hover:-translate-y-0.5 hover:bg-[var(--mint)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50`}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

function Composer({ onSend, disabled, inputRef }: { onSend: (text: string) => void; disabled: boolean; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const [draft, setDraft] = useState('');
  const canSend = draft.trim().length > 0 && !disabled;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    onSend(draft);
    setDraft('');
  };

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-[#E5E2D9] bg-[var(--bg-sunlit)] px-7 pb-7 pt-4">
      <Suggestions onPick={onSend} disabled={disabled} />
      <form
        onSubmit={submit}
        className="flex h-14 items-center gap-2 rounded-2xl border border-[#E5E2D9] bg-white pl-4 pr-2 shadow-[var(--shadow-card)] transition-shadow duration-300 focus-within:shadow-[var(--shadow-focus)]"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`問問 ${COPILOT_NAME}…`}
          aria-label={`傳訊息給 ${COPILOT_NAME}`}
          className="min-w-px flex-1 bg-transparent text-base text-[var(--ink)] placeholder-[var(--ink-soft)] outline-none"
        />
        <button
          type="submit"
          aria-label="送出訊息"
          disabled={!canSend}
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] transition-[transform,opacity] duration-300 ${MOTION} hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-40`}
        >
          <Image src="/copilot/arrow-right.svg" alt="" width={16} height={16} />
        </button>
      </form>
    </div>
  );
}

/* ─── Edge tab ──────────────────────────────────────────────────── */

function EdgeTab({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={isOpen ? `收合 ${COPILOT_NAME} 助理` : `開啟 ${COPILOT_NAME} 助理`}
      aria-expanded={isOpen}
      aria-controls="copilot-window"
      onClick={onToggle}
      style={{ width: TAB_WIDTH }}
      className={`group pointer-events-auto flex h-[176px] -mr-px shrink-0 flex-col items-center justify-center gap-3 rounded-l-[20px] bg-[#62A4A7] text-white shadow-[-4px_4px_16px_rgba(16,24,40,0.18)] outline-none transition-[transform,filter,box-shadow] duration-300 ${MOTION} hover:shadow-[-8px_6px_24px_rgba(16,24,40,0.28)] hover:brightness-110 focus-visible:shadow-[var(--shadow-focus)] ${
        isOpen ? 'translate-x-0' : 'translate-x-3 hover:translate-x-0 focus-visible:translate-x-0'
      }`}
    >
      <Image
        src="/copilot/message-square.svg"
        alt=""
        width={22}
        height={22}
        className={`transition-transform duration-300 ${MOTION} group-hover:scale-110`}
      />
      <span className="text-base font-medium tracking-[0.2em] [text-orientation:upright] [writing-mode:vertical-rl]">AI助理</span>
      <svg
        aria-hidden
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className={`transition-transform duration-500 ${MOTION} ${isOpen ? 'rotate-180' : 'group-hover:-translate-x-0.5'}`}
      >
        <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/* ─── Widget ────────────────────────────────────────────────────── */

// AI copilot drawer shown on every page once logged in; only its tab shows while closed
export default function CopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, typing, send } = useCopilotChat();
  // the whole window, scrollbar included: the tab keeps its size on pages with and without a scrollbar
  const scale = useFitScale(STAGE, true);
  const inputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Clicking anywhere outside the drawer (tab included) retracts it
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!drawerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      event.stopPropagation();
      setIsOpen(false);
    }
  };

  return (
    <div
      onKeyDown={onKeyDown}
      // Only the tab and the drawer take clicks: the wrapper spans the full height, even while the drawer is away.
      // Its own layer on page changes, kept still above everything like the navbar (globals.css).
      className="pointer-events-none fixed right-0 top-0 z-[55] [view-transition-name:copilot]"
    >
      <div
        ref={drawerRef}
        className={`flex items-center font-sans transition-transform duration-700 ${MOTION}`}
        style={{ zoom: scale, transform: isOpen ? 'none' : `translateX(${DRAWER_WIDTH}px)` }}
      >
        <EdgeTab isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} />
        <section
          id="copilot-window"
          aria-label={`${COPILOT_NAME} 聊天視窗`}
          inert={!isOpen}
          className={`pointer-events-auto flex flex-col overflow-clip border-l-4 border-l-[#62A4A7] bg-[var(--bg-paper)] transition-shadow duration-700 ${MOTION} ${
            isOpen ? 'shadow-[-12px_0_40px_rgba(44,50,47,0.25)]' : 'shadow-none'
          }`}
          style={{ width: DRAWER_WIDTH, height: `calc(100dvh / ${scale})` }}
        >
          <ChatHeader />
          <MessageThread messages={messages} typing={typing} active={isOpen} />
          <Composer onSend={send} disabled={typing} inputRef={inputRef} />
        </section>
      </div>
    </div>
  );
}
