export type MediaItem = {
  type: "image" | "video";
  src: string;
  muted?: boolean;
};

export const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function nextIndex(i: number, len: number) {
  return len <= 0 ? 0 : (i + 1) % len;
}

export function keyOf(item: MediaItem) {
  return `${item.type}:${item.src}`;
}

export function prefetchMedia(item: MediaItem) {
  if (!item) return;
  if (item.type === "image") {
    const img = new Image();
    img.src = item.src;
  } else {
    fetch(item.src, { method: "HEAD" }).catch(() => {});
  }
}

export async function waitVideoReady(el: HTMLVideoElement, timeoutMs: number) {
  await new Promise<void>((resolve) => {
    let done = false;

    const cleanup = () => {
      el.removeEventListener("loadeddata", onReady);
      el.removeEventListener("canplay", onReady);
      el.removeEventListener("error", onReady);
    };

    const onReady = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };

    const t = setTimeout(() => onReady(), timeoutMs);

    el.addEventListener("loadeddata", onReady, { once: true });
    el.addEventListener("canplay", onReady, { once: true });
    el.addEventListener("error", onReady, { once: true });

    const r = () => {
      clearTimeout(t);
      onReady();
    };

    if (el.readyState >= 2) r();
  });
}
