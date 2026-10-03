'use client'
import { useState, useEffect, useRef } from "react";

export default function useAnimatedValue(target: number, duration = 250): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const start = valueRef.current;
    const diff = target - start;
    const startTime = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setValue(start + diff * progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
