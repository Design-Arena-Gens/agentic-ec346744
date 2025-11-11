"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const GRID_SIZE = 16;

function useBeep() {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => () => {
    if (ctxRef.current) ctxRef.current.close().catch(() => {});
  }, []);

  return useCallback(() => {
    try {
      if (!ctxRef.current) {
        // Safari/iOS requires creation in a user gesture
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = ctxRef.current!;
      const durationMs = 140;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880; // A5
      gain.gain.value = 0.001;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
      oscillator.start();
      oscillator.stop(now + durationMs / 1000);
    } catch {
      // Ignore audio errors
    }
  }, []);
}

export default function Page() {
  const [values, setValues] = useState<number[]>(() => Array.from({ length: GRID_SIZE }, () => Math.floor(Math.random() * 20)));
  const [animating, setAnimating] = useState<boolean>(false);
  const [active, setActive] = useState<boolean[]>(() => Array.from({ length: GRID_SIZE }, () => false));
  const beep = useBeep();

  const targets = useMemo(() => Array.from({ length: GRID_SIZE }, () => 10 + Math.floor(Math.random() * 90)), [/* re-roll each click via key */]);
  const rafRef = useRef<number | null>(null);

  const animateToTargets = useCallback(() => {
    setAnimating(true);
    setActive(Array.from({ length: GRID_SIZE }, () => true));

    const start = performance.now();
    const startValues = values.slice();

    const step = (t: number) => {
      const elapsed = t - start;
      const progress = Math.min(1, elapsed / 900);
      const eased = 1 - Math.pow(1 - progress, 3);

      setValues(startValues.map((v, i) => Math.round(v + (targets[i] - v) * eased)));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setAnimating(false);
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, [targets, values]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const onClick = useCallback(() => {
    beep();
    animateToTargets();
  }, [beep, animateToTargets]);

  return (
    <main className="container">
      <header className="header">
        <button
          className="speaker"
          aria-label={animating ? "Animating numbers" : "Play and animate numbers"}
          onClick={onClick}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.25-3.9v7.8A4.5 4.5 0 0 0 16.5 12zm0-8a8.5 8.5 0 0 1 0 16v-2a6.5 6.5 0 0 0 0-12V4z"/>
          </svg>
          <span className="label">Click speaker</span>
        </button>
      </header>

      <section className="grid" aria-live="polite" aria-busy={animating}>
        {values.map((n, idx) => (
          <div key={idx} className={"cell" + (active[idx] ? " active" : "")}>{n}</div>
        ))}
      </section>

      <footer className="footer">Multiple numbers grow and turn green.</footer>
    </main>
  );
}
