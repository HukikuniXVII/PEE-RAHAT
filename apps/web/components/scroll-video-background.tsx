"use client";

import { useEffect, useRef } from "react";

export function ScrollVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    const container = document.getElementById("snap-root");
    if (!video || !container || !overlay) return;

    let targetTime = 0;
    let lastScrollTop = 0;
    let lastScrollAt = performance.now();
    let scrollVelocity = 0; // viewport-heights per second
    let rafId: number;

    const onScroll = () => {
      const now = performance.now();
      const scrollTop = container.scrollTop;
      const vh = window.innerHeight;
      const dt = Math.max(now - lastScrollAt, 1);

      // Velocity in viewport-heights/second — drives the lerp speed.
      scrollVelocity = Math.abs((scrollTop - lastScrollTop) / vh) / (dt / 1000);

      lastScrollTop = scrollTop;
      lastScrollAt = now;

      // Target time from exact scroll position.
      const progress = Math.min(scrollTop / vh, 1);
      targetTime = progress * (video.duration || 0);

      // Fade video out as we enter section 3.
      const fadeStart = vh * 1.2;
      const fadeEnd = vh * 1.8;
      const opacity =
        scrollTop < fadeStart
          ? 0.55
          : scrollTop > fadeEnd
          ? 0
          : 0.55 * (1 - (scrollTop - fadeStart) / (fadeEnd - fadeStart));
      overlay.style.opacity = String(opacity);
    };

    const tick = () => {
      if (video.duration) {
        const diff = targetTime - video.currentTime;

        // Faster scroll → larger lerp factor → video advances more aggressively.
        // Base 0.06 keeps it smooth at rest; velocity term makes it snappy while scrolling.
        const lerp = Math.min(0.06 + scrollVelocity * 0.09, 0.35);

        if (Math.abs(diff) > 0.0005) {
          video.currentTime += diff * lerp;
        } else {
          video.currentTime = targetTime;
        }

        // Friction: bleed off velocity between frames so it decelerates naturally.
        scrollVelocity *= 0.82;
      }

      rafId = requestAnimationFrame(tick);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      container.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 pointer-events-none"
      style={{ opacity: 0.55, zIndex: 0 }}
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        src="/background.mp4"
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
