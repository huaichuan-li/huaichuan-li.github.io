/* ============================================================
   OCEAN 01 · ASCII 生物字形
   用几何图元（椭圆、三角、曲线触手）生成干净的字符剪影，
   比直接采样照片更清楚，也更贴合"极简科幻"的设定。
   每个字形输出 { cols, rows, grid }，grid 里 0=空 / 1=内部 / 2=轮廓。
   ============================================================ */

(function () {
  "use strict";

  const W = 46;            // 字形基准字符宽（采样时的参考分辨率）
  const H = 24;            // 字形基准字符高（屏幕上是 1 : 1.7 的格子）

  /* 当前采样精度相对基准的倍数。build() 前按目标列数更新，
     手臂的曲线采样步数随之加密，避免高分辨率下触手出现断点。 */
  let RES = 1;

  function ell(u, v, cx, cy, rx, ry) {
    const a = (u - cx) / rx, b = (v - cy) / ry;
    return a * a + b * b <= 1;
  }

  function tri(u, v, a, b, c) {
    const d1 = (u - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (v - b[1]);
    const d2 = (u - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (v - c[1]);
    const d3 = (u - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (v - a[1]);
    const neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(neg && pos);
  }

  /* 沿一条参数曲线画"手臂/触手" */
  function arm(u, v, opts) {
    const x0 = opts.x, y0 = opts.y, len = opts.len, amp = opts.amp;
    const ph = opts.phase || 0, dir = opts.dir || 0, th = opts.thick || 0.022;
    const steps = Math.max(26, Math.round(26 * RES));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ax = x0 + dir * t * len + Math.sin(t * 3.1 + ph) * amp * t;
      const ay = y0 + t * len * 1.5;
      const dx = u - ax, dy = (v - ay) * 0.55;
      if (dx * dx + dy * dy < th * th) return true;
    }
    return false;
  }

  const DEFS = {
    /* 小鲸鱼：圆头 + 大尾鳍 */
    whale: function (u, v) {
      return ell(u, v, 0.44, 0.55, 0.32, 0.23) ||
        tri(u, v, [0.74, 0.55], [0.99, 0.26], [0.99, 0.84]) ||
        ell(u, v, 0.40, 0.74, 0.10, 0.05) ||
        ell(u, v, 0.55, 0.36, 0.12, 0.05);
    },

    /* 虎鲸：细长身体 + 高背鳍 + 尾鳍 */
    orca: function (u, v) {
      return ell(u, v, 0.44, 0.56, 0.33, 0.19) ||
        tri(u, v, [0.42, 0.42], [0.52, 0.03], [0.60, 0.44]) ||
        tri(u, v, [0.74, 0.56], [0.99, 0.32], [0.99, 0.80]) ||
        ell(u, v, 0.38, 0.72, 0.08, 0.045);
    },

    /* 鲨鱼：尖吻 + 三角背鳍 + 新月尾 */
    shark: function (u, v) {
      return ell(u, v, 0.48, 0.54, 0.28, 0.15) ||
        tri(u, v, [0.20, 0.54], [0.06, 0.50], [0.20, 0.46]) ||
        tri(u, v, [0.44, 0.46], [0.50, 0.16], [0.56, 0.48]) ||
        tri(u, v, [0.74, 0.54], [0.99, 0.26], [0.90, 0.54]) ||
        tri(u, v, [0.74, 0.54], [0.99, 0.82], [0.90, 0.54]);
    },

    /* 魔鬼鱼：风筝形双翼 + 细长尾 */
    manta: function (u, v) {
      const wing = Math.abs(u - 0.44) / 0.42 + Math.abs(v - 0.36) / 0.16 <= 1;
      const body = ell(u, v, 0.44, 0.36, 0.15, 0.09);
      const tail = u > 0.41 && u < 0.47 && v > 0.48 && v < 0.96;
      return wing || body || tail;
    },

    /* 水母：伞盖 + 摆动触手 */
    jelly: function (u, v) {
      const dome = v < 0.56 && ell(u, v, 0.50, 0.50, 0.28, 0.24) && v > 0.24;
      if (dome) return true;
      for (let k = 0; k < 5; k++) {
        const x = 0.30 + k * 0.10;
        if (arm(u, v, { x: x, y: 0.54, len: 0.085, amp: 0.035, dir: 0, phase: k * 0.9, thick: 0.016 })) return true;
      }
      return false;
    },

    /* 水母 B：小伞盖 + 更长的触手 */
    jelly2: function (u, v) {
      const dome = v < 0.50 && ell(u, v, 0.50, 0.44, 0.22, 0.20) && v > 0.22;
      if (dome) return true;
      for (let k = 0; k < 6; k++) {
        const x = 0.34 + k * 0.064;
        if (arm(u, v, { x: x, y: 0.48, len: 0.11, amp: 0.04, dir: 0, phase: k * 1.1, thick: 0.014 })) return true;
      }
      return false;
    },

    /* 章鱼：圆头 + 六条触手 */
    octopus: function (u, v) {
      if (ell(u, v, 0.50, 0.34, 0.21, 0.21)) return true;
      const spread = [-1, -0.6, -0.2, 0.2, 0.6, 1];
      for (let k = 0; k < spread.length; k++) {
        if (arm(u, v, {
          x: 0.50 + spread[k] * 0.14, y: 0.44, len: 0.085,
          amp: 0.05, dir: spread[k] * 0.55, phase: k * 0.7, thick: 0.018,
        })) return true;
      }
      return false;
    },

    /* 深海巨章鱼：更大的头 + 更长的触手 */
    giant: function (u, v) {
      if (ell(u, v, 0.48, 0.30, 0.24, 0.22)) return true;
      const spread = [-1, -0.7, -0.35, 0, 0.35, 0.7, 1];
      for (let k = 0; k < spread.length; k++) {
        if (arm(u, v, {
          x: 0.48 + spread[k] * 0.15, y: 0.40, len: 0.105,
          amp: 0.06, dir: spread[k] * 0.5, phase: k * 0.55, thick: 0.02,
        })) return true;
      }
      return false;
    },

    /* 鱿鱼：锥形外套膜 + 大三角鳍 + 触手 */
    squid: function (u, v) {
      if (tri(u, v, [0.50, 0.06], [0.34, 0.58], [0.66, 0.58])) return true;
      if (tri(u, v, [0.30, 0.60], [0.50, 0.30], [0.36, 0.66])) return true;
      if (tri(u, v, [0.70, 0.60], [0.50, 0.30], [0.64, 0.66])) return true;
      const sx = [-0.11, -0.06, 0, 0.06, 0.11];
      for (let k = 0; k < sx.length; k++) {
        if (arm(u, v, {
          x: 0.50 + sx[k], y: 0.64, len: 0.075, amp: 0.015,
          dir: sx[k] * 3.2, phase: k * 0.6, thick: 0.014,
        })) return true;
      }
      return false;
    },

    /* 海狮：侧身趴在礁石上，头抬起 */
    sealion: function (u, v) {
      const body = ell(u, v, 0.52, 0.60, 0.20, 0.16);
      const head = ell(u, v, 0.28, 0.34, 0.095, 0.095);
      const neck = tri(u, v, [0.28, 0.34], [0.56, 0.62], [0.34, 0.60]);
      const finF = tri(u, v, [0.40, 0.62], [0.26, 0.84], [0.46, 0.76]);
      const finB = tri(u, v, [0.66, 0.66], [0.84, 0.84], [0.72, 0.56]);
      const rock = ell(u, v, 0.50, 0.90, 0.38, 0.05);
      return body || head || neck || finF || finB || rock;
    },

    /* 三文鱼刺身：三片叠放的切块 */
    salmon: function (u, v) {
      const slice = function (ox, oy, w, h, sk) {
        const yy = v - oy;
        const xx = u - ox - yy * sk;
        return Math.abs(xx) <= w / 2 && yy >= -h / 2 && yy <= h / 2;
      };
      return slice(0.44, 0.62, 0.44, 0.16, 0.55) ||
        slice(0.52, 0.52, 0.42, 0.15, 0.55) ||
        slice(0.60, 0.42, 0.40, 0.14, 0.55);
    },

    /* ---- 以下六个只作为环境 NPC：不指向任何成员 ---- */

    /* 海鸟：从下方看到的长翼 */
    bird: function (u, v) {
      const x = Math.abs(u - 0.5);
      const wingY = 0.38 + Math.pow(x * 2, 1.7) * 0.26;
      const wing = x < 0.47 && Math.abs(v - wingY) < 0.04 + x * 0.05;
      const body = ell(u, v, 0.5, 0.50, 0.05, 0.13);
      return wing || body;
    },

    /* 小鱼：纺锤身体 + 尾鳍 */
    fish: function (u, v) {
      return ell(u, v, 0.43, 0.50, 0.25, 0.14) ||
        tri(u, v, [0.68, 0.50], [0.97, 0.24], [0.97, 0.76]);
    },

    /* 鱼群：三条错位的小鱼 */
    school: function (u, v) {
      const one = function (cx, cy, sx, sy) {
        return ell(u, v, cx, cy, sx, sy) ||
          tri(u, v, [cx + sx * 0.86, cy], [cx + sx * 1.8, cy - sy * 1.5], [cx + sx * 1.8, cy + sy * 1.5]);
      };
      return one(0.34, 0.62, 0.15, 0.08) ||
        one(0.60, 0.44, 0.17, 0.09) ||
        one(0.50, 0.76, 0.12, 0.065);
    },

    /* 海龟：椭圆龟壳 + 四片桨状鳍 + 小头 */
    turtle: function (u, v) {
      const shell = ell(u, v, 0.53, 0.50, 0.26, 0.17);
      const head = ell(u, v, 0.205, 0.50, 0.075, 0.06);
      const f1 = ell(u, v, 0.345, 0.295, 0.085, 0.042);
      const f2 = ell(u, v, 0.715, 0.295, 0.085, 0.042);
      const f3 = ell(u, v, 0.345, 0.705, 0.085, 0.042);
      const f4 = ell(u, v, 0.715, 0.705, 0.085, 0.042);
      return shell || head || f1 || f2 || f3 || f4;
    },

    /* 灯笼鱼：小鱼 + 头顶发光点 */
    lantern: function (u, v) {
      const body = ell(u, v, 0.48, 0.58, 0.22, 0.12) ||
        tri(u, v, [0.68, 0.58], [0.95, 0.36], [0.95, 0.80]);
      const stalk = Math.abs(u - 0.34) < 0.012 && v > 0.32 && v < 0.48;
      const lure = ell(u, v, 0.34, 0.30, 0.045, 0.045);
      return body || stalk || lure;
    },

    /* 鮟鱇：圆身体 + 大嘴 + 头顶灯泡 */
    angler: function (u, v) {
      const body = ell(u, v, 0.48, 0.62, 0.30, 0.23);
      const tail = tri(u, v, [0.74, 0.62], [0.98, 0.42], [0.98, 0.82]);
      const stalk = Math.abs(u - 0.54) < 0.013 && v > 0.28 && v < 0.46;
      const lure = ell(u, v, 0.54, 0.25, 0.05, 0.05);
      return body || tail || stalk || lure;
    },

    /* 端足类／小虾：弯钩状身体 + 尾扇 + 触须 */
    shrimp: function (u, v) {
      const dx = u - 0.50, dy = v - 0.52;
      const r = Math.sqrt(dx * dx * 1.15 + dy * dy);
      const ang = Math.atan2(dy, dx);
      const inArc = ang > -2.25 && ang < 1.15;
      const body = inArc && Math.abs(r - 0.185) < 0.055;
      const head = ell(u, v, 0.325, 0.375, 0.075, 0.065);
      const fan = tri(u, v, [0.63, 0.60], [0.94, 0.50], [0.90, 0.78]);
      const ant = Math.abs(v - (0.30 - (u - 0.20) * 0.30)) < 0.013 && u > 0.07 && u < 0.20;
      const ant2 = Math.abs(v - (0.40 - (u - 0.20) * 0.10)) < 0.013 && u > 0.05 && u < 0.20;
      return body || head || fan || ant || ant2;
    },

    /* 管水母：一串浮囊连成的竖链 + 下垂触手（微光层的标志物） */
    siphon: function (u, v) {
      if (v > 0.05 && v < 0.86) {
        const cx = 0.50 + Math.sin(v * 4.2) * 0.026;
        const bulge = Math.max(0, Math.cos((v - 0.12) * (Math.PI / 0.155)));
        const hw = 0.026 + 0.054 * bulge;
        if (Math.abs(u - cx) < hw) return true;
      }
      for (let t = 0; t < 3; t++) {
        if (arm(u, v, { x: 0.44 + t * 0.06, y: 0.84, len: 0.045, amp: 0.03, dir: 0, phase: t * 1.3, thick: 0.012 })) return true;
      }
      return false;
    },

    /* 小飞象章鱼：圆伞 + 两只耳鳍 + 短触手（深渊层） */
    dumbo: function (u, v) {
      if (ell(u, v, 0.48, 0.44, 0.215, 0.195)) return true;
      if (ell(u, v, 0.285, 0.235, 0.085, 0.052)) return true;
      if (ell(u, v, 0.675, 0.235, 0.085, 0.052)) return true;
      const sp = [-0.9, -0.45, 0, 0.45, 0.9];
      for (let k = 0; k < sp.length; k++) {
        if (arm(u, v, {
          x: 0.48 + sp[k] * 0.13, y: 0.58, len: 0.045, amp: 0.03,
          dir: sp[k] * 0.4, phase: k * 0.7, thick: 0.016,
        })) return true;
      }
      return false;
    },

    /* 狮子鱼：大头 + 逐渐收细的带状尾（海沟层常客） */
    snailfish: function (u, v) {
      const t = (u - 0.20) / 0.72;
      if (t >= 0 && t <= 1) {
        const cy = 0.50 + t * t * 0.16;
        const th = 0.135 * Math.pow(1 - t, 0.75) + 0.010;
        if (Math.abs(v - cy) < th) return true;
      }
      if (ell(u, v, 0.22, 0.44, 0.135, 0.115)) return true;
      if (ell(u, v, 0.33, 0.62, 0.075, 0.032)) return true;
      return tri(u, v, [0.42, 0.40], [0.55, 0.26], [0.58, 0.42]);
    },

    /* 等足虫：分节椭圆甲壳 + 尾扇 + 一排步足（海沟层底栖） */
    isopod: function (u, v) {
      if (ell(u, v, 0.47, 0.44, 0.29, 0.18)) return true;
      if (tri(u, v, [0.72, 0.44], [0.99, 0.34], [0.99, 0.56])) return true;
      for (let k = 0; k < 5; k++) {
        const x0 = 0.27 + k * 0.10;
        if (u > x0 - 0.02 && u < x0 + 0.09 && Math.abs(v - (0.60 + (u - x0) * 0.75)) < 0.016) return true;
      }
      return false;
    },
  };

  /* 眼睛／关键标记的位置（归一化坐标）。分辨率够高时，
     一个深色字符就能把"是哪种生物"点出来。 */
  const EYES = {
    whale: [[0.195, 0.52]],
    orca: [[0.175, 0.505]],
    shark: [[0.265, 0.495]],
    sealion: [[0.235, 0.305]],
    octopus: [[0.435, 0.415], [0.565, 0.415]],
    giant: [[0.405, 0.345], [0.545, 0.345]],
    squid: [[0.435, 0.475], [0.565, 0.475]],
    dumbo: [[0.405, 0.415], [0.555, 0.415]],
    snailfish: [[0.165, 0.425]],
    isopod: [[0.345, 0.405], [0.345, 0.475]],
    siphon: [],
    jelly2: [],
  };

  function build(key, cols) {
    const fn = DEFS[key];
    if (!fn) return null;
    const scale = Math.max(0.35, cols / W);
    const c = Math.max(12, Math.round(W * scale));
    const r = Math.max(7, Math.round(H * scale));
    const g = new Uint8Array(c * r);

    RES = c / W;   // 曲线采样精度跟着目标分辨率走

    for (let y = 0; y < r; y++) {
      const v = (y + 0.5) / r;
      for (let x = 0; x < c; x++) {
        const u = (x + 0.5) / c;
        g[y * c + x] = fn(u, v) ? 1 : 0;
      }
    }

    /* 三档：2 = 轮廓（4 邻域有空），3 = 深处，1 = 轮廓内侧一圈。
       字符越小，这三档越能把体积和层次交代出来。 */
    const out = new Uint8Array(c * r);
    for (let y = 0; y < r; y++) {
      for (let x = 0; x < c; x++) {
        const p = y * c + x;
        if (!g[p]) continue;
        let edge = false;
        if (x === 0 || y === 0 || x === c - 1 || y === r - 1) edge = true;
        else if (!g[p - 1] || !g[p + 1] || !g[p - c] || !g[p + c]) edge = true;
        out[p] = edge ? 2 : 3;
      }
    }

    for (let y = 0; y < r; y++) {
      for (let x = 0; x < c; x++) {
        const p = y * c + x;
        if (out[p] !== 3) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= r) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= c) continue;
            if (out[ny * c + nx] === 2) { near = true; break; }
          }
        }
        if (near) out[p] = 1;
      }
    }

    /* 眼睛：取最近的实心格压成最深一档 */
    const eyes = EYES[key];
    if (eyes && eyes.length) {
      for (let i = 0; i < eyes.length; i++) {
        const ex = Math.round(eyes[i][0] * c - 0.5);
        const ey = Math.round(eyes[i][1] * r - 0.5);
        let hit = -1, best = 1e9;
        for (let dy = -2; dy <= 2; dy++) {
          const ny = ey + dy;
          if (ny < 0 || ny >= r) continue;
          for (let dx = -2; dx <= 2; dx++) {
            const nx = ex + dx;
            if (nx < 0 || nx >= c) continue;
            const p = ny * c + nx;
            if (out[p] !== 1 && out[p] !== 3) continue;
            const d = dx * dx + dy * dy;
            if (d < best) { best = d; hit = p; }
          }
        }
        if (hit >= 0) out[hit] = 2;
      }
    }

    return { cols: c, rows: r, grid: out };
  }

  window.OCEAN_GLYPHS = { build: build, keys: Object.keys(DEFS), W: W, H: H };
})();
