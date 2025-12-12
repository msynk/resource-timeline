/* ---------- data ---------- */
const resources = Array.from({ length: 100 }, (_, i) => ({
  id: "r" + i,
  name: "Resource " + i
}));

const MS_PER_HOUR = 3600e3;
const rangeStart = Date.now();
const rangeEnd = rangeStart + 10 * 24 * MS_PER_HOUR;

const consumptions = [];

for (const r of resources) {
  let t = rangeStart + Math.random() * MS_PER_HOUR;

  while (t < rangeEnd - MS_PER_HOUR) {
    const dur = (0.5 + Math.random() * 2) * MS_PER_HOUR;
    const gap = (0.25 + Math.random() * 1) * MS_PER_HOUR;

    const start = t;
    const end = Math.min(start + dur, rangeEnd);

    consumptions.push({
      id: `${r.id}-${start}`,
      resourceId: r.id,
      start,
      end
    });

    t = end + gap;
  }
}

console.log("Total consumptions:", consumptions.length);

/* ---------- init ---------- */
const renderer = new Timeline({
  cornerCanvas: document.getElementById("corner"),
  xAxisCanvas: document.getElementById("xAxis"),
  yAxisCanvas: document.getElementById("yAxis"),
  timelineCanvas: document.getElementById("timeline"),
  scrollContainer: document.getElementById("viewport"),
  resources,
  consumptions,
  rangeStart,
  rangeEnd
});

/* ---------- hooks ---------- */
renderer.onSelect = id => console.log("select:", id);
renderer.onContextMenu = (id, x, y) =>
  console.log("context:", id, x, y);
renderer.onOpen = id => console.log("open modal:", id);
