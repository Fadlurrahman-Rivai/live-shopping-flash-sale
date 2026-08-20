import { useState, useEffect } from "react";
import { pad2 } from "../utils";

export interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  formatted: string;
}

export function useCountdown(endTime: string): Countdown {
  const getMs = () => Math.max(0, Date.parse(endTime) - Date.now());
  const [ms, setMs] = useState(getMs);

  useEffect(() => {
    setMs(getMs());
    const id = setInterval(() => setMs(getMs()), 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const totalSecs = Math.floor(ms / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  return {
    hours,
    minutes,
    seconds,
    expired: ms === 0,
    formatted: `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`,
  };
}
