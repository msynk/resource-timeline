(() => {
/* ================= CONFIG ================= */
const ROW_HEIGHT  = 40;
const BAR_VPAD    = 16;
const HOUR_WIDTH  = 80;
const AXIS_HEIGHT = 50;
const AXIS_WIDTH  = 220;
const FONT = "12px system-ui, sans-serif";

/* ================= DATA ================= */
const resources = Array.from({ length: 50 }, (_, i) => ({
  id: "r" + i,
  name: "Resource " + i
}));

const rangeStart = Date.now();
const rangeEnd   = rangeStart + 24 * 3600e3;

const consumptions = [];
const MS_PER_HOUR = 3600e3;

for (const r of resources) {
  let t = rangeStart + Math.random() * 2 * MS_PER_HOUR;

  while (t < rangeEnd - MS_PER_HOUR) {
    const duration = (1 + Math.random() * 3) * MS_PER_HOUR;
    const gap = (0.5 + Math.random() * 2) * MS_PER_HOUR;

    const start = t;
    const end = Math.min(start + duration, rangeEnd);

    consumptions.push({
      id: `${r.id}-${start}`,
      resourceId: r.id,
      start,
      end
    });

    t = end + gap;
  }
}

/* ================= DERIVED ================= */
const totalHours = Math.ceil((rangeEnd - rangeStart) / MS_PER_HOUR);
const timelineW = totalHours * HOUR_WIDTH;
const timelineH = resources.length * ROW_HEIGHT;

const resourceIndex = new Map(resources.map((r, i) => [r.id, i]));

/* ================= CANVAS SETUP ================= */
const dpr = Math.max(1, window.devicePixelRatio || 1);

function setupCanvas(canvas, cssW, cssH) {
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = FONT;
  return ctx;
}

const corner   = document.getElementById("corner");
const xAxis    = document.getElementById("xAxis");
const yAxis    = document.getElementById("yAxis");
const timeline = document.getElementById("timeline");

const cornerCtx = setupCanvas(corner, AXIS_WIDTH, AXIS_HEIGHT);
const xAxisCtx  = setupCanvas(xAxis, timelineW, AXIS_HEIGHT);
const yAxisCtx  = setupCanvas(yAxis, AXIS_WIDTH, timelineH);
const tlCtx     = setupCanvas(timeline, timelineW, timelineH);

/* ================= UTILS ================= */
const timeToX = t =>
  ((t - rangeStart) / (rangeEnd - rangeStart)) * timelineW;

/* ================= HIT TEST ================= */
const rects = [];

function hitTest(x, y) {
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
      return r.id;
  }
  return null;
}

/* ================= RENDER ================= */
let selectedId = null;

function drawCorner() {
  cornerCtx.clearRect(0, 0, AXIS_WIDTH, AXIS_HEIGHT);
  cornerCtx.textBaseline = "middle";
  cornerCtx.fillText("Resources / Time", 10, AXIS_HEIGHT / 2);
}

function drawXAxis() {
  xAxisCtx.clearRect(0, 0, timelineW, AXIS_HEIGHT);
  xAxisCtx.textAlign = "center";
  xAxisCtx.textBaseline = "middle";

  for (let i = 0; i <= totalHours; i++) {
    const x = i * HOUR_WIDTH;
    const d = new Date(rangeStart + i * MS_PER_HOUR);
    const label = String(d.getHours()).padStart(2, "0") + ":00";
    xAxisCtx.fillText(label, x + HOUR_WIDTH / 2, AXIS_HEIGHT / 2);
  }
}

function drawYAxis() {
  yAxisCtx.clearRect(0, 0, AXIS_WIDTH, timelineH);
  yAxisCtx.textBaseline = "middle";

  resources.forEach((r, i) => {
    yAxisCtx.fillText(r.name, 10, i * ROW_HEIGHT + ROW_HEIGHT / 2);
  });
}

function drawTimeline() {
  tlCtx.clearRect(0, 0, timelineW, timelineH);
  rects.length = 0;

  tlCtx.strokeStyle = "rgba(0,0,0,0.05)";
  for (let i = 0; i <= resources.length; i++) {
    const y = i * ROW_HEIGHT + 0.5;
    tlCtx.beginPath();
    tlCtx.moveTo(0, y);
    tlCtx.lineTo(timelineW, y);
    tlCtx.stroke();
  }

  for (const c of consumptions) {
    const row = resourceIndex.get(c.resourceId);
    if (row == null) continue;

    const s = Math.max(c.start, rangeStart);
    const e = Math.min(c.end, rangeEnd);
    if (e <= s) continue;

    const x = timeToX(s);
    const w = Math.max(4, timeToX(e) - x);
    const y = row * ROW_HEIGHT + BAR_VPAD;
    const h = ROW_HEIGHT - BAR_VPAD * 2;

    tlCtx.fillStyle = c.id === selectedId ? "#4f46e5" : "#60a5fa";
    tlCtx.fillRect(x, y, w, h);

    rects.push({ id: c.id, x, y, w, h });
  }
}

function renderAll() {
  drawCorner();
  drawXAxis();
  drawYAxis();
  drawTimeline();
}

/* ================= EVENTS ================= */
function canvasPoint(e) {
  const r = timeline.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

timeline.addEventListener("mousedown", e => {
  const { x, y } = canvasPoint(e);
  const id = hitTest(x, y);
  if (!id) return;

  if (e.button === 0) {
    selectedId = id;
    drawTimeline();
    console.log("select:", id);
  }

  if (e.button === 2) {
    e.preventDefault();
    console.log("context menu:", id);
  }
});

timeline.addEventListener("dblclick", e => {
  const { x, y } = canvasPoint(e);
  const id = hitTest(x, y);
  if (id) console.log("open modal:", id);
});

timeline.addEventListener("contextmenu", e => e.preventDefault());

/* ================= INIT ================= */
renderAll();

})();
