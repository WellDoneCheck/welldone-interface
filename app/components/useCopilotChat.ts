'use client';

import { useCallback, useState } from 'react';
import { SEED_MESSAGES, type CopilotMessage } from '../data/copilot';
import { askCopilot } from '../utils/copilot';

// The typing dots show at least this long, so a quick answer does not just flash them
const MIN_TYPING_MS = 1100;

const nowTime = () => new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let messageCounter = 0;
const nextId = () => `msg-${++messageCounter}`;

// Chat state: each question is sent to the backend, its answer shown after the "typing" pause
export function useCopilotChat() {
  const [messages, setMessages] = useState<CopilotMessage[]>(SEED_MESSAGES);
  const [typing, setTyping] = useState(false);

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || typing) return;

      setMessages((current) => [...current, { id: nextId(), role: 'user', text, time: nowTime() }]);
      setTyping(true);
      const [reply] = await Promise.all([askCopilot(text), delay(MIN_TYPING_MS)]);
      setMessages((current) => [...current, { id: nextId(), role: 'assistant', ...reply, time: nowTime() }]);
      setTyping(false);
    },
    [typing],
  );

  return { messages, typing, send };
}
