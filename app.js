let audioCtx;
let analyser;
let dataArray;
let source;
let running = false;

const canvas = document.getElementById("freqCanvas");
const ctx = canvas.getContext("2d");
const freqValueEl = document.getElementById("freq-value");
const freqMaxEl = document.getElementById("freq-max");
const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const btnFreeze = document.getElementById("btn-freeze");
const btnExport = document.getElementById("btn-export");

const FFT_SIZE = 2048;
let frozen = false;
let maxFreq = 0;
let samples = []; // {time, freq, frozenMax}

btnStart.addEventListener("click", async () => {
  if (running) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.8;

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
    // si no está congelado, actualizamos el máximo
    if (!frozen && freq > maxFreq) {
      maxFreq = freq;
    }
    freqMaxEl.textContent = maxFreq > 0 ? maxFreq.toFixed(1) + " Hz" : "-- Hz";

    samples.push({
      time: performance.now().toFixed(0),
      freq: freq,
      frozenMax: maxFreq || 0
    });
  }
}

function indexToFrequency(index, sampleRate, fftSize) {
  return (index * sampleRate) / fftSize;
}

function clearCanvas() {
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
