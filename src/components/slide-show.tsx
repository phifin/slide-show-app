import { motion, type TargetAndTransition } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TransitionMode } from "./setting-sheet";

type MediaItem = {
  type: "image" | "video";
  src: string;
  muted?: boolean;
};

interface VideoFrameMetadata {
  presentationTime: number;
  expectedDisplayTime: number;
  width: number;
  height: number;
  mediaTime: number;
  presentedFrames: number;
  processingDuration?: number;
}

interface HTMLVideoElementWithCallback extends HTMLVideoElement {
  requestVideoFrameCallback(
    callback: (now: number, metadata: VideoFrameMetadata) => void,
  ): number;
  cancelVideoFrameCallback(handle: number): void;
}

const NO_CONTROLS_STYLE = `
  video::-webkit-media-controls { display: none !important; }
  video::-webkit-media-controls-play-button { display: none !important; }
  video::-webkit-media-controls-start-playback-button { display: none !important; }
  video::-webkit-media-controls-overlay-play-button { display: none !important; }
  video::-webkit-media-controls-enclosure { display: none !important; }
  video::-webkit-media-controls-panel { display: none !important; }
`;

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

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

function nextIndex(i: number, len: number) {
  return len <= 0 ? 0 : (i + 1) % len;
}

type MotionTriplet = {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
};

function getMotionTriplet(
  mode: TransitionMode,
  isImage: boolean,
  kenBurns: boolean,
): MotionTriplet {
  if (mode === "slide") {
    return {
      initial: { opacity: 0, x: 60 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -60 },
    };
  }

  if (mode === "flip") {
    return {
      initial: { opacity: 0, rotateY: -70, x: 40, transformPerspective: 1200 },
      animate: { opacity: 1, rotateY: 0, x: 0, transformPerspective: 1200 },
      exit: { opacity: 0, rotateY: 70, x: -40, transformPerspective: 1200 },
    };
  }

  if (mode === "zoom") {
    return {
      initial: { opacity: 0, scale: 0.97 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.03 },
    };
  }

  if (mode === "pan") {
    return {
      initial: { opacity: 0, x: 24 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -24 },
    };
  }

  return {
    initial: { opacity: 0, scale: isImage && kenBurns ? 1.03 : 1 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: isImage && kenBurns ? 1.01 : 1 },
  };
}

function keyOf(item: MediaItem) {
  return `${item.type}:${item.src}`;
}

type IncomingState = {
  idx: number;
  item: MediaItem;
  key: string;
  ready: boolean;
};

function prefetchMedia(item: MediaItem) {
  if (!item) return;
  if (item.type === "image") {
    const img = new Image();
    img.src = item.src;
  } else {
    fetch(item.src, { method: "HEAD" }).catch(() => {});
  }
}

async function waitForVideoFrame(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    if (video.readyState >= 2 && video.currentTime > 0) {
      resolve();
      return;
    }

    let resolved = false;
    const cleanup = () => {
      video.removeEventListener("loadeddata", onData);
      video.removeEventListener("canplay", onData);
      video.removeEventListener("playing", onData);
    };

    const onData = () => {
      if (resolved) return;

      const videoWithCallback = video as HTMLVideoElementWithCallback;
      if (videoWithCallback.requestVideoFrameCallback) {
        videoWithCallback.requestVideoFrameCallback(() => {
          resolved = true;
          cleanup();
          resolve();
        });
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolved = true;
            cleanup();
            resolve();
          });
        });
      }
    };

    video.addEventListener("loadeddata", onData);
    video.addEventListener("canplay", onData);
    video.addEventListener("playing", onData);

    if (video.paused) {
      const playPromise = video.play();
      if (playPromise) {
        playPromise
          .then(() => {
            video.pause();
            video.currentTime = 0;
          })
          .catch(() => {});
      }
    }

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve();
      }
    }, 4000);
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
    if (itemToPreload) {
      prefetchMedia(itemToPreload);
    }
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
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const markReady = () => {
      if (cancelled) return;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      setIncoming((p) => (p && !p.ready ? { ...p, ready: true } : p));
    };

    const timeoutMs = incoming.item.type === "video" ? 4000 : 2000;
    fallbackTimer = setTimeout(() => {
      console.warn("Media load timeout");
      markReady();
    }, timeoutMs);

    if (incoming.item.type === "image") {
      const img = new Image();
      img.onload = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(markReady);
        });
      };
      img.onerror = markReady;
      img.src = incoming.item.src;
      return () => {
        cancelled = true;
        if (fallbackTimer) clearTimeout(fallbackTimer);
      };
    }

    const el = incomingVideoRef.current;
    if (!el) return;

    const prepareVideo = async () => {
      try {
        el.load();

        await new Promise((resolve, reject) => {
          const onReady = () => {
            el.removeEventListener("canplay", onReady);
            el.removeEventListener("error", onErr);
            resolve(null);
          };
          const onErr = () => {
            el.removeEventListener("canplay", onReady);
            el.removeEventListener("error", onErr);
            reject();
          };
          el.addEventListener("canplay", onReady);
          el.addEventListener("error", onErr);
        });

        el.muted = true;
        await el.play();
        await waitForVideoFrame(el);

        el.pause();
        el.currentTime = 0;

        if (!cancelled) markReady();
      } catch (err) {
        console.warn("Video prepare error:", err);
        if (!cancelled) markReady();
      }
    };

    prepareVideo();

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [incoming?.key]);

  useEffect(() => {
    if (!incoming?.ready) return;
    const t = setTimeout(() => {
      setIdx(incoming.idx);
      setIncoming(null);
    }, 560);
    return () => clearTimeout(t);
  }, [incoming?.ready, incoming?.idx]);

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

  // Active video play/pause
  useEffect(() => {
    const el = activeVideoRef.current;
    if (!el || !shownIsVideo) return;
    if (!playing) {
      el.pause();
      return;
    }
    const r = el.play();
    if (r instanceof Promise) r.catch(() => {});
  }, [playing, shownIsVideo, shownKey]);

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

  const layerStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    willChange: "opacity, transform",
    transform: "translateZ(0)",
    transformStyle: transitionMode === "flip" ? "preserve-3d" : undefined,
  };

  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    backgroundColor: "black",
    pointerEvents: "none",
  };

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "black",
      }}
    >
      <style>{NO_CONTROLS_STYLE}</style>

      {/* SHOWN ITEM */}
      <motion.div
        key={shownKey}
        style={layerStyle}
        initial={shownTriplet.animate}
        animate={incoming?.ready ? shownTriplet.exit : shownTriplet.animate}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {shownItem.type === "image" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${shownItem.src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <video
            ref={activeVideoRef}
            src={shownItem.src}
            poster={TRANSPARENT_PIXEL}
            autoPlay={playing}
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            muted={shownItem.muted ?? true}
            loop={false}
            preload="auto"
            controls={false}
            onEnded={handleVideoEnded}
            style={videoStyle}
            disablePictureInPicture
            disableRemotePlayback
          />
        )}
      </motion.div>

      {/* INCOMING ITEM */}
      {incoming && incomingTriplet && (
        <motion.div
          key={incoming.key}
          style={{ ...layerStyle, opacity: incoming.ready ? 1 : 0 }}
          initial={incomingTriplet.initial}
          animate={
            incoming.ready ? incomingTriplet.animate : incomingTriplet.initial
          }
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {incoming.item.type === "image" ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${incoming.item.src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ) : (
            <video
              ref={incomingVideoRef}
              src={incoming.item.src}
              poster={TRANSPARENT_PIXEL}
              autoPlay={false}
              playsInline
              webkit-playsinline="true"
              x5-playsinline="true"
              muted={incoming.item.muted ?? true}
              loop={false}
              preload="auto"
              controls={false}
              style={videoStyle}
              disablePictureInPicture
              disableRemotePlayback
            />
          )}
        </motion.div>
      )}

      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,.55), rgba(0,0,0,0) 32%, rgba(0,0,0,0) 68%, rgba(0,0,0,.7))",
        }}
      />
      <div
        onDoubleClick={() => onPlayingChange(true)}
        style={{ position: "absolute", inset: 0, background: "transparent" }}
      />
    </div>
  );
}
