/* ABYSSAL CONSTELLATION · 星图阵列引擎
   在 .sea-bg 最底层铺一层旋转的螺旋星轨：
   - 5 条旋臂 + 背景尘埃，内圈快、外圈慢的差速旋转
   - 每条星轨是一段沿切向的细短线，带独立呼吸明暗
   - 中心留白、内容栏降透明度、屏幕边缘淡出，保证正文可读
   - 随滚动缓慢上移/放大，越深星光越远；鼠标轻微视差
   - 浅海（浅蓝）与深空（夜蓝）两套配色，由 body.abyss 切换
   与 sea.js 的 ASCII 生物层叠加：生物像游在星云里。
*/
(function () {
  "use strict";

  var host = document.querySelector(".sea-bg");
  if (!host) return;

  var canvas = document.createElement("canvas");
  canvas.className = "cosmos-canvas";
  canvas.setAttribute("aria-hidden", "true");
  host.insertBefore(canvas, host.firstChild);
  var ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var PALETTES = {
    day: ["#1B6BA8", "#2C7DBF", "#7FAFD2", "#3E9E9A", "#D97B2E"],
    night: ["#E2F1FC", "#94C9EE", "#5B9BD5", "#6FD9C0", "#E8A45C"]
  };
  var WEIGHTS = [0.24, 0.52, 0.78, 0.90, 1.01];
  var LEVELS = 5;
  var ARMS = 5;

  var W = 0, H = 0, dpr = 1;
  var stars = [];
  var maxR = 1, rMin = 1;
  var colX = 0, colW = 1040;
  var px = 0, py = 0, tpx = 0, tpy = 0;
  var raf = 0, last = 0, resizeTimer = 0, pending = false;
  var countEl = document.getElementById("starCount");

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function smoothstep(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function isMobile() { return W < 760; }
  function isAbyss() { return document.body.classList.contains("abyss"); }
  function scrollY() { return window.scrollY || window.pageYOffset || 0; }

  function pickColor(r) {
    for (var i = 0; i < WEIGHTS.length; i++) if (r < WEIGHTS[i]) return i;
    return WEIGHTS.length - 1;
  }

  function buildStars() {
    var n = Math.round(clamp(W * H / 1250,
      isMobile() ? 240 : 460,
      isMobile() ? 520 : 1120));
    maxR = Math.sqrt(W * W + H * H) * 0.60;
    rMin = Math.min(W, H) * 0.135;
    stars = [];
    for (var i = 0; i < n; i++) {
      var dust = Math.random() < 0.26;
      var t = Math.sqrt(Math.random());
      var ang, r;
      if (dust) {
        ang = Math.random() * Math.PI * 2;
        r = rMin + (maxR - rMin) * t;
      } else {
        ang = (i % ARMS) * Math.PI * 2 / ARMS
            + t * 3.5 + (Math.random() - 0.5) * 0.36;
        r = rMin + (maxR - rMin) * t;
      }
      stars.push({
        ang: ang, r: r, t: t,
        spin: (0.018 + 0.10 / Math.pow(0.35 + t * 1.6, 0.9)) * 0.42,
        len: 2.2 + Math.random() * 5.2 + t * 2.4,
        tilt: (Math.random() - 0.5) * 0.72,
        ci: pickColor(Math.random()),
        phase: Math.random() * Math.PI * 2,
        tw: 0.45 + Math.random() * 1.25,
        glyph: Math.random() < 0.045
      });
    }
    if (countEl) countEl.textContent = stars.length.toLocaleString("en-US");
  }

  function measureColumn() {
    var c = document.querySelector("main .container") || document.querySelector(".container");
    if (c) {
      var r = c.getBoundingClientRect();
      colX = r.left; colW = r.width;
    } else {
      colW = Math.min(W, 1040); colX = (W - colW) / 2;
    }
  }

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

  function paint(now, dt) {
    var sec = now / 1000;
    var step = reduce ? 0 : (dt || 0);
    var docH = Math.max(1, document.documentElement.scrollHeight - H);
    var frac = clamp(scrollY() / docH, 0, 1);
    var sy = scrollY();

    px += (tpx - px) * 0.045;
    py += (tpy - py) * 0.045;

    var cx = W * 0.52 + px;
    var cy = H * 0.50 - Math.min(sy * 0.05, H * 0.42) + py;
    var scale = 1 + frac * 0.14;
    var pal = PALETTES[isAbyss() ? "night" : "day"];
    var base = (isAbyss() ? 0.78 : 0.56) * (1 - frac * 0.26);

    ctx.clearRect(0, 0, W, H);

    var buckets = {};
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.ang += s.spin * step;
      var rr = s.r * scale * (1 + 0.014 * Math.sin(sec * 0.5 + s.phase));
      var x = cx + Math.cos(s.ang) * rr;
      var y = cy + Math.sin(s.ang) * rr * 0.86;

      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;

      var edge = Math.min(x, W - x, y, H - y);
      var inside = smoothstep(-70, 40, Math.min(x - colX, colX + colW - x));
      var b = (0.42 + 0.58 * (0.5 + 0.5 * Math.sin(sec * s.tw + s.phase)))
            * smoothstep(rMin * 0.85, rMin * 2.1, s.r)
            * smoothstep(0, 90, edge)
            * (1 - 0.62 * inside);
      if (b <= 0.02) continue;

      var li = Math.min(LEVELS - 1, Math.floor(b * LEVELS));
      var key = s.ci * LEVELS + li;
      var bucket = buckets[key];
      if (!bucket) {
        bucket = buckets[key] = { ci: s.ci, li: li, seg: [] };
      }

      var a = s.ang + Math.PI / 2 + s.tilt;
      var dx = Math.cos(a), dy = Math.sin(a);
      var L = s.len * (0.72 + 0.44 * Math.sin(sec * 0.9 + s.phase));
      var hx = dx * L * 0.5, hy = dy * L * 0.5;
      bucket.seg.push(x - hx, y - hy, x + hx, y + hy);

      if (s.glyph) {
        bucket.seg.push(x - 2.2, y, x + 2.2, y);
        bucket.seg.push(x, y - 2.2, x, y + 2.2);
      }
    }

    ctx.lineWidth = 1.05;
    ctx.lineCap = "round";
    for (var k in buckets) {
      if (!Object.prototype.hasOwnProperty.call(buckets, k)) continue;
      var g = buckets[k];
      ctx.strokeStyle = pal[g.ci];
      ctx.globalAlpha = base * (0.16 + 0.84 * (g.li + 1) / LEVELS);
      ctx.beginPath();
      for (var j = 0; j < g.seg.length; j += 4) {
        ctx.moveTo(g.seg[j], g.seg[j + 1]);
        ctx.lineTo(g.seg[j + 2], g.seg[j + 3]);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (document.hidden) return;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    paint(now, dt);
  }

  function paintOnce() {
    pending = false;
    paint(performance.now());
  }

  function onResize() {
    var nw = host.clientWidth || window.innerWidth;
    var nh = Math.max(host.clientHeight || 0, window.innerHeight);
    var nd = Math.min(window.devicePixelRatio || 1, 1.5);
    setCanvas(nw, nh, nd);
    measureColumn();
    buildStars();
    last = 0;
    paintOnce();
  }

  setCanvas(
    host.clientWidth || window.innerWidth,
    Math.max(host.clientHeight || 0, window.innerHeight),
    Math.min(window.devicePixelRatio || 1, 1.5)
  );
  measureColumn();
  buildStars();
  paint(performance.now());

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

  window.addEventListener("pointermove", function (e) {
    tpx = (e.clientX / W - 0.5) * 34;
    tpy = (e.clientY / H - 0.5) * 26;
  }, { passive: true });

  window.addEventListener("load", function () { measureColumn(); paintOnce(); });
  window.COSMOS_RETHEME = function () { measureColumn(); paintOnce(); };
})();
