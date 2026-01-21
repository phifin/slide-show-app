import { AnimatePresence, motion } from "framer-motion";

export type TransitionMode = "crossfade" | "slide" | "flip" | "zoom" | "pan";

type Props = {
  open: boolean;
  onClose: () => void;
  playing: boolean;
  onPlaying: (v: boolean) => void;
  intervalSec: number;
  onIntervalSec: (v: number) => void;
  transitionMode: TransitionMode;
  onTransitionMode: (v: TransitionMode) => void;
};

export function SettingsSheet({
  open,
  onClose,
  playing,
  onPlaying,
  intervalSec,
  onIntervalSec,
  transitionMode,
  onTransitionMode,
}: Props) {
  const btnStyle = (active: boolean) =>
    ({
      flex: 1,
      borderColor: active ? "rgba(185,28,28,.7)" : undefined,
    }) as const;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.5)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="sheet"
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              padding: 16,
              paddingBottom: 18,
            }}
            initial={{ y: 420 }}
            animate={{ y: 0 }}
            exit={{ y: 420 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 5,
                  borderRadius: 999,
                  background: "rgba(255,255,255,.18)",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div className="pill">Settings</div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                <button className="btn" onClick={() => onPlaying(!playing)}>
                  {playing ? "Pause" : "Play"}
                </button>
                <button className="btn" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,.12)",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontWeight: 600 }}>Image interval</div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>
                  {intervalSec.toFixed(1)}s
                </div>
              </div>

              <input
                className="slider"
                type="range"
                min={0.5}
                max={10}
                step={0.5}
                value={intervalSec}
                onChange={(e) => onIntervalSec(Number(e.target.value))}
                style={{ marginTop: 10 }}
              />
            </div>

            <div style={{ height: 10 }} />

            <div
              style={{
                padding: 12,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,.12)",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontWeight: 600 }}>Transition</div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>
                  {transitionMode}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  className="btn"
                  onClick={() => onTransitionMode("crossfade")}
                  style={btnStyle(transitionMode === "crossfade")}
                >
                  Fade
                </button>
                <button
                  className="btn"
                  onClick={() => onTransitionMode("slide")}
                  style={btnStyle(transitionMode === "slide")}
                >
                  Slide
                </button>
                <button
                  className="btn"
                  onClick={() => onTransitionMode("flip")}
                  style={btnStyle(transitionMode === "flip")}
                >
                  Flip
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  className="btn"
                  onClick={() => onTransitionMode("zoom")}
                  style={btnStyle(transitionMode === "zoom")}
                >
                  Zoom
                </button>
                <button
                  className="btn"
                  onClick={() => onTransitionMode("pan")}
                  style={btnStyle(transitionMode === "pan")}
                >
                  Pan
                </button>
                <div style={{ flex: 1 }} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
