import { useEffect, useState } from "react";

import { SettingsSheet, type TransitionMode } from "./components/setting-sheet";
import { Slideshow } from "./components/slide-show";

export type MediaItem =
  | { type: "image"; src: string }
  | { type: "video"; src: string; muted?: boolean; loop?: boolean };

const mediaModules = import.meta.glob(
  "./assets/slides/*.{png,jpg,jpeg,webp,avif,mp4,webm}",
  {
    eager: true,
    as: "url",
  },
) as Record<string, string>;

function sortByFilename(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function toItem(path: string, url: string): MediaItem {
  const p = path.toLowerCase();
  if (p.endsWith(".mp4") || p.endsWith(".webm"))
    return { type: "video", src: url, muted: true, loop: false };
  return { type: "image", src: url };
}

async function loadMediaItems(): Promise<MediaItem[]> {
  return Object.entries(mediaModules)
    .sort(([a], [b]) => sortByFilename(a, b))
    .map(([path, url]) => toItem(path, url));
}

export default function App() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [playing, setPlaying] = useState(true);
  const [intervalSec, setIntervalSec] = useState(3);
  const [transitionMode, setTransitionMode] =
    useState<TransitionMode>("crossfade");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [engineKey, setEngineKey] = useState(0);

  const bumpEngine = () => setEngineKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    loadMediaItems().then((list) => {
      if (cancelled) return;
      setItems(list);
      bumpEngine();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const openSettings = () => setSettingsOpen(true);

  return (
    <div
      className="fullbleed"
      onDoubleClick={openSettings}
      style={{ userSelect: "none" }}
    >
      <Slideshow
        key={engineKey}
        items={items}
        intervalSec={intervalSec}
        shuffle={false}
        kenBurns={true}
        playing={playing}
        onPlayingChange={setPlaying}
        shuffleSeed={0}
        transitionMode={transitionMode}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        playing={playing}
        onPlaying={setPlaying}
        intervalSec={intervalSec}
        onIntervalSec={(v) => {
          setIntervalSec(v);
          bumpEngine();
        }}
        transitionMode={transitionMode}
        onTransitionMode={setTransitionMode}
      />
    </div>
  );
}
