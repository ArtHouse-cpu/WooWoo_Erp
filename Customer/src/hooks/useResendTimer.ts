import {useEffect, useState} from 'react';

export function useResendTimer(initial = 60) {
  const [seconds, setSeconds] = useState(initial);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setInterval(() => setSeconds(s => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  const restart = (value = initial) => setSeconds(value);

  return {
    seconds,
    canResend: seconds <= 0,
    label: `00:${String(Math.max(seconds, 0)).padStart(2, '0')}`,
    restart,
  };
}
