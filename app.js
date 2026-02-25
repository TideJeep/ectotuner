// =============================
// ECTO-FUN THRUST REGULATOR
// Offline UI Logic – Full File
// =============================

// ---------- STATE ----------
let applied = { delay: 250, output: 85, ramp: 300, kill: 2.5 };
let pending = { ...applied };
let presets = { A: null, B: null, C: null };
let activePreset = null;

let currentState = "safe"; // "safe" | "pending" | "armed"

// DEMO MODE (independent of fan system)
let demoMode = false; // false = RACE, true = DEMO
let demo = {
  lights: false,   // OFF/ON
  siren: "OFF"     // "OFF" | "LOW" | "HIGH"
};

// ---------- ELEMENTS ----------
const delaySlider = document.getElementById("delaySlider");
const delayValue  = document.getElementById("delayValue");
const delayFill   = document.getElementById("delayFill");

const outputSlider = document.getElementById("outputSlider");
const rampSlider   = document.getElementById("rampSlider");
const killSlider   = document.getElementById("killSlider");

const outputValue = document.getElementById("outputValue");
const rampValue   = document.getElementById("rampValue");
const killValue   = document.getElementById("killValue");

const outputFill  = document.getElementById("outputFill");
const rampFill    = document.getElementById("rampFill");
const killFill    = document.getElementById("killFill");

const applyBtn = document.getElementById("applyBtn");
const saveBtn  = document.getElementById("saveBtn");
const stopBtn  = document.getElementById("stopBtn");

const statusText  = document.getElementById("statusText");
const presetLabel = document.getElementById("presetLabel");

const ledGrid = document.getElementById("ledGrid");

// DEMO MODE ELEMENTS
const demoModeBtn = document.getElementById("demoModeBtn");
const demoStrip   = document.getElementById("demoStrip");
const lightsBtn   = document.getElementById("lightsBtn");
const sirenSeg    = document.getElementById("sirenSeg");

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
    // "armed" uses default red styling (no class needed)
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

// ARMED pattern for 10 LEDs (1-10):
// 5-6, 4-7, 3-8, 2-9, 1-10 (loop)
function startArmedPulse() {
  clearLedTimer();
  setLedColorMode("armed");

  const leftCenter  = (LED_COUNT / 2) - 1; // 4 when LED_COUNT=10 (LED #5)
  const rightCenter = LED_COUNT / 2;       // 5 when LED_COUNT=10 (LED #6)

  let phase = 0;
  const maxPhase = leftCenter; // 4 for 10 LEDs

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
    statusText.textContent = "SYSTEM: SAFE";
    statusText.style.color = "#00ff66";
    startSafeSweep();
  } else if (state === "pending") {
    statusText.textContent = "SYSTEM: PENDING";
    statusText.style.color = "#ffae00";
    startPendingRipple();
  } else {
    statusText.textContent = "SYSTEM: ARMED";
    statusText.style.color = "#ff3333";
    startArmedPulse();
  }
}

// ---------- VU helpers ----------
function clamp01(x){ return Math.max(0, Math.min(1, x)); }

function setVU(fillEl, value, min, max){
  const pct = clamp01((value - min) / (max - min));
  fillEl.style.height = `${pct * 100}%`;
}

// ---------- UI SYNC ----------
function isDirty() {
  return JSON.stringify(pending) !== JSON.stringify(applied);
}

function refreshReadouts() {
  delayValue.textContent  = pending.delay;
  outputValue.textContent = pending.output;
  rampValue.textContent   = pending.ramp;
  killValue.textContent   = pending.kill.toFixed(1);

  setVU(delayFill,  pending.delay,  0, 3000);
  setVU(outputFill, pending.output, 0, 100);
  setVU(rampFill,   pending.ramp,   0, 2000);
  setVU(killFill,   pending.kill,   0, 10);

  const dirty = isDirty();
  applyBtn.disabled = !dirty;

  if (dirty) {
    if (currentState !== "armed") setStatus("pending");
  } else {
    // If we were showing pending, snap back to safe (don’t override ARMED)
    if (currentState === "pending") setStatus("safe");
  }
}

function loadPendingIntoUI() {
  delaySlider.value  = pending.delay;
  outputSlider.value = pending.output;
  rampSlider.value   = pending.ramp;
  killSlider.value   = pending.kill;
  refreshReadouts();
}

function clearPresetUI() {
  document.querySelectorAll(".preset").forEach(btn => btn.classList.remove("active"));
}

// ---------- SLIDER EVENTS ----------
function onSliderInput() {
  pending.delay  = parseInt(delaySlider.value, 10);
  pending.output = parseInt(outputSlider.value, 10);
  pending.ramp   = parseInt(rampSlider.value, 10);
  pending.kill   = parseFloat(killSlider.value);

  activePreset = null;
  presetLabel.textContent = "PRESET: NONE";
  clearPresetUI();

  refreshReadouts();
}

delaySlider.addEventListener("input", onSliderInput);
outputSlider.addEventListener("input", onSliderInput);
rampSlider.addEventListener("input", onSliderInput);
killSlider.addEventListener("input", onSliderInput);

// ---------- APPLY ----------
applyBtn.addEventListener("click", () => {
  applied = { ...pending };
  applyBtn.disabled = true;
  setStatus("armed");
});

// ---------- SAVE ----------
saveBtn.addEventListener("click", () => {
  const slot = (prompt("Save APPLIED settings to preset A, B, or C?") || "").trim().toUpperCase();
  if (!["A","B","C"].includes(slot)) return;

  presets[slot] = { ...applied };
  activePreset = slot;

  presetLabel.textContent = `PRESET: ${slot}`;
  clearPresetUI();
  document.querySelector(`.preset[data-slot="${slot}"]`)?.classList.add("active");
});

// ---------- LOAD PRESET (to PENDING) ----------
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

    loadPendingIntoUI(); // remains pending until APPLY
  });
});

// ---------- STOP ----------
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

// =============================
// DEMO MODE (RACE / DEMO)
// =============================

function sendDemoCommand(type, payload) {
  // Stub for later: BLE / serial / websocket to car
  console.log("[DEMO CMD]", type, payload);
}

function setSegActive(container, attr, value) {
  if (!container) return;
  container.querySelectorAll(".seg-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset[attr] === value);
  });
}

function refreshDemoUI() {
  if (demoStrip) demoStrip.hidden = !demoMode;

  if (demoModeBtn) {
    demoModeBtn.textContent = demoMode ? "MODE: DEMO" : "MODE: RACE";
    demoModeBtn.classList.toggle("demo", demoMode);
  }

  if (lightsBtn) {
    lightsBtn.textContent = `LIGHTS: ${demo.lights ? "ON" : "OFF"}`;
    lightsBtn.classList.toggle("on", demo.lights);
  }

  setSegActive(sirenSeg, "siren", demo.siren);
}

if (demoModeBtn) {
  demoModeBtn.addEventListener("click", () => {
    demoMode = !demoMode;

    if (!demoMode) {
      // Leaving DEMO → fail-safe shut off demo outputs
      demo.lights = false;
      demo.siren = "OFF";
      sendDemoCommand("demoMode", { enabled: false });
      sendDemoCommand("lights", { on: false });
      sendDemoCommand("siren", { state: "OFF" });
    } else {
      sendDemoCommand("demoMode", { enabled: true });
    }

    refreshDemoUI();
  });
}

if (lightsBtn) {
  lightsBtn.addEventListener("click", () => {
    if (!demoMode) return; // gated
    demo.lights = !demo.lights;
    refreshDemoUI();
    sendDemoCommand("lights", { on: demo.lights });
  });
}

if (sirenSeg) {
  sirenSeg.addEventListener("click", (e) => {
    if (!demoMode) return; // gated
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    const value = btn.dataset.siren;
    if (!value) return;

    demo.siren = value; // OFF | LOW | HIGH
    refreshDemoUI();
    sendDemoCommand("siren", { state: demo.siren });
  });
}

// ---------- INIT ----------
loadPendingIntoUI();
setStatus("safe");
refreshDemoUI();