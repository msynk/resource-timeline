(function () {
    class Timeline {
  constructor({
    cornerCanvas,
    xAxisCanvas,
    yAxisCanvas,
    timelineCanvas,
    scrollContainer,
    resources,
    consumptions,
    rangeStart,
    rangeEnd,
    config = {}
  }) {
    this.resources = resources;
    this.consumptions = consumptions;
    this.rangeStart = rangeStart;
    this.rangeEnd = rangeEnd;
    this.scrollContainer = scrollContainer;

    this.config = Object.assign({
      rowHeight: 40,
      barVPad: 16,
      hourWidth: 80,
      axisHeight: 50,
      axisWidth: 220,
      font: "12px system-ui, sans-serif"
    }, config);

    this.resourceIndex = new Map(
      resources.map((r, i) => [r.id, i])
    );

    this.rects = [];
    this.selectedId = null;

    this._setupCanvases(
      cornerCanvas,
      xAxisCanvas,
      yAxisCanvas,
      timelineCanvas
    );

    this._updateViewport();
    this._bindEvents();
    this.renderAll();
  }

  /* ---------- setup ---------- */

  _setupCanvases(corner, xAxis, yAxis, timeline) {
    this.corner = corner;
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.timeline = timeline;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    this.dpr = dpr;

    const hours =
      Math.ceil((this.rangeEnd - this.rangeStart) / 3600e3);

    this.timelineW = hours * this.config.hourWidth;
    this.timelineH = this.resources.length * this.config.rowHeight;

    this.cornerCtx = this._initCanvas(
      corner,
      this.config.axisWidth,
      this.config.axisHeight
    );

    this.xAxisCtx = this._initCanvas(
      xAxis,
      this.timelineW,
      this.config.axisHeight
    );

    this.yAxisCtx = this._initCanvas(
      yAxis,
      this.config.axisWidth,
      this.timelineH
    );

    this.timelineCtx = this._initCanvas(
      timeline,
      this.timelineW,
      this.timelineH
    );
  }

  _initCanvas(canvas, cssW, cssH) {
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.floor(cssW * this.dpr);
    canvas.height = Math.floor(cssH * this.dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.font = this.config.font;
    return ctx;
  }

  /* ---------- viewport ---------- */

  _updateViewport() {
    const sc = this.scrollContainer;

    this.viewLeft = Math.max(0, sc.scrollLeft - this.config.axisWidth);
    this.viewTop = Math.max(0, sc.scrollTop - this.config.axisHeight);
    this.viewWidth = sc.clientWidth;
    this.viewHeight = sc.clientHeight;
  }

  _getVisibleRowRange() {
    const { rowHeight } = this.config;
    return {
      start: Math.floor(this.viewTop / rowHeight),
      end: Math.ceil((this.viewTop + this.viewHeight) / rowHeight)
    };
  }

  _getVisibleTimeRange() {
    const total = this.rangeEnd - this.rangeStart;
    return {
      start: this.rangeStart + (this.viewLeft / this.timelineW) * total,
      end:
        this.rangeStart +
        ((this.viewLeft + this.viewWidth) / this.timelineW) * total
    };
  }

  timeToX(t) {
    return (
      (t - this.rangeStart) /
      (this.rangeEnd - this.rangeStart)
    ) * this.timelineW;
  }

  /* ---------- rendering ---------- */

  renderAll() {
    this._drawCorner();
    this._drawXAxis();
    this._drawYAxis();
    this._drawTimeline();
  }

  _drawCorner() {
    const ctx = this.cornerCtx;
    ctx.clearRect(0, 0, this.config.axisWidth, this.config.axisHeight);
    ctx.textBaseline = "middle";
    ctx.fillText("Resources / Time", 10, this.config.axisHeight / 2);
  }

  _drawXAxis() {
    const ctx = this.xAxisCtx;
    const hours =
      Math.ceil((this.rangeEnd - this.rangeStart) / 3600e3);

    ctx.clearRect(0, 0, this.timelineW, this.config.axisHeight);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= hours; i++) {
      const x = i * this.config.hourWidth;
      const d = new Date(this.rangeStart + i * 3600e3);
      ctx.fillText(
        String(d.getHours()).padStart(2, "0") + ":00",
        x + this.config.hourWidth / 2,
        this.config.axisHeight / 2
      );
    }
  }

  _drawYAxis() {
    const ctx = this.yAxisCtx;
    ctx.clearRect(0, 0, this.config.axisWidth, this.timelineH);
    ctx.textBaseline = "middle";

    this.resources.forEach((r, i) => {
      ctx.fillText(
        r.name,
        10,
        i * this.config.rowHeight + this.config.rowHeight / 2
      );
    });
  }

  _drawTimeline() {
    this._updateViewport();

    const rows = this._getVisibleRowRange();
    const time = this._getVisibleTimeRange();

    const ctx = this.timelineCtx;
    ctx.clearRect(0, 0, this.timelineW, this.timelineH);
    this.rects.length = 0;

    for (const c of this.consumptions) {
      const row = this.resourceIndex.get(c.resourceId);
      if (row == null) continue;
      if (row < rows.start || row > rows.end) continue;
      if (c.end <= time.start || c.start >= time.end) continue;

      const x = this.timeToX(Math.max(c.start, this.rangeStart));
      const w = Math.max(
        4,
        this.timeToX(Math.min(c.end, this.rangeEnd)) - x
      );

      const y =
        row * this.config.rowHeight + this.config.barVPad;
      const h =
        this.config.rowHeight - this.config.barVPad * 2;

      ctx.fillStyle =
        c.id === this.selectedId ? "#4f46e5" : "#60a5fa";
      ctx.fillRect(x, y, w, h);

      this.rects.push({ id: c.id, x, y, w, h });
    }
  }

  /* ---------- events ---------- */

  _bindEvents() {
    this.scrollContainer.addEventListener("scroll", () =>
      this._drawTimeline()
    );

    this.timeline.addEventListener("mousedown", e => {
      const r = this.timeline.getBoundingClientRect();
      const id = this._hitTest(
        e.clientX - r.left,
        e.clientY - r.top
      );
      if (!id) return;

      if (e.button === 0) {
        this.selectedId = id;
        this._drawTimeline();
        this.onSelect?.(id);
      }

      if (e.button === 2) {
        e.preventDefault();
        this.onContextMenu?.(id, e.clientX, e.clientY);
      }
    });

    this.timeline.addEventListener("dblclick", e => {
      const r = this.timeline.getBoundingClientRect();
      const id = this._hitTest(
        e.clientX - r.left,
        e.clientY - r.top
      );
      if (id) this.onOpen?.(id);
    });

    this.timeline.addEventListener(
      "contextmenu",
      e => e.preventDefault()
    );
  }

  _hitTest(x, y) {
    for (let i = this.rects.length - 1; i >= 0; i--) {
      const r = this.rects[i];
      if (
        x >= r.x &&
        x <= r.x + r.w &&
        y >= r.y &&
        y <= r.y + r.h
      ) return r.id;
    }
    return null;
  }
}


    window.Timeline = Timeline;
}());