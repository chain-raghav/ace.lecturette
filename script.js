/**
 * ace.lecturette
 * SSB Lecturette practice - minimal, single-purpose, accurate timing.
 */

(function () {
  'use strict';

  // --- State ---
  let currentTopic = null;
  let lastTopicId = null;
  let activeCategory = 'all';
  let shuffleBags = {}; // category -> array of unused topics

  // Timer state
  let timerInterval = null;
  let timerEndTime = null;
  let prepRunning = false;
  let bellFired = false;
  let wakeLockSentinel = null;

  // Web Audio Context
  let audioCtx = null;
  let noiseBuf = null;

  // --- DOM Elements ---
  const screenHome = document.getElementById('screen-home');
  const screenPrep = document.getElementById('screen-prep');
  const screenSpeaking = document.getElementById('screen-speaking');

  const categorySelect = document.getElementById('category-select');
  const homeTopicDisplay = document.getElementById('home-topic-display');
  const drawLabel = document.getElementById('draw-label');
  const btnShuffle = document.getElementById('btn-shuffle');
  const btnStart = document.getElementById('btn-start');

  const prepTopicDisplay = document.getElementById('prep-topic-display');
  const prepTimer = document.getElementById('prep-timer');
  const prepBar = document.getElementById('prep-bar');
  const prepHint = document.getElementById('prep-hint');
  const btnStartPrep = document.getElementById('btn-start-prep');
  const btnSkipPrep = document.getElementById('btn-skip-prep');
  const btnEndPrep = document.getElementById('btn-end-prep');

  const speakingTopicDisplay = document.getElementById('speaking-topic-display');
  const speakingTimer = document.getElementById('speaking-timer');
  const speakBar = document.getElementById('speak-bar');
  const speakingStageBadge = document.getElementById('speaking-stage-badge');
  const speakingRunningControls = document.getElementById('speaking-running-controls');
  const speakingEndedView = document.getElementById('speaking-ended-view');
  const btnEndSpeaking = document.getElementById('btn-end-speaking');
  const btnShuffleAnother = document.getElementById('btn-shuffle-another');

  const PREP_HINT = 'Take up to 3 minutes, or start speaking straight away.';
  const setProgress = (bar, frac) => bar.style.setProperty('--p', Math.min(1, Math.max(0, frac)));
  const setClock = (el, text) => { el.innerHTML = text.replace(':', '<span class="colon">:</span>'); };

  // --- Safe LocalStorage ---
  const STORAGE_KEY = 'ace_lecturette_category';

  function getStoredCategory() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function setStoredCategory(cat) {
    try {
      localStorage.setItem(STORAGE_KEY, cat);
    } catch {
      // Ignore if localStorage is restricted
    }
  }

  // --- Screen Wake Lock ---
  async function requestWakeLock() {
    if ('wakeLock' in navigator && !wakeLockSentinel) {
      try {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => { wakeLockSentinel = null; });
      } catch {
        // WakeLock may fail if battery saver is on or document not visible
      }
    }
  }

  function releaseWakeLock() {
    if (wakeLockSentinel) {
      try {
        wakeLockSentinel.release();
      } catch {
        // Ignore errors on release
      }
      wakeLockSentinel = null;
    }
  }

  // --- Web Audio Synthesizer ---
  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  /**
   * Synthesizes a clean, crisp mechanical keyboard click (less thocky, more elegant & subtle)
   */
  function playKey(deep) {
    if (!audioCtx) return;
    try {
      const t = audioCtx.currentTime + 0.002;
      const v = 0.96 + Math.random() * 0.08; // Subtle pitch variation

      // 1. Light body tone (higher fundamental, less sub-bass rumble)
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();
      const f0 = (deep ? 240 : 360) * v;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + (deep ? 0.05 : 0.035));

      oscGain.gain.setValueAtTime(0.0001, t);
      oscGain.gain.exponentialRampToValueAtTime(deep ? 0.28 : 0.18, t + 0.002);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, t + (deep ? 0.07 : 0.04));

      osc.connect(oscGain);
      oscGain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + (deep ? 0.08 : 0.05));

      // 2. Crisp, rounded keycap tap transient
      if (!noiseBuf) {
        const len = Math.floor(audioCtx.sampleRate * 0.04);
        noiseBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let j = 0; j < len; j++) data[j] = Math.random() * 2 - 1;
      }
      const noiseSrc = audioCtx.createBufferSource();
      noiseSrc.buffer = noiseBuf;

      const bandpass = audioCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime((deep ? 1600 : 2100) * v, t);
      bandpass.Q.setValueAtTime(1.4, t);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, t);
      noiseGain.gain.exponentialRampToValueAtTime(deep ? 0.19 : 0.13, t + 0.001);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + (deep ? 0.024 : 0.016));

      noiseSrc.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);

      noiseSrc.start(t);
      noiseSrc.stop(t + 0.03);
    } catch {
      // Audio is an enhancement; fail gracefully
    }
  }

  // Bell tone (ting sound)
  function playBellTing() {
    try {
      initAudioContext();
      if (!audioCtx) return;

      const now = audioCtx.currentTime + 0.002;

      // Primary tone (fundamental)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1174.66, now); // D6 clear ting
      gain1.gain.setValueAtTime(0.32, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);

      // Secondary overtone partial
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(2349.32, now); // D7 overtone
      gain2.gain.setValueAtTime(0.16, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.15);
      osc2.stop(now + 0.75);
    } catch {
      // Ignore audio failure
    }
  }

  // --- Shuffle Bag Logic ---
  function getTopicsForCategory(cat) {
    const all = window.TOPICS || [];
    if (!cat || cat === 'all') return all.slice();
    return all.filter(t => t.category === cat);
  }

  function drawTopic() {
    let bag = shuffleBags[activeCategory];
    if (!bag || bag.length === 0) {
      bag = getTopicsForCategory(activeCategory);
      // Fisher-Yates shuffle
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      shuffleBags[activeCategory] = bag;
    }

    // Ensure we don't repeat the exact same topic back to back if more than 1 topic exists
    if (bag.length > 1 && bag[bag.length - 1].id === lastTopicId) {
      const swapIndex = Math.floor(Math.random() * (bag.length - 1));
      [bag[bag.length - 1], bag[swapIndex]] = [bag[swapIndex], bag[bag.length - 1]];
    }

    const chosen = bag.pop();
    currentTopic = chosen;
    lastTopicId = chosen ? chosen.id : null;
    return chosen;
  }

  // --- UI Screen Switching ---
  function showScreen(screen) {
    stopAnyTimer();
    [screenHome, screenPrep, screenSpeaking].forEach(s => {
      s.classList.remove('screen-active');
      s.hidden = true;
    });
    screen.hidden = false;
    screen.classList.add('screen-active');

    if (screen === screenHome) {
      releaseWakeLock();
    } else {
      requestWakeLock();
    }
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function stopAnyTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerEndTime = null;
    prepRunning = false;
  }

  // --- Home Screen Operations ---
  function setupCategorySelector() {
    const topics = window.TOPICS || [];
    const categories = [];

    topics.forEach(t => {
      if (t.category && !categories.includes(t.category)) {
        categories.push(t.category);
      }
    });

    categories.sort((a, b) => a.localeCompare(b));

    // Clear existing dynamic options (keep "All categories")
    categorySelect.innerHTML = '<option value="all">All categories</option>';

    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });

    // Restore category from localStorage
    const saved = getStoredCategory();
    if (saved && (saved === 'all' || categories.includes(saved))) {
      activeCategory = saved;
      categorySelect.value = saved;
    } else {
      activeCategory = 'all';
      categorySelect.value = 'all';
    }

    categorySelect.addEventListener('change', () => {
      activeCategory = categorySelect.value;
      setStoredCategory(activeCategory);
      // Changing category clears current topic
      currentTopic = null;
      homeTopicDisplay.textContent = 'Press shuffle to draw a topic';
      homeTopicDisplay.classList.add('placeholder');
      homeTopicDisplay.classList.remove('long', 'xlong', 'drawn', 'reel', 'drawing');
      drawLabel.textContent = '';
      btnStart.disabled = true;
      delete shuffleBags[activeCategory];
    });
  }

  // --- Slot-Machine Text Shuffle Draw ---
  let drawing = false;

  function setDrawingUI(on) {
    drawing = on;
    drawLabel.textContent = on ? 'Drawing\u2026' : '';
    btnShuffle.textContent = on ? 'Drawing\u2026' : 'Shuffle';
    btnShuffle.classList.toggle('is-drawing', on);
    homeTopicDisplay.classList.toggle('drawing', on);
    homeTopicDisplay.setAttribute('aria-busy', on ? 'true' : 'false');
    btnShuffle.disabled = on;
    categorySelect.disabled = on;
    if (on) btnStart.disabled = true;
  }

  function restartClass(el, name) {
    el.classList.remove(name);
    void el.offsetWidth; // Force reflow to re-trigger CSS keyframe
    el.classList.add(name);
  }

  function handleShuffleClick() {
    if (drawing) return;
    initAudioContext();
    const topic = drawTopic();
    if (!topic) return;

    const pool = getTopicsForCategory(activeCategory);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Extended duration: 38 steps (~3.2 seconds total duration, ~2 seconds longer)
    const STEPS = (reduce || pool.length < 2) ? 1 : 38;
    let i = 0;
    let shown = homeTopicDisplay.textContent;

    setDrawingUI(true);
    homeTopicDisplay.classList.remove('placeholder');
    // Adapt font size smoothly so long topics stay in one line
    homeTopicDisplay.classList.toggle('long', topic.topic.length >= 30 && topic.topic.length < 46);
    homeTopicDisplay.classList.toggle('xlong', topic.topic.length >= 46);

    (function step() {
      const last = i === STEPS - 1;
      let text = topic.topic;
      if (!last) {
        do {
          text = pool[Math.floor(Math.random() * pool.length)].topic;
        } while (text === shown);
      }
      shown = text;
      homeTopicDisplay.textContent = text;
      playKey(last);

      if (last) {
        setDrawingUI(false);
        homeTopicDisplay.classList.remove('reel');
        restartClass(homeTopicDisplay, 'drawn');
        btnStart.disabled = false;
        return;
      }

      restartClass(homeTopicDisplay, 'reel');
      i++;
      // Extended mechanical reel curve: rapid beginning (~35ms) to a smooth prolonged deceleration (~250ms)
      const delay = 35 + 215 * Math.pow(i / (STEPS - 1), 2.4);
      setTimeout(step, delay);
    })();
  }

  // --- Prep Phase (3 minutes) ---
  function goToPrepScreen() {
    if (!currentTopic) return;
    initAudioContext();
    showScreen(screenPrep);

    prepTopicDisplay.textContent = currentTopic.topic;
    setClock(prepTimer, '3:00');
    btnStartPrep.hidden = false;
    btnStartPrep.disabled = false;
    btnStartPrep.textContent = 'Start prep';
    prepRunning = false;
    screenPrep.classList.remove('is-over');
    btnSkipPrep.classList.remove('attn');
    prepHint.textContent = PREP_HINT;
    setProgress(prepBar, 0);
  }

  function startPrepCountdown() {
    initAudioContext();
    if (prepRunning) return;
    prepRunning = true;
    btnStartPrep.disabled = true;

    const DURATION_MS = 3 * 60 * 1000;
    timerEndTime = Date.now() + DURATION_MS;

    function tick() {
      const remainingMs = Math.max(0, timerEndTime - Date.now());
      const remainingSecs = Math.ceil(remainingMs / 1000);
      setClock(prepTimer, formatTime(remainingSecs));
      setProgress(prepBar, 1 - remainingMs / DURATION_MS);

      if (remainingMs <= 0) {
        stopAnyTimer();
        setClock(prepTimer, '0:00');
        screenPrep.classList.add('is-over');
        prepHint.textContent = 'Prep time is over. Start speaking when you are ready.';
        btnSkipPrep.classList.add('attn');
      }
    }

    tick();
    timerInterval = setInterval(tick, 250);
  }

  // --- Speaking Phase (3 minutes) ---
  function goToSpeakingScreen() {
    if (!currentTopic) return;
    initAudioContext();
    stopAnyTimer();
    showScreen(screenSpeaking);

    speakingTopicDisplay.textContent = currentTopic.topic;
    setClock(speakingTimer, '3:00');
    speakingRunningControls.hidden = false;
    speakingEndedView.hidden = true;
    screenSpeaking.classList.remove('is-done');
    setProgress(speakBar, 0);
    bellFired = false;

    let currentStage = '';

    function updateStageBadge(stageName) {
      if (currentStage !== stageName) {
        currentStage = stageName;
        speakingStageBadge.textContent = stageName;
        speakingStageBadge.className = `stage-badge stage-${stageName.toLowerCase()}`;

        speakingStageBadge.classList.remove('animate-pop');
        void speakingStageBadge.offsetWidth;
        speakingStageBadge.classList.add('animate-pop');
      }
    }

    const DURATION_MS = 3 * 60 * 1000;
    timerEndTime = Date.now() + DURATION_MS;

    function tick() {
      const remainingMs = Math.max(0, timerEndTime - Date.now());
      const remainingSecs = Math.ceil(remainingMs / 1000);
      setClock(speakingTimer, formatTime(remainingSecs));
      const elapsed = (DURATION_MS - remainingMs) / 1000;
      setProgress(speakBar, elapsed / 180);

      // Stages:
      // 3:00 to 2:30 (remainingSecs > 150): Intro
      // 2:30 to 0:30 (remainingSecs <= 150 and > 30): Content
      // 0:30 to 0:00 (remainingSecs <= 30): Conclusion
      if (remainingSecs > 150) {
        updateStageBadge('Intro');
      } else if (remainingSecs > 30) {
        updateStageBadge('Content');
      } else {
        updateStageBadge('Conclusion');
        // Single bell ting at 2:30 elapsed (30s remaining)
        if (!bellFired) {
          bellFired = true;
          playBellTing();
        }
      }

      if (remainingMs <= 0) {
        stopAnyTimer();
        setClock(speakingTimer, '0:00');
        speakingRunningControls.hidden = true;
        speakingEndedView.hidden = false;
        screenSpeaking.classList.add('is-done');
        releaseWakeLock();

        // Ting sound twice after time is finished
        playBellTing();
        setTimeout(playBellTing, 380);
      }
    }

    tick();
    timerInterval = setInterval(tick, 250);
  }

  // --- Event Bindings ---
  btnShuffle.addEventListener('click', handleShuffleClick);
  btnStart.addEventListener('click', goToPrepScreen);

  btnStartPrep.addEventListener('click', startPrepCountdown);
  btnSkipPrep.addEventListener('click', goToSpeakingScreen);
  btnEndPrep.addEventListener('click', () => showScreen(screenHome));

  btnEndSpeaking.addEventListener('click', () => showScreen(screenHome));

  btnShuffleAnother.addEventListener('click', () => {
    showScreen(screenHome);
    handleShuffleClick();
  });

  // Re-acquire wake lock if page becomes visible again while in prep/speaking
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (screenPrep.classList.contains('screen-active') || screenSpeaking.classList.contains('screen-active')) {
        requestWakeLock();
      }
    }
  });

  // --- Initialization ---
  setupCategorySelector();
})();
