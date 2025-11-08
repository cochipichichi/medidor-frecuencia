let audioCtx;
let analyser;
let dataArray;
let source;
let running = false;

const canvas = document.getElementById("freqCanvas");
const ctx = canvas.getContext("2d");
const freqValueEl = document.getElementById("freq-value");
const freqMaxEl = document.getElementById("freq-max");
const liveFreqEl = document.getElementById("live-freq");
const liveMaxEl = document.getElementById("live-max");
const liveSamplesEl = document.getElementById("live-samples");
const historyBody = document.getElementById("history-body");

const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const btnFreeze = document.getElementById("btn-freeze");
const btnExport = document.getElementById("btn-export");
const btnSetTarget = document.getElementById("btn-set-target");
const targetInput = document.getElementById("targetFreq");
const btnMode = document.getElementById("btn-mode");

const btnHome = document.getElementById("btn-home");
const btnVoz = document.getElementById("btn-voz");
const btnTheme = document.getElementById("btn-theme");
const btnPlus = document.getElementById("btn-plus");
const btnMinus = document.getElementById("btn-minus");
const btnLang = document.getElementById("btn-lang");
const btnFocus = document.getElementById("btn-focus");
const btnSearch = document.getElementById("btn-search");
const searchOverlay = document.getElementById("search-overlay");
const searchClose = document.getElementById("search-close");

const sensButtons = document.querySelectorAll(".sens-btn");

const FFT_SIZE = 2048;
let smoothing = 0.8;
let frozen = false;
let maxFreq = 0;
let samples = []; // {time, freq, frozenMax}
let targetFreq = 440;
let currentLang = "es";
let modeDocente = false;

btnStart.addEventListener("click", async () => {
  if (running) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = smoothing;

    source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    running = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    btnFreeze.disabled = false;
    btnExport.disabled = false;

    draw();
  } catch (err) {
    console.error("No se pudo acceder al micrófono", err);
    alert("No se pudo acceder al micrófono. Revisa los permisos.");
  }
});

btnStop.addEventListener("click", () => {
  if (!running) return;
  running = false;
  btnStart.disabled = false;
  btnStop.disabled = true;
  btnFreeze.disabled = true;
  freqValueEl.textContent = "-- Hz";
  clearCanvas();
});

btnFreeze.addEventListener("click", () => {
  frozen = !frozen;
  btnFreeze.textContent = frozen ? "🧊 Descongelar" : "🧊 Congelar máx.";
});

btnExport.addEventListener("click", () => {
  if (samples.length === 0) {
    alert("No hay datos para exportar.");
    return;
  }
  const csvContent = ["timestamp_ms,frecuencia_hz,frecuencia_max_congelada_hz"].concat(
    samples.map(s => `${s.time},${s.freq.toFixed(2)},${s.frozenMax.toFixed(2)}`)
  ).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date();
  const filename = `frecuencias_${now.toISOString().replace(/[:.]/g, "-")}.csv`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

btnSetTarget.addEventListener("click", () => {
  const val = parseFloat(targetInput.value);
  if (!isNaN(val) && val > 0) {
    targetFreq = val;
  }
});

sensButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    sensButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const level = btn.dataset.level;
    if (analyser) {
      if (level === "soft") smoothing = 0.93;
      else if (level === "fast") smoothing = 0.3;
      else smoothing = 0.8;
      analyser.smoothingTimeConstant = smoothing;
    } else {
      if (level === "soft") smoothing = 0.93;
      else if (level === "fast") smoothing = 0.3;
      else smoothing = 0.8;
    }
  });
});

btnMode.addEventListener("click", () => {
  modeDocente = !modeDocente;
  document.getElementById("lab-panel").style.display = modeDocente ? "none" : "grid";
  document.getElementById("history-card").style.display = modeDocente ? "none" : "block";
  btnMode.textContent = modeDocente ? "🧑‍🎓 Modo estudiante" : "👨‍🏫 Modo docente";
});

// controles arriba
btnHome.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

btnTheme.addEventListener("click", () => {
  document.body.classList.toggle("theme-light");
});

btnPlus.addEventListener("click", () => {
  const current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--font-base"));
  const next = Math.min(current + 1, 22);
  document.documentElement.style.setProperty("--font-base", next + "px");
});

btnMinus.addEventListener("click", () => {
  const current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--font-base"));
  const next = Math.max(current - 1, 12);
  document.documentElement.style.setProperty("--font-base", next + "px");
});

btnFocus.addEventListener("click", () => {
  document.body.classList.toggle("focus-mode");
});

btnSearch.addEventListener("click", () => {
  searchOverlay.classList.add("show");
});

if (searchClose) {
  searchClose.addEventListener("click", () => searchOverlay.classList.remove("show"));
  searchOverlay.addEventListener("click", (e) => {
    if (e.target === searchOverlay) searchOverlay.classList.remove("show");
  });
}

btnLang.addEventListener("click", () => {
  currentLang = currentLang === "es" ? "en" : "es";
  applyLang();
});

function applyLang() {
  const dict = {
    es: {
      title: "📡 Medidor de frecuencia de sonido",
      subtitle: "Versión con laboratorio, historial, sensibilidad y CSV.",
      start: "🎙️ Iniciar medición",
      stop: "⏹️ Detener"
    },
    en: {
      title: "📡 Sound Frequency Meter",
      subtitle: "Version with lab, history, sensitivity and CSV.",
      start: "🎙️ Start measuring",
      stop: "⏹️ Stop"
    }
  };
  const t = dict[currentLang];
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (t[key]) el.textContent = t[key];
  });
}

btnVoz.addEventListener("click", () => {
  const text = `La frecuencia actual es ${freqValueEl.textContent}`;
  if ("speechSynthesis" in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = currentLang === "es" ? "es-ES" : "en-US";
    window.speechSynthesis.speak(utter);
  } else {
    alert(text);
  }
});

function draw() {
  if (!running) return;

  requestAnimationFrame(draw);

  analyser.getByteFrequencyData(dataArray);

  clearCanvas();

  const width = canvas.width;
  const height = canvas.height;
  const barWidth = (width / dataArray.length) * 2.5;

  let x = 0;
  let maxVal = -1;
  let maxIndex = -1;

  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i];
    const barHeight = (v / 255) * height;
    ctx.fillStyle = "rgba(56,189,248,0.9)";
    ctx.fillRect(x, height - barHeight, barWidth, barHeight);

    if (v > maxVal) {
      maxVal = v;
      maxIndex = i;
    }

    x += barWidth + 1;
  }

  const freq = indexToFrequency(maxIndex, audioCtx.sampleRate, analyser.fftSize);

  if (!isNaN(freq) && freq > 0) {
    freqValueEl.textContent = freq.toFixed(1) + " Hz";
    liveFreqEl.textContent = freq.toFixed(1) + " Hz";

    if (!frozen && freq > maxFreq) {
      maxFreq = freq;
    }
    freqMaxEl.textContent = maxFreq > 0 ? maxFreq.toFixed(1) + " Hz" : "-- Hz";
    liveMaxEl.textContent = maxFreq > 0 ? maxFreq.toFixed(1) + " Hz" : "-- Hz";

    const sample = {
      time: performance.now().toFixed(0),
      freq: freq,
      frozenMax: maxFreq || 0
    };
    samples.push(sample);
    liveSamplesEl.textContent = samples.length;
    updateHistory();
  }

  // dibujar línea de frecuencia objetivo
  if (targetFreq && audioCtx) {
    const binWidth = audioCtx.sampleRate / analyser.fftSize;
    const targetIndex = targetFreq / binWidth;
    const xPos = targetIndex * (barWidth + 1);
    ctx.strokeStyle = "rgba(255, 99, 132, 0.9)";
    ctx.beginPath();
    ctx.moveTo(xPos, 0);
    ctx.lineTo(xPos, height);
    ctx.stroke();
  }
}

function updateHistory() {
  const last = samples.slice(-10).reverse();
  historyBody.innerHTML = last.map((s, idx) => `<tr>
    <td>${idx + 1}</td>
    <td>${s.time}</td>
    <td>${s.freq.toFixed(1)}</td>
    <td>${s.frozenMax.toFixed(1)}</td>
  </tr>`).join("");
}

function indexToFrequency(index, sampleRate, fftSize) {
  return (index * sampleRate) / fftSize;
}

function clearCanvas() {
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
