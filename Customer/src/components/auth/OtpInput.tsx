import {useEffect, useRef, useState} from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
}

export function OtpInput({value, onChange, length = 6, disabled}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [focused, setFocused] = useState(0);
  const digits = Array.from({length}, (_, i) => value[i] || '');

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const update = (next: string[]) => {
    onChange(next.join('').slice(0, length));
  };

  return (
    <div className="flex justify-center gap-2.5">
      {digits.map((digit, index) => {
        const isActive = focused === index;
        return (
          <input
            key={index}
            ref={el => {
              inputsRef.current[index] = el;
            }}
            inputMode="numeric"
            maxLength={1}
            disabled={disabled}
            value={digit}
            onFocus={() => setFocused(index)}
            onChange={e => {
              const char = e.target.value.replace(/\D/g, '').slice(-1);
              const next = [...digits];
              next[index] = char;
              update(next);
              if (char && index < length - 1) {
                inputsRef.current[index + 1]?.focus();
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Backspace' && !digits[index] && index > 0) {
                inputsRef.current[index - 1]?.focus();
              }
            }}
            onPaste={e => {
              e.preventDefault();
              const pasted = e.clipboardData
                .getData('text')
                .replace(/\D/g, '')
                .slice(0, length);
              if (!pasted) return;
              const next = Array.from({length}, (_, i) => pasted[i] || '');
              update(next);
              inputsRef.current[Math.min(pasted.length, length) - 1]?.focus();
            }}
            className={`h-[52px] w-[46px] rounded-[12px] border bg-white text-center text-[20px] font-semibold text-[#111111] outline-none transition sm:h-14 sm:w-12 ${
              isActive
                ? 'border-[#3B82F6] shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
                : digit
                  ? 'border-[#93C5FD]'
                  : 'border-[#E5E7EB]'
            }`}
          />
        );
      })}
    </div>
  );
}
