# Red Slideshow App

A fullscreen, ultra-smooth slideshow application built with **React + Framer Motion**, designed for **kiosk, TV, tablet, and mobile displays**.  
The app supports **images and videos**, cinematic transitions, and a hidden settings panel for clean presentation.

---

## ✨ Key Features

### 🎞️ Media Playback
- Supports mixed playlists:
  - Images: png, jpg, jpeg, webp, avif
  - Videos: mp4, webm
- Images advance automatically after a configurable interval
- Videos always play to completion before advancing
- Seamless image → video switching with first-frame video preloading
- No visible loading state or fallback UI during transitions

---

### 🎬 Transition Effects
Available transition modes:
- Crossfade – clean, safe default
- Slide – horizontal motion
- Flip – 3D page-flip effect
- Zoom – cinematic push / pull zoom
- Pan – subtle horizontal movement


---

### 🖥️ Fullscreen & Responsive
- True fullscreen rendering (no margins, no scroll)
- Automatically adapts to portrait / landscape
- Works on mobile, tablet, TV, and kiosk screens
- Media uses object-fit: cover to avoid distortion

---

### ⚙️ Hidden Settings Panel
- Clean presentation screen with no visible UI
- Settings panel is opened by double click / double tap
- Settings include:
  - Play / Pause
  - Image interval
  - Transition mode

This ensures the slideshow remains distraction-free during playback.

---

### 🚀 Performance & Stability
- Preloads the next image or video before transition
- Videos are displayed only after the first decoded frame is ready
- Prevents black frames and default video play icons
- No unnecessary re-renders
- Stable on Android WebView (Capacitor)

---

## 🧱 Tech Stack
- React
- TypeScript
- Framer Motion
- Vite
- Capacitor

---

## 📂 Media Management

### Local (Current)
Place media files in:

src/assets/slides/

Supported formats:
png, jpg, jpeg, webp, avif, mp4, webm

Media files are automatically discovered and ordered by filename.

---

### Remote (Future-ready)
The app architecture allows easy migration to a remote source.

To switch to API-based media:
- Replace the local loader with an API call
- Server returns a list of media items in the following format:

[
  { "type": "image", "src": "https://example.com/a.jpg" },
  { "type": "video", "src": "https://example.com/b.mp4", "muted": true }
]

No changes are required in the slideshow engine.

---

## 🧪 Usage

Development:
yarn install  
yarn dev  

Build:
yarn build  

Android (Capacitor):
npx cap add android  
npx cap sync android  
npx cap open android  

---

## 🧠 Design Philosophy
- Media-first: content is the interface
- No clutter: controls are hidden unless invoked
- Cinematic motion without distraction

---


