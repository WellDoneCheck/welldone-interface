'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { replyTo, SEED_MESSAGES, type CopilotMessage } from '../data/copilot';

const REPLY_DELAY_MS = 1100;

const nowTime = () => new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });

let messageCounter = 0;
const nextId = () => `msg-${++messageCounter}`;

// Chat state with a fake assistant that answers after a short "typing" pause
export function useCopilotChat() {
  const [messages, setMessages] = useState<CopilotMessage[]>(SEED_MESSAGES);
  const [typing, setTyping] = useState(false);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(replyTimer.current), []);

  const send = useCallback(
    (rawText: string) => {
      const text = rawText.trim();
      if (!text || typing) return;

      setMessages((current) => [...current, { id: nextId(), role: 'user', text, time: nowTime() }]);
      setTyping(true);
      replyTimer.current = setTimeout(() => {
        setMessages((current) => [...current, { id: nextId(), role: 'assistant', ...replyTo(text), time: nowTime() }]);
        setTyping(false);
      }, REPLY_DELAY_MS);
    },
    [typing],
  );

  return { messages, typing, send };
}
