'use client'
import { useEffect, useRef, useState } from "react";

export default function useAnimatedValue(target: number, duration = 250): number {
  const [value, setValue] = useState(0);
  const valueRef = useRef(value);

  useEffect(() => {
    const start = valueRef.current;
    const diff = target - start;
    const startTime = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const next = start + diff * progress;
      valueRef.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
