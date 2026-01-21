import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TransitionMode } from "./setting-sheet";

import "../css/slide-show.css";
import {
  keyOf,
  nextIndex,
  prefetchMedia,
  TRANSPARENT_PIXEL,
  waitVideoReady,
  type MediaItem,
} from "../utils/slide-show.media";
import { getMotionTriplet } from "../utils/slide.motion";

type Props = {
  items: MediaItem[];
  intervalSec: number;
  shuffle: boolean;
  kenBurns: boolean;
  playing: boolean;
  onPlayingChange: (v: boolean) => void;
  shuffleSeed: number;
  transitionMode: TransitionMode;
};

type IncomingState = {
  idx: number;
  item: MediaItem;
  key: string;
  ready: boolean;
};

async function waitFirstVideoFrame(el: HTMLVideoElement, timeoutMs: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyEl = el as any;

  if (typeof anyEl.requestVideoFrameCallback === "function") {
    await new Promise<void>((resolve) => {
      let done = false;
      const t = setTimeout(() => {
        if (done) return;
        done = true;
        resolve();
      }, timeoutMs);

      anyEl.requestVideoFrameCallback(() => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve();
      });
    });
    return;
  }

  await new Promise<void>((resolve) => {
    let done = false;
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      resolve();
    }, timeoutMs);

    const on = () => {
      if (done) return;
      done = true;
      clearTimeout(t);
      el.removeEventListener("timeupdate", on);
      el.removeEventListener("playing", on);
      resolve();
    };

    el.addEventListener("timeupdate", on, { once: true });
    el.addEventListener("playing", on, { once: true });
  });
}

export function Slideshow({
  items,
  intervalSec,
  shuffle,
  kenBurns,
  playing,
  onPlayingChange,
  shuffleSeed,
  transitionMode,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [incoming, setIncoming] = useState<IncomingState | null>(null);

  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const incomingVideoRef = useRef<HTMLVideoElement | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dueRef = useRef<number>(0);

  const order = useMemo(() => {
    const arr = items.map((_, i) => i);
    if (!shuffle) return arr;

    let s = shuffleSeed || 1;
    for (let i = arr.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const r = s / 233280;
      const j = Math.floor(r * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [items, shuffle, shuffleSeed]);

  const safeLen = order.length;
  const shownIdx = safeLen ? ((idx % safeLen) + safeLen) % safeLen : 0;
  const shownItem = safeLen ? (items[order[shownIdx] ?? 0] ?? null) : null;
  const shownKey = shownItem ? keyOf(shownItem) : "";
  const shownIsImage = shownItem?.type === "image";
  const shownIsVideo = shownItem?.type === "video";

  useEffect(() => {
    if (!safeLen) return;
    const nextI = nextIndex(shownIdx, safeLen);
    const itemToPreload = items[order[nextI]];
    if (itemToPreload) prefetchMedia(itemToPreload);
  }, [shownIdx, safeLen, order, items]);

  const scheduleNext = (nextI: number) => {
    if (!safeLen) return;
    if (incoming) return;
    const ni = ((nextI % safeLen) + safeLen) % safeLen;
    const it = items[order[ni] ?? 0];
    if (!it) return;
    setIncoming({ idx: ni, item: it, key: keyOf(it), ready: false });
  };

  const goNext = () => {
    if (!safeLen) return;
    scheduleNext(nextIndex(shownIdx, safeLen));
  };

  useEffect(() => {
    if (!incoming) return;

    let cancelled = false;
    const timeoutMs = incoming.item.type === "video" ? 4500 : 2000;

    const markReady = () => {
      if (cancelled) return;
      setIncoming((p) => (p && !p.ready ? { ...p, ready: true } : p));
    };

    const fallback = setTimeout(markReady, timeoutMs);

    if (incoming.item.type === "image") {
      const img = new Image();
      img.onload = () =>
        requestAnimationFrame(() => requestAnimationFrame(markReady));
      img.onerror = markReady;
      img.src = incoming.item.src;
      return () => {
        cancelled = true;
        clearTimeout(fallback);
      };
    }

    const el = incomingVideoRef.current;
    if (!el) return;

    (async () => {
      try {
        el.src = incoming.item.src;
        el.load();

        await waitVideoReady(el, timeoutMs);

        try {
          el.pause();
        } catch {
          // ignore
        }

        try {
          el.currentTime = 0;
        } catch {
          // ignore
        }

        const p = el.play();
        if (p instanceof Promise) await p.catch(() => {});

        await waitFirstVideoFrame(el, 350);

        try {
          el.pause();
        } catch {
          // ignore
        }

        try {
          el.currentTime = 0;
        } catch {
          // ignore
        }

        if (!cancelled) markReady();
      } catch {
        if (!cancelled) markReady();
      } finally {
        clearTimeout(fallback);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, [incoming?.key]);

  useEffect(() => {
    if (!incoming?.ready) return;

    if (shownIsVideo && activeVideoRef.current) {
      activeVideoRef.current.pause();
    }

    const t = setTimeout(() => {
      setIdx(incoming.idx);
      setIncoming(null);
    }, 560);

    return () => clearTimeout(t);
  }, [incoming?.ready, incoming?.idx, shownIsVideo]);

  useEffect(() => {
    if (!playing || !shownIsImage) return;
    if (!safeLen || safeLen <= 1) return;
    if (incoming) return;

    const intervalMs = Math.max(500, intervalSec * 1000);
    dueRef.current = performance.now() + intervalMs;

    const tick = () => {
      const now = performance.now();
      if (!incoming && now + 6 >= dueRef.current) {
        goNext();
        dueRef.current = now + intervalMs;
      }
      timerRef.current = setTimeout(tick, 16);
    };

    timerRef.current = setTimeout(tick, 16);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [playing, shownIsImage, intervalSec, safeLen, shownIdx, incoming?.key]);

  useEffect(() => {
    const el = activeVideoRef.current;
    if (!el || !shownIsVideo) return;

    if (!playing || incoming?.ready) {
      el.pause();
      return;
    }

    const t = setTimeout(() => {
      const r = el.play();
      if (r instanceof Promise) r.catch(() => {});
    }, 0);

    return () => clearTimeout(t);
  }, [playing, shownIsVideo, shownKey, incoming?.ready]);

  const handleVideoEnded = () => {
    if (!playing) return;
    if (incoming) return;
    goNext();
  };

  if (!shownItem) return null;

  const shownTriplet = getMotionTriplet(
    transitionMode,
    shownItem.type === "image",
    kenBurns,
  );

  const incomingTriplet = incoming
    ? getMotionTriplet(transitionMode, incoming.item.type === "image", kenBurns)
    : null;

  const layerClass =
    transitionMode === "flip"
      ? "slideshow-layer slideshow-layer--flip"
      : "slideshow-layer";

  return (
    <div className="slideshow-root slideshow-no-controls">
      <motion.div
        key={shownKey}
        className={layerClass}
        initial={shownTriplet.animate}
        animate={incoming?.ready ? shownTriplet.exit : shownTriplet.animate}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{
          transformStyle: transitionMode === "flip" ? "preserve-3d" : undefined,
        }}
      >
        {shownItem.type === "image" ? (
          <div
            className="slideshow-img"
            style={{ backgroundImage: `url(${shownItem.src})` }}
          />
        ) : (
          <video
            key={shownKey}
            ref={activeVideoRef}
            src={shownItem.src}
            poster={TRANSPARENT_PIXEL}
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            muted={shownItem.muted ?? true}
            loop={false}
            preload="auto"
            controls={false}
            onEnded={handleVideoEnded}
            className="slideshow-video"
            disablePictureInPicture
            disableRemotePlayback
          />
        )}
      </motion.div>

      {incoming && incomingTriplet && (
        <motion.div
          key={incoming.key}
          className={layerClass}
          style={{
            opacity: incoming.ready ? 1 : 0,
            transformStyle:
              transitionMode === "flip" ? "preserve-3d" : undefined,
          }}
          initial={incomingTriplet.initial}
          animate={
            incoming.ready ? incomingTriplet.animate : incomingTriplet.initial
          }
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {incoming.item.type === "image" ? (
            <div
              className="slideshow-img"
              style={{ backgroundImage: `url(${incoming.item.src})` }}
            />
          ) : (
            <video
              key={incoming.key}
              ref={incomingVideoRef}
              src={incoming.item.src}
              poster={TRANSPARENT_PIXEL}
              playsInline
              webkit-playsinline="true"
              x5-playsinline="true"
              muted={incoming.item.muted ?? true}
              loop={false}
              preload="auto"
              controls={false}
              className="slideshow-video"
              disablePictureInPicture
              disableRemotePlayback
            />
          )}
        </motion.div>
      )}

      <div className="slideshow-overlay" />
      <div
        onDoubleClick={() => onPlayingChange(true)}
        className="slideshow-capture"
      />
    </div>
  );
}
