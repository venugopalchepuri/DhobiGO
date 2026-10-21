import React, { useRef, useEffect } from 'react';

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.split('').slice(0, length);
  while (digits.length < length) {
    digits.push('');
  }

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const currentDigits = [...digits];
      if (currentDigits[index]) {
        currentDigits[index] = '';
        onChange(currentDigits.join(''));
      } else if (index > 0) {
        currentDigits[index - 1] = '';
        onChange(currentDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) return;

    // If user pasted multi-digit string
    if (rawVal.length > 1) {
      const pastedDigits = rawVal.slice(0, length).split('');
      const newDigits = [...digits];
      pastedDigits.forEach((d, i) => {
        if (index + i < length) {
          newDigits[index + i] = d;
        }
      });
      onChange(newDigits.join(''));
      const nextIndex = Math.min(index + pastedDigits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single digit input
    const char = rawVal.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    onChange(newDigits.join(''));

    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pastedData) return;

    const newDigits = pastedData.slice(0, length);
    onChange(newDigits);
    const targetIdx = Math.min(newDigits.length, length - 1);
    inputRefs.current[targetIdx]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-2 max-w-sm mx-auto">
      {digits.map((digit, idx) => {
        const isFilled = digit !== '';
        return (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            disabled={disabled}
            value={digit}
            onChange={(e) => handleChange(e, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onPaste={handlePaste}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold rounded-2xl border-2 transition-all tabular-nums ${
              isFilled
                ? 'border-emerald-600 bg-emerald-50/40 text-slate-900 shadow-xs'
                : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
            } focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none disabled:opacity-50`}
            aria-label={`Digit ${idx + 1}`}
          />
        );
      })}
    </div>
  );
};
