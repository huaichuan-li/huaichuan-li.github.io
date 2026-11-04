/* SIGNAL DEEP · 深海 ASCII 生物引擎
   移植自 OCEAN 01 的 npc-ocean（世界坐标版），针对个人站简化：
   - 无弹窗锁滚动 / 无 snap 回调，直接用 window.scrollY
   - 分段绑定本站版块：越往下潜，物种越深、色调越暗
   - body 背景随滚动在三个深度色之间插值，右侧深度计同步读数
*/
(function () {
  "use strict";

  var host = document.querySelector(".sea-bg");
  if (!host || !window.OCEAN_GLYPHS) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  var ctx = canvas.getContext("2d", { alpha: true });

  var W = 0, H = 0, dpr = 1;
  var sprites = {};
  var npcs = [];
  var segs = [];
  var colX = 0, colW = 1040;
  var raf = 0, lastTime = 0, pending = false, resizeTimer = 0;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smoothstep(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function isMobile() { return W < 760; }
  function scrollY() { return window.scrollY || window.pageYOffset || 0; }

  /* ---------- 分段：绑定版块，越深物种越异 ---------- */
  var SEGMENTS = [
    {
      id: "surf", from: null, to: "#about",
      keys: ["school", "fish", "manta", "turtle"], weight: 1,
      sizeBase: 0.95, min: 5, max: 40, tone: "bright"
    },
    {
      id: "meso", from: "#about", to: "#research",
      keys: ["lantern", "squid", "siphon", "jelly2"], weight: 1,
      sizeBase: 1, min: 4, max: 30, tone: "mid"
    },
    {
      id: "bathy", from: "#research", to: "#venture",
      keys: ["angler", "dumbo", "giant"], weight: 1.05,
      sizeBase: 1.08, min: 4, max: 26, tone: "mid"
    },
    {
      id: "hadal", from: "#venture", to: "#honors",
      keys: ["snailfish", "isopod", "shrimp"], weight: 1.05,
      sizeBase: 0.95, min: 4, max: 22, tone: "dim"
    },
    {
      id: "base", from: "#honors", to: null,
      keys: ["shrimp"], weight: 0.7,
      sizeBase: 0.72, min: 3, max: 10, tone: "dim", sink: true
    }
  ];

  function docTop(el) {
    var r = el.getBoundingClientRect();
    return r.top + scrollY();
  }

  function measureSegs() {
    segs = [];
    var docH = document.documentElement.scrollHeight;
    for (var i = 0; i < SEGMENTS.length; i++) {
      var d = SEGMENTS[i];
      var fromEl = d.from ? document.querySelector(d.from) : null;
      if (d.from && !fromEl) continue;
      var toEl = d.to ? document.querySelector(d.to) : null;
      if (d.to && !toEl) continue;
      var top = fromEl ? docTop(fromEl) : 0;
      var bot = toEl ? docTop(toEl) : docH;
      if (!(bot - top > 60)) continue;
      segs.push({
        id: d.id, top: top, bot: bot, len: bot - top,
        keys: d.keys, weight: d.weight, sizeBase: d.sizeBase,
        min: d.min, max: d.max, tone: d.tone,
        drift: 1, sink: !!d.sink
      });
    }

    // 兜底：页面没有可识别的版块锚点（如 life.html）时，整页用一条混合带
    if (!segs.length) {
      segs.push({
        id: "mix", top: 0, bot: docH, len: docH,
        keys: ["school", "fish", "lantern", "jelly2", "squid", "turtle", "manta", "siphon"],
        weight: 1, sizeBase: 0.95, min: 8, max: 60,
        tone: "mid", drift: 1, sink: false
      });
    }

    var c = document.querySelector("main .container") || document.querySelector(".container");
    if (c) {
      var cr = c.getBoundingClientRect();
      colX = cr.left; colW = cr.width;
    } else {
      colW = Math.min(W, 1040); colX = (W - colW) / 2;
    }
  }

  /* ---------- 预渲染精灵 ---------- */
  /* 浅蓝底上用深蓝字符，越深的水层越淡 */
  var TONES = { bright: "#1B6BA8", mid: "#3D87BC", dim: "#7FAFD2" };

  function sprite(key, tone) {
    var sk = key + "|" + tone;
    if (sprites[sk]) return sprites[sk];

    var cols = isMobile() ? 26 : 40;
    var g = window.OCEAN_GLYPHS.build(key, cols);
    if (!g) return null;

    var cell = isMobile() ? 5.2 : 6.2;
    var cw = g.cols * cell;
    var ch = g.rows * cell * 1.7;

    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(cw * dpr));
    c.height = Math.max(1, Math.round(ch * dpr));
    var x = c.getContext("2d");
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.font = cell + "px ui-monospace, SFMono-Regular, Menlo, monospace";
    x.textBaseline = "top";
    x.fillStyle = TONES[tone] || TONES.mid;

    var glyph = { 1: "+", 2: "#", 3: ":" };
    var alpha = { 1: 0.65, 2: 1, 3: 0.5 };

    for (var r = 0; r < g.rows; r++) {
      for (var col = 0; col < g.cols; col++) {
        var kind = g.grid[r * g.cols + col];
        if (!kind) continue;
        x.globalAlpha = alpha[kind] || 0.5;
        x.fillText(glyph[kind], col * cell, r * cell * 1.7);
      }
    }
    sprites[sk] = { c: c, w: cw, h: ch };
    return sprites[sk];
  }

  /* ---------- 群落 ---------- */
  function spawnOne(seg, i, n, off) {
    var key = seg.keys[(i + off) % seg.keys.length];
    var sp = sprite(key, seg.tone);
    if (!sp) return;

    var scale = seg.sizeBase * (0.62 + Math.random() * 0.34);
    var dir = Math.random() < 0.5 ? 1 : -1;
    var t = (i + 0.15 + Math.random() * 0.7) / n;
    var w = sp.w * scale;
    var h = sp.h * scale;
    var bob = seg.sink ? 0 : 3 + Math.random() * 9;
    var pad = h + bob + 10;
    var usable = Math.max(24, seg.len - pad * 2);

    npcs.push({
      seg: seg.id, segTop: seg.top, segBot: seg.bot,
      key: key, t: t, pad: pad,
      worldY: seg.top + pad + t * usable,
      sp: sp, w: w, h: h,
      x: (((i * 0.6180339887) + Math.random() * 0.18) % 1) * W - w * 0.5,
      dir: dir,
      vx: (9 + Math.random() * 20) * dir,
      vy: seg.sink ? 3 + Math.random() * 5 : 0,
      bob: bob,
      phase: Math.random() * Math.PI * 2,
      peak: (isMobile() ? 0.42 : 0.52) + Math.random() * (isMobile() ? 0.18 : 0.26)
    });
  }

  function buildWorld() {
    npcs = [];
    var perScreen = isMobile() ? 6 : (W < 1100 ? 9 : 11);
    var stepPx = Math.max(90, H / perScreen);
    for (var s = 0; s < segs.length; s++) {
      var seg = segs[s];
      var n = clamp(Math.round(seg.len / stepPx * seg.weight), seg.min, seg.max);
      var off = (Math.random() * seg.keys.length) | 0;
      for (var i = 0; i < n; i++) spawnOne(seg, i, n, off);
    }
  }

  function remap() {
    var byId = {};
    for (var i = 0; i < segs.length; i++) byId[segs[i].id] = segs[i];
    var kept = [];
    for (var k = 0; k < npcs.length; k++) {
      var n = npcs[k];
      var seg = byId[n.seg];
      if (!seg) continue;
      n.segTop = seg.top; n.segBot = seg.bot;
      var usable = Math.max(24, seg.len - n.pad * 2);
      n.worldY = seg.top + n.pad + n.t * usable;
      kept.push(n);
    }
    npcs = kept;
  }

  /* ---------- 尺寸 ---------- */
  function setCanvas(w, h, d) {
    W = Math.max(1, Math.round(w));
    H = Math.max(1, Math.round(h));
    dpr = d;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- 背景随深度变暗 + 深度计 ---------- */
  /* 浅蓝三档：海面 → 中层 → 深水，越往下略深但始终保持明亮 */
  var BG_STOPS = [[234, 244, 251], [224, 240, 250], [206, 231, 246]];
  var depthVal = document.getElementById("depthVal");

  function lerp(a, b, t) { return a + (b - a) * t; }

  function updateAmbience() {
    var docH = document.documentElement.scrollHeight - H;
    var frac = docH > 0 ? clamp(scrollY() / docH, 0, 1) : 0;
    var t = frac * (BG_STOPS.length - 1);
    var i = Math.min(BG_STOPS.length - 2, Math.floor(t));
    var f = t - i;
    var a = BG_STOPS[i], b = BG_STOPS[i + 1];
    document.body.style.backgroundColor =
      "rgb(" + Math.round(lerp(a[0], b[0], f)) + "," +
      Math.round(lerp(a[1], b[1], f)) + "," +
      Math.round(lerp(a[2], b[2], f)) + ")";
    if (depthVal) depthVal.textContent = Math.round(frac * 3800) + " m";
  }

  /* ---------- 绘制 ---------- */
  var TOP_PAD = 62, BOT_PAD = 80, SIDE_PAD = 70;

  function blit(sp, x, y, alpha, n) {
    if (alpha <= 0.004) return;
    ctx.globalAlpha = alpha;
    if (n.dir < 0) {
      ctx.save();
      ctx.translate(x + n.w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(sp.c, 0, 0, n.w, n.h);
      ctx.restore();
    } else {
      ctx.drawImage(sp.c, x, y, n.w, n.h);
    }
  }

  function paint(dt, now) {
    var viewY = scrollY();
    var t = now / 1000;
    var colBase = isMobile() ? 0.34 : 0.38;
    var colL = colX, colR = colX + colW;

    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < npcs.length; i++) {
      var n = npcs[i];

      if (dt > 0) {
        n.x += n.vx * dt;
        if (n.vy) {
          n.worldY += n.vy * dt;
          if (n.worldY > n.segBot - n.pad) n.worldY = n.segTop + n.pad;
        }
      }
      if (n.x > W + n.w) n.x -= (W + 2 * n.w);
      else if (n.x < -n.w) n.x += (W + 2 * n.w);

      var bob = n.bob && dt > 0 ? Math.sin(t * 0.55 + n.phase) * n.bob : 0;
      var sy = Math.round(n.worldY + bob - viewY);
      if (sy > H + 24 || sy + n.h < -24) continue;

      var sx = Math.round(n.x);
      var cx = sx + n.w / 2;
      var edge = Math.min(cx - colL, colR - cx);
      var inside = smoothstep(-80, 30, edge);

      var a = n.peak;
      a *= 1 - inside * (1 - colBase);
      a *= smoothstep(0, TOP_PAD, sy);
      a *= smoothstep(0, BOT_PAD, H - sy - n.h);
      a *= smoothstep(0, SIDE_PAD, sx);
      a *= smoothstep(0, SIDE_PAD, W - sx - n.w);

      if (a <= 0.004) continue;
      blit(n.sp, sx, sy, a, n);
    }
    ctx.globalAlpha = 1;

    updateAmbience();
  }

  /* ---------- 主循环 ---------- */
  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (document.hidden) return;
    var dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
    lastTime = now;
    paint(dt, now);
  }

  function paintOnce() {
    pending = false;
    paint(0, performance.now());
  }

  /* ---------- 重排 ---------- */
  function relayout() {
    measureSegs();
    if (!npcs.length) buildWorld();
    else remap();
    paintOnce();
  }

  function onResize() {
    var nw = host.clientWidth || window.innerWidth;
    var nh = Math.max(host.clientHeight || 0, window.innerHeight);
    var nd = Math.min(window.devicePixelRatio || 1, 1.5);
    var docH = document.documentElement.scrollHeight;
    var widthChanged = Math.abs(nw - W) > 8 || nd !== dpr;

    setCanvas(nw, nh, nd);
    if (widthChanged) {
      sprites = {};
      measureSegs();
      buildWorld();
      onResize._docH = docH;
      lastTime = 0;
    } else if (Math.abs(docH - (onResize._docH || 0)) > docH * 0.03) {
      onResize._docH = docH;
      relayout();
    } else if (reduce) {
      paintOnce();
    }
  }

  /* ---------- 启动 ---------- */
  setCanvas(
    host.clientWidth || window.innerWidth,
    Math.max(host.clientHeight || 0, window.innerHeight),
    Math.min(window.devicePixelRatio || 1, 1.5)
  );
  onResize._docH = document.documentElement.scrollHeight;
  measureSegs();
  buildWorld();
  paint(0, performance.now());

  if (reduce) {
    window.addEventListener("scroll", function () {
      if (!pending) { pending = true; requestAnimationFrame(paintOnce); }
    }, { passive: true });
  } else {
    raf = requestAnimationFrame(tick);
  }

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 200);
  });

  /* 图片 / 字体加载完、或语言切换导致排版高度变化后，重算分段坐标 */
  window.addEventListener("load", function () { relayout(); });
  window.SEA_RELAYOUT = relayout;
})();
