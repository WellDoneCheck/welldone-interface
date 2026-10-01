'use client';

import { useState, type KeyboardEvent } from 'react';

interface InlineNameInputProps {
  // the name so far ('' while it still has its default one, shown as the placeholder)
  initial: string;
  placeholder: string;
  label: string;
  // Enter or leaving the field hands back the draft (blank for the default name); Escape hands back null
  onDone: (name: string | null) => void;
  className?: string;
}

// Renaming in place: replaces the name it edits until done
export default function InlineNameInput({ initial, placeholder, label, onDone, className = '' }: InlineNameInputProps) {
  const [draft, setDraft] = useState(initial);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onDone(draft);
    if (event.key === 'Escape') {
      // don't also close whatever the field sits in (e.g. the map's card)
      event.stopPropagation();
      onDone(null);
    }
  };
  return (
    <input
      autoFocus
      value={draft}
      maxLength={40}
      aria-label={label}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => onDone(draft)}
      className={`min-w-0 flex-1 border-b bg-transparent py-0.5 outline-none ${className}`}
    />
  );
}
