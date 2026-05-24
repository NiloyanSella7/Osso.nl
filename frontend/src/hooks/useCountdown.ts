import { useState, useEffect } from 'react';

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  label: string;
  urgent: boolean;
}

function parseUTC(dateStr: string): Date {
  if (dateStr.endsWith('Z') || dateStr.includes('+')) return new Date(dateStr);
  return new Date(dateStr + 'Z');
}

function compute(deadline: string): CountdownResult {
  const diff = parseUTC(deadline).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, label: 'Gesloten', urgent: false };
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const urgent = diff < 86400000;

  let label: string;
  if (days > 0) {
    label = `${days}d ${hours}u ${minutes}m`;
  } else if (hours > 0) {
    label = `${hours}u ${minutes}m ${seconds}s`;
  } else {
    label = `${minutes}m ${seconds}s`;
  }

  return { days, hours, minutes, seconds, expired: false, label, urgent };
}

export function useCountdown(deadline: string): CountdownResult {
  const [result, setResult] = useState(() => compute(deadline));

  useEffect(() => {
    const id = setInterval(() => setResult(compute(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return result;
}
