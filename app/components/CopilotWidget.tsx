'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type FormEvent } from 'react';
import Image from 'next/image';
import { useCopilotChat } from './useCopilotChat';
import { useFitScale, type FitStage } from './useFitScale';
import { COPILOT_NAME, COPILOT_STATUS, type CopilotMessage } from '../data/copilot';

// Laid out for the 1920×1080 Figma frame and scaled to the viewport
const STAGE: FitStage = { width: 1920, height: 1080, marginX: 0, marginY: 0, minViewportWidth: 0 };
const RIGHT_OFFSET = 56;
// Figma: 19px from the bottom, plus 4px slack under the button inside its 826px column
const BOTTOM_OFFSET = 23;
const WINDOW_HEIGHT = 726;
const HEADER_HEIGHT = 76;

const MOTION = 'ease-[var(--ease-expo)] motion-reduce:transition-none';

type WindowState = 'closed' | 'open' | 'minimized';

/* ─── Header ────────────────────────────────────────────────────── */

function ChatHeader({ onMinimize, onClose }: { onMinimize: () => void; onClose: () => void }) {
  return (
    <div className="flex h-[76px] w-full shrink-0 items-center justify-between border-b border-[#F7F6F1] px-4 py-[14px]">
      <div className="flex items-center gap-[10px]">
        <div className="relative size-[50px]">
          <div className="flex size-[50px] items-center justify-center rounded-[16px] bg-[#D1E6E7]">
            <Image src="/copilot/sparkles.svg" alt="" width={19} height={19} />
          </div>
          <Image src="/copilot/status-dot.svg" alt="" width={10} height={10} className="absolute bottom-0 right-0" />
        </div>
        <div className="flex flex-col gap-0.5 whitespace-nowrap leading-[normal]">
          <p className="text-[28px] font-medium text-[#2C322F]">{COPILOT_NAME}</p>
          <p className="text-sm text-[#62A4A7]">{COPILOT_STATUS}</p>
        </div>
      </div>
      <div className="flex items-center gap-[7px]">
        <button type="button" aria-label="縮小視窗" onClick={onMinimize} className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-black/5">
          <Image src="/copilot/minus.svg" alt="" width={24} height={28} />
        </button>
        <button type="button" aria-label="關閉視窗" onClick={onClose} className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-black/5">
          <Image src="/copilot/close.svg" alt="" width={30} height={30} className="max-w-none" />
        </button>
      </div>
    </div>
  );
}

/* ─── Messages ──────────────────────────────────────────────────── */

function ChatRow({ message }: { message: CopilotMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`flex flex-col gap-1.5 rounded-xl px-[14px] py-[10px] ${
          isUser ? 'max-w-[329px] bg-[#62A4A7] text-white' : 'max-w-[400px] bg-[#D1E6E7] text-[#2C322F]'
        }`}
      >
        <p className="text-base leading-[1.4]">{message.text}</p>
        {message.details && (
          <ul className="flex flex-col gap-1 text-[15px] leading-[normal] text-[#6F7468]">
            {message.details.map((detail) => (
              <li key={detail}>• {detail}</li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[13px] leading-[normal] text-[#6F7468]">{message.time}</p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div role="status" aria-label={`${COPILOT_NAME} 正在輸入`} className="flex w-fit items-center gap-1.5 rounded-xl bg-[#D1E6E7] px-[14px] py-[14px]">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-2 animate-bounce rounded-full bg-[#62A4A7] motion-reduce:animate-none"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function MessageThread({ messages, typing, active }: { messages: CopilotMessage[]; typing: boolean; active: boolean }) {
  const threadRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages.length, typing, active]);

  return (
    <div ref={threadRef} aria-live="polite" className="flex min-h-px flex-1 flex-col gap-4 overflow-y-auto bg-[#F7F6F1] p-4">
      {messages.map((message) => (
        <ChatRow key={message.id} message={message} />
      ))}
      {typing && <TypingIndicator />}
    </div>
  );
}

/* ─── Input ─────────────────────────────────────────────────────── */

function InputBar({ onSend, disabled, inputRef }: { onSend: (text: string) => void; disabled: boolean; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const [draft, setDraft] = useState('');
  const canSend = draft.trim().length > 0 && !disabled;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    onSend(draft);
    setDraft('');
  };

  return (
    <form onSubmit={submit} className="flex shrink-0 items-center gap-[10px] border-t border-[#D9D6CE] p-3">
      <label className="flex h-10 min-w-px flex-1 items-center gap-2 rounded-[20px] bg-[#F1EFE9] px-3 focus-within:shadow-[var(--shadow-focus)]">
        <Image src="/copilot/paperclip.svg" alt="" width={18} height={18} />
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="輸入訊息..."
          aria-label={`傳訊息給 ${COPILOT_NAME}`}
          className="min-w-px flex-1 bg-transparent text-base text-[#2C322F] placeholder-[#6F7468] outline-none"
        />
        <Image src="/copilot/smile.svg" alt="" width={18} height={18} />
      </label>
      <button
        type="submit"
        aria-label="送出訊息"
        disabled={!canSend}
        className="flex size-10 shrink-0 items-center justify-center rounded-[20px] bg-[#62A4A7] transition-all duration-300 hover:brightness-110 active:scale-95 disabled:opacity-50"
      >
        <Image src="/copilot/arrow-right.svg" alt="" width={16} height={16} />
      </button>
    </form>
  );
}

/* ─── Widget ────────────────────────────────────────────────────── */

// Floating AI copilot shown on every page once logged in
export default function CopilotWidget({ hidden = false }: { hidden?: boolean }) {
  const [windowState, setWindowState] = useState<WindowState>('closed');
  const { messages, typing, send } = useCopilotChat();
  const scale = useFitScale(STAGE);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = windowState === 'open';
  const isClosed = windowState === 'closed';

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !isClosed) {
      event.stopPropagation();
      setWindowState('closed');
    }
  };

  return (
    <div
      inert={hidden}
      onKeyDown={onKeyDown}
      className={`fixed z-[55] transition-opacity duration-500 ${MOTION} ${hidden ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      style={{ right: RIGHT_OFFSET * scale, bottom: BOTTOM_OFFSET * scale }}
    >
      <div className="flex w-[904px] flex-col items-end gap-4 font-sans" style={{ zoom: scale }}>
        <section
          id="copilot-window"
          aria-label={`${COPILOT_NAME} 聊天視窗`}
          inert={isClosed}
          className={`flex w-full origin-bottom-right flex-col overflow-clip border border-[#D9D6CE] bg-[#F7F6F1] shadow-[0_4px_20px_8px_rgba(0,0,0,0.5)] transition-[height,transform,opacity] duration-500 ${MOTION} ${
            isClosed ? 'pointer-events-none translate-y-3 scale-95 opacity-0' : 'translate-y-0 scale-100 opacity-100'
          }`}
          style={{ height: windowState === 'minimized' ? HEADER_HEIGHT + 2 : WINDOW_HEIGHT }}
          onClick={() => windowState === 'minimized' && setWindowState('open')}
        >
          <ChatHeader onMinimize={() => setWindowState('minimized')} onClose={() => setWindowState('closed')} />
          <div inert={!isOpen} className="flex min-h-px flex-1 flex-col">
            <MessageThread messages={messages} typing={typing} active={isOpen} />
            <InputBar onSend={send} disabled={typing} inputRef={inputRef} />
          </div>
        </section>

        <button
          type="button"
          aria-label={isOpen ? `收合 ${COPILOT_NAME} 助理` : `開啟 ${COPILOT_NAME} 助理`}
          aria-expanded={isOpen}
          aria-controls="copilot-window"
          onClick={() => setWindowState(isOpen ? 'closed' : 'open')}
          className={`flex size-20 items-center justify-center rounded-[28px] bg-[#62A4A7] drop-shadow-[0_4px_8px_rgba(16,24,40,0.1)] transition-all duration-300 ${MOTION} hover:-translate-y-1 hover:brightness-110 active:scale-95`}
        >
          <Image src="/copilot/message-square.svg" alt="" width={24} height={24} />
        </button>
      </div>
    </div>
  );
}
