/* =====================================================================
   RUMANO’ · canvas rain
   Three depths of thin diagonal streaks: far (fine, faint, slow),
   middle, and near (longer, brighter, fast). Strength changes smoothly.
   You should not need to edit this file.
   ===================================================================== */
(function () {
  "use strict";

  // Rain strengths used by the chapters in stories.js
  var PRESETS = {
    none:    { density: 0,    speed: 1,    wind: 0.18 },
    opening: { density: 0.7,  speed: 1,    wind: 0.2  },
    steady:  { density: 1,    speed: 1,    wind: 0.2  },
    storm:   { density: 1.9,  speed: 1.3,  wind: 0.34 },
    thin:    { density: 0.32, speed: 0.8,  wind: 0.1  }
  };

  // Depth layers. count = streaks per 100,000 screen pixels at density 1.
  var LAYERS = [
    { count: 30, len: [7, 15],  width: 0.55, alpha: [0.05, 0.1],  speed: [480, 640]   },
    { count: 15, len: [14, 30], width: 0.85, alpha: [0.09, 0.16], speed: [760, 1000]  },
    { count: 5,  len: [26, 62], width: 1.2,  alpha: [0.13, 0.24], speed: [1150, 1500] }
  ];
  var MAX_DENSITY = 2;
  var BUCKETS = 3; // alpha steps per layer, so each layer is drawn in a few strokes

  function rand(a, b) { return a + Math.random() * (b - a); }

  function Rain(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.drops = [];
    this.cur = { density: 0, speed: 1, wind: 0.2 };
    this.target = { density: 0, speed: 1, wind: 0.2 };
    this.running = false;
    this.last = 0;
    this.tick = this.tick.bind(this);
    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    var self = this;
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) self.stop(); else self.wake();
    });
    this.resize();
  }

  Rain.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = window.innerWidth, h = window.innerHeight;
    if (w === this.w && Math.abs(h - this.h) < 120 && this.drops.length) return; // ignore mobile URL-bar jiggle
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.lineCap = "round";

    // Build the pool for the heaviest rain; lighter rain simply draws fewer.
    var area = (w * h) / 100000;
    this.drops = [];
    for (var l = 0; l < LAYERS.length; l++) {
      var L = LAYERS[l], n = Math.round(L.count * area * MAX_DENSITY);
      for (var i = 0; i < n; i++) {
        this.drops.push(this.spawn({ layer: l, rank: i / n }, true));
      }
    }
  };

  Rain.prototype.spawn = function (d, anywhere) {
    var L = LAYERS[d.layer];
    d.len = rand(L.len[0], L.len[1]);
    d.v = rand(L.speed[0], L.speed[1]);
    d.bucket = Math.floor(Math.random() * BUCKETS);
    d.x = rand(-this.w * 0.35, this.w * 1.05);
    d.y = anywhere ? rand(-this.h, this.h) : rand(-this.h * 0.3, -d.len);
    return d;
  };

  Rain.prototype.set = function (name, instant) {
    var p = PRESETS[name] || PRESETS.steady;
    this.target = { density: p.density, speed: p.speed, wind: p.wind };
    if (instant) this.cur = { density: p.density, speed: p.speed, wind: p.wind };
    this.wake();
  };

  Rain.prototype.wake = function () {
    if (this.reduced || this.running || document.hidden) return;
    if (this.target.density <= 0 && this.cur.density <= 0.01) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.tick);
  };

  Rain.prototype.stop = function () { this.running = false; };

  Rain.prototype.tick = function (now) {
    if (!this.running) return;
    var dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;

    // Ease toward the target strength over a couple of seconds
    var k = 1 - Math.pow(0.25, dt);
    var c = this.cur, t = this.target;
    c.density += (t.density - c.density) * k;
    c.speed += (t.speed - c.speed) * k;
    c.wind += (t.wind - c.wind) * k;

    var ctx = this.ctx, w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);

    var share = c.density / MAX_DENSITY;
    for (var l = 0; l < LAYERS.length; l++) {
      var L = LAYERS[l];
      ctx.lineWidth = L.width;
      for (var b = 0; b < BUCKETS; b++) {
        var a = L.alpha[0] + (L.alpha[1] - L.alpha[0]) * (b / (BUCKETS - 1));
        ctx.strokeStyle = "rgba(205,212,224," + a.toFixed(3) + ")";
        ctx.beginPath();
        for (var i = 0; i < this.drops.length; i++) {
          var d = this.drops[i];
          if (d.layer !== l || d.bucket !== b) continue;
          var vy = d.v * c.speed, vx = vy * c.wind;
          d.y += vy * dt; d.x += vx * dt;
          if (d.y - d.len > h || d.x > w + 60) this.spawn(d, false);
          if (d.rank > share) continue; // not part of the current rain strength
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.len * c.wind, d.y - d.len);
        }
        ctx.stroke();
      }
    }

    if (t.density <= 0 && c.density < 0.01) { ctx.clearRect(0, 0, w, h); this.running = false; return; }
    requestAnimationFrame(this.tick);
  };

  window.RumanoRain = Rain;
})();
