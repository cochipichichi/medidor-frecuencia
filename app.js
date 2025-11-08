let audioCtx;
let analyser;
let dataArray;
let source;
let running = false;

const canvas = document.getElementById("freqCanvas");
const ctx = canvas.getContext("2d");
const freqValueEl = document.getElementById("freq-value");
const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");

const FFT_SIZE = 2048;

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
  freqValueEl.textContent = "-- Hz";
  clearCanvas();
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
  }
}

function indexToFrequency(index, sampleRate, fftSize) {
  return (index * sampleRate) / fftSize;
}

function clearCanvas() {
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
