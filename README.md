# ace.lecturette
 
**ace.lecturette** is a minimalist, single-purpose web application designed for Services Selection Board (SSB) lecturette practice. It delivers an immediate, distraction-free environment for candidates to draw topics and practice their preparation and speaking phases under real test conditions.
 
**Live demo:** `https://<your-username>.github.io/ace-lecturette/`
 
---
 
## Features
 
- **No login, no setup**: Open and practice immediately.
- **SSB Timing Structure**:
  - **Preparation Phase (3:00)**: Time your prep or jump straight to speaking at any moment.
  - **Speaking Phase (3:00)**: Structured pacing cues for **Intro** (0:00–0:30), **Body** (0:30–2:30), and **Conclusion** (2:30–3:00).
  - **Audio Cue**: Synthesized single-bell alert via Web Audio API right at the 2:30 mark (30 seconds remaining).
- **Intelligent Topic Selection**:
  - 297 topics across 8 SSB categories, or shuffle all topics.
  - Shuffle-bag algorithm prevents consecutive repeats and exhausts category pools evenly.
  - Preserves selected category across sessions via local storage.
- **Accurate & Battery Friendly**:
  - `Date.now()` delta-based timers maintain precision even if backgrounded or throttled.
  - Screen Wake Lock integration keeps the phone screen awake during active lecturette sessions.
- **Ember Slate Design**:
  - Dark slate background with an ember-orange accent.
  - Large tabular numerals visible from arm's length.
  - Mobile-first layout with a progress bar and colour-coded stage cues.
---
 
## Project Structure
 
```
index.html   page markup
style.css    theme and layout
script.js    timers, shuffle logic, audio, wake lock
topics.js    topic list (window.TOPICS)
README.md
```
 
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
 
## Tech
 
Vanilla JavaScript, Web Audio API, Screen Wake Lock API, localStorage.
 
