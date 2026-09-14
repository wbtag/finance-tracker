'use client'
import { useState, useEffect } from "react";

export default function AnimateValue(target: number, duration = 250): number {
  const [value, setValue] = useState(target);

  useEffect(() => {
    const start = value;
    const diff = target - start;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setValue(start + diff * progress);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [target]);

  return value;
}
