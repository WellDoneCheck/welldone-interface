import type { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export default function TextField({ label, hint, error, className = '', ...inputProps }: TextFieldProps) {
  const borderClass = error ? 'shadow-[inset_0_0_0_2px_#BC5646]' : 'focus:shadow-[var(--shadow-focus)]';

  return (
    <label className={`block ${className}`}>
      <span className="block fs-36 leading-[52px] text-[#2C322F]">{label}</span>
      <input
        {...inputProps}
        className={`mt-1.5 h-[94px] w-full bg-[#D1E6E7] px-6 fs-32 text-[#2C322F] placeholder-[#767775] outline-none transition-shadow duration-300 ${borderClass}`}
      />
      {error && <span className="mt-1.5 block fs-16 leading-5 text-[#98412F]">{error}</span>}
      {hint && <span className="mt-1.5 block pb-2.5 fs-20 leading-[23px] text-black/50">{hint}</span>}
    </label>
  );
}
