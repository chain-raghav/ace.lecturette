# ace.lecturette

**ace.lecturette** is a minimalist, single-purpose web application designed for Services Selection Board (SSB) lecturette practice. Inspired by focused, zero-clutter daily tools, it delivers an immediate, distraction-free environment for candidates to draw topics and practice their preparation and speaking phases under real test conditions.

---

## Features

- **No login, no setup**: Open and practice immediately.
- **SSB Timing Structure**:
  - **Preparation Phase (3:00)**: Time your prep or jump straight to speaking at any moment.
  - **Speaking Phase (3:00)**: Structured pacing cues for **Intro** (0:00–0:30), **Body** (0:30–2:30), and **Conclusion** (2:30–3:00).
  - **Audio Cue**: Synthesized single-bell alert via Web Audio API right at the 2:30 mark (30 seconds remaining).
- **Intelligent Topic Selection**:
  - Filter across 8 SSB categories or shuffle all topics.
  - Shuffle-bag algorithm prevents consecutive repeats and exhausts category pools evenly.
  - Preserves selected category across sessions via local storage.
- **Accurate & Battery Friendly**:
  - `Date.now()` delta-based timers maintain precision even if backgrounded or throttled.
  - Screen Wake Lock integration keeps the phone screen awake during active lecturette sessions.
- **Military-Inspired Design**:
  - Muted olive, khaki, and brass palette with automatic dark mode support (`prefers-color-scheme`).
  - Large tabular numerals visible from arm's length.

---

## Running Locally

Because **ace.lecturette** is built entirely with vanilla HTML, CSS, and JavaScript, it requires **no build step, no Node.js, and no web server**:

1. Clone or download this directory.
2. Double-click `index.html` or open it directly in any modern browser (Chrome, Safari, Firefox, Edge).

---

## Updating Topics

All topics are stored in `topics.js` as an array on `window.TOPICS`:

```javascript
window.TOPICS = [
  {
    "id": 1,
    "topic": "Modernisation of Indian Armed Forces",
    "category": "Defence & National Security",
    "frequency": "Frequently Asked"
  },
  ...
];
```

To add, edit, or remove topics:
1. Open `topics.js` in any text editor.
2. Add new objects with unique `id`, `topic` (string), `category` (string), and `frequency` (optional string).
3. Any new category added to `topics.js` will automatically populate in the category selector on the home screen.
4. Save the file and refresh `index.html`.

---

## Deployment Guide

### Option 1: GitHub Pages (Recommended)

1. Create a new repository on GitHub named `ace-lecturette`.
2. Push the project files (`index.html`, `style.css`, `script.js`, `topics.js`, `README.md`) to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial release of ace.lecturette"
   git branch -M main
   git remote add origin https://github.com/<your-username>/ace-lecturette.git
   git push -u origin main
   ```
3. In your GitHub repository:
   - Go to **Settings** > **Pages** (under the "Code and automation" section).
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   - Under **Branch**, select `main` and `/ (root)`, then click **Save**.
4. In a few minutes, your site will be live at `https://<your-username>.github.io/ace-lecturette/`.

### Option 2: Netlify (Drag and Drop)

1. Log into your [Netlify](https://app.netlify.com/) account.
2. Navigate to the **Sites** tab.
3. Drag and drop the `ace.lecturette` folder directly into the upload area marked **"Want to deploy a new site without connecting to Git? Drag and drop your site folder here"**.
4. Netlify will deploy your site instantly and provide a live URL.
