import React, { useEffect, useRef } from 'react';

export const OTPInput = ({ value, onChange, disabled = false }) => {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] || '');

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setDigit = (index, digit) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join('').slice(0, 6));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };

  const handleChange = (index, raw) => {
    const pasted = raw.replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 1) {
      const next = digits.slice();
      pasted.split('').forEach((digit, offset) => {
        if (index + offset < 6) next[index + offset] = digit;
      });
      onChange(next.join('').slice(0, 6));
      refs.current[Math.min(index + pasted.length, 5)]?.focus();
      return;
    }
    setDigit(index, pasted);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      if (digits[index]) setDigit(index, '');
      else if (index > 0) {
        refs.current[index - 1]?.focus();
        setDigit(index - 1, '');
      }
    } else if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    else if (event.key === 'ArrowRight' && index < 5) refs.current[index + 1]?.focus();
  };

  return (
    <div role="group" aria-label="Six-digit verification code" className="flex justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { refs.current[index] = element; }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={6}
          aria-label={`Verification code digit ${index + 1} of 6`}
          value={digit}
          disabled={disabled}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => {
            event.preventDefault();
            handleChange(index, event.clipboardData.getData('text'));
          }}
          className="h-14 w-12 rounded-xl border-2 border-slate-300 bg-white text-center text-2xl font-black text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 sm:h-16 sm:w-14"
        />
      ))}
    </div>
  );
};
