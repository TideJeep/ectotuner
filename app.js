// =============================
// ACME XR-40 ROCKET SLED CONTROL
// Offline UI Logic – Full File
// =============================

// ---------- STATE ----------
let applied = { wait: 250, ramp: 300, output: 85, time: 2.5 };
let pending = { ...applied };
let presets = { A: null, B: null, C: null };
let activePreset = null;

let currentState = "safe"; // "safe" | "pending" | "armed"

// ---------- ELEMENTS ----------
const waitSlider   = document.getElementById("waitSlider");
const rampSlider   = document.getElementById("rampSlider");
const outputSlider = document.getElementById("outputSlider");
const timeSlider   = document.getElementById("timeSlider");

const waitValue   = document.getElementById("waitValue");
const rampValue   = document.getElementById("rampValue");
const outputValue = document.getElementById("outputValue");
const timeValue   = document.getElementById("timeValue");

const waitFill   = document.getElementById("waitFill");
const rampFill   = document.getElementById("rampFill");
const outputFill = document.getElementById("outputFill");
const timeFill   = document.getElementById("timeFill");

const applyBtn = document.getElementById("applyBtn");
const saveBtn  = document.getElementById("saveBtn");
const stopBtn  = document.getElementById("stopBtn");

const statusText  = document.getElementById("statusText");
const presetLabel = document.getElementById("presetLabel");
const ledGrid     = document.getElementById("ledGrid");

// ---------- LED BUILD ----------
const LED_COUNT = 10;
const leds = [];
for (let i = 0; i < LED_COUNT; i++) {
  const led = document.createElement("div");
  led.className = "led";
  ledGrid.appendChild(led);
  leds.push(led);
}

// ---------- LED ANIMATION ----------
let ledTimer = null;

function clearLedTimer() {
  if (ledTimer) {
    clearInterval(ledTimer);
    ledTimer = null;
  }
}

function setAllLEDs(on) {
  leds.forEach(led => led.classList.toggle("active", !!on));
}

function setLedColorMode(mode) {
  leds.forEach(led => {
    led.classList.remove("safe", "pending");
    if (mode === "safe") led.classList.add("safe");
    if (mode === "pending") led.classList.add("pending");
  });
}

function startSafeSweep() {
  clearLedTimer();
  setLedColorMode("safe");
  let i = 0;
  ledTimer = setInterval(() => {
    leds.forEach((led, idx) => led.classList.toggle("active", idx === i));
    i = (i + 1) % LED_COUNT;
  }, 120);
}

function startPendingRipple() {
  clearLedTimer();
  setLedColorMode("pending");
  let i = 0;
  ledTimer = setInterval(() => {
    const a = i;
    const b = (i + 1) % LED_COUNT;
    const c = (i + 2) % LED_COUNT;
    leds.forEach((led, idx) =>
      led.classList.toggle("active", idx === a || idx === b || idx === c)
    );
    i = (i + 1) % LED_COUNT;
  }, 85);
}

function startArmedPulse() {
  clearLedTimer();
  setLedColorMode("armed");

  const leftCenter  = (LED_COUNT / 2) - 1;
  const rightCenter = LED_COUNT / 2;

  let phase = 0;
  const maxPhase = leftCenter;

  ledTimer = setInterval(() => {
    const left  = leftCenter - phase;
    const right = rightCenter + phase;

    leds.forEach((led, idx) => {
      led.classList.toggle("active", idx === left || idx === right);
    });

    phase = (phase + 1) % (maxPhase + 1);
  }, 140);
}

function flashStopThenSafe() {
  clearLedTimer();
  setAllLEDs(true);
  setTimeout(() => {
    setAllLEDs(false);
    setTimeout(() => startSafeSweep(), 120);
  }, 250);
}

// ---------- STATUS ----------
function setStatus(state) {
  currentState = state;
  document.body.dataset.state = state;

  if (state === "safe") {
    statusText.textContent = "STATUS: SAFE";
    statusText.style.color = "#39d353";
    startSafeSweep();
  } else if (state === "pending") {
    statusText.textContent = "STATUS: PENDING";
    statusText.style.color = "#ffb300";
    startPendingRipple();
  } else {
    statusText.textContent = "STATUS: ARMED";
    statusText.style.color = "#ff4d4d";
    startArmedPulse();
  }
}

// ---------- VU HELPERS ----------
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function setVU(fillEl, value, min, max) {
  const pct = clamp01((value - min) / (max - min));
  fillEl.style.width = `${pct * 100}%`;
}

// ---------- UI SYNC ----------
function isDirty() {
  return JSON.stringify(pending) !== JSON.stringify(applied);
}

function refreshReadouts() {
  waitValue.textContent   = pending.wait;
  rampValue.textContent   = pending.ramp;
  outputValue.textContent = pending.output;
  timeValue.textContent   = pending.time.toFixed(1);

  setVU(waitFill,   pending.wait,   0, 3000);
  setVU(rampFill,   pending.ramp,   0, 2000);
  setVU(outputFill, pending.output, 0, 100);
  setVU(timeFill,   pending.time,   0, 10);

  const dirty = isDirty();
  applyBtn.disabled = !dirty;

  if (dirty) {
    if (currentState !== "armed") setStatus("pending");
  } else {
    if (currentState === "pending") setStatus("safe");
  }
}

function loadPendingIntoUI() {
  waitSlider.value   = pending.wait;
  rampSlider.value   = pending.ramp;
  outputSlider.value = pending.output;
  timeSlider.value   = pending.time;
  refreshReadouts();
}

function clearPresetUI() {
  document.querySelectorAll(".preset").forEach(btn => btn.classList.remove("active"));
}

// ---------- SLIDER EVENTS ----------
function onSliderInput() {
  pending.wait   = parseInt(waitSlider.value, 10);
  pending.ramp   = parseInt(rampSlider.value, 10);
  pending.output = parseInt(outputSlider.value, 10);
  pending.time   = parseFloat(timeSlider.value);

  activePreset = null;
  presetLabel.textContent = "PRESET: NONE";
  clearPresetUI();

  refreshReadouts();
}

waitSlider.addEventListener("input", onSliderInput);
rampSlider.addEventListener("input", onSliderInput);
outputSlider.addEventListener("input", onSliderInput);
timeSlider.addEventListener("input", onSliderInput);

// ---------- APPLY ----------
applyBtn.addEventListener("click", () => {
  applied = { ...pending };
  applyBtn.disabled = true;
  setStatus("armed");
});

// ---------- SAVE ----------
saveBtn.addEventListener("click", () => {
  const slot = (prompt("Store APPLIED settings to preset A, B, or C?") || "").trim().toUpperCase();
  if (!["A", "B", "C"].includes(slot)) return;

  presets[slot] = { ...applied };
  activePreset = slot;

  presetLabel.textContent = `PRESET: ${slot}`;
  clearPresetUI();
  document.querySelector(`.preset[data-slot="${slot}"]`)?.classList.add("active");
});

// ---------- LOAD PRESET ----------
document.querySelectorAll(".preset").forEach(button => {
  button.addEventListener("click", () => {
    const slot = button.dataset.slot;
    if (!presets[slot]) {
      alert("Preset empty.");
      return;
    }

    pending = { ...presets[slot] };
    activePreset = slot;
    presetLabel.textContent = `PRESET: ${slot}`;

    clearPresetUI();
    button.classList.add("active");

    loadPendingIntoUI();
  });
});

// ---------- ABORT ----------
stopBtn.addEventListener("click", () => {
  applied.output = 0;
  pending = { ...applied };

  activePreset = null;
  presetLabel.textContent = "PRESET: NONE";
  clearPresetUI();

  loadPendingIntoUI();
  applyBtn.disabled = true;

  setStatus("safe");
  flashStopThenSafe();
});

// ---------- INIT ----------
loadPendingIntoUI();
setStatus("safe");
