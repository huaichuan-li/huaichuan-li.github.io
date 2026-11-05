// ============ 个人主页 · 交互脚本 ============
(function () {
  "use strict";

  var body = document.body;
  var root = document.documentElement;

  // ---- 主题色跟随深空模式（移动端地址栏配色） ----
  function syncThemeColor() {
    var m = document.getElementById("themeColor");
    if (m) m.content = body.classList.contains("abyss") ? "#081624" : "#EAF4FB";
  }

  // ---- 中英界面下 aria-label 同步 ----
  function isEn() { return body.classList.contains("en"); }
  function syncLabels() {
    var en = isEn();
    var burger = document.getElementById("navBurger");
    if (burger) burger.setAttribute("aria-label", en ? "Menu" : "菜单");
    var lang = document.getElementById("langToggle");
    if (lang) lang.setAttribute("aria-label", en ? "切换为中文" : "Switch to English");
  }

  // ---- 导航滚动状态 ----
  var nav = document.getElementById("nav");
  function onScroll() {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 60);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- 语言切换 ----
  var langToggle = document.getElementById("langToggle");
  function afterLangChange() {
    // 中英文字数差异会改变页面高度，通知背景动画重算分段坐标
    setTimeout(function () {
      if (typeof window.SEA_RELAYOUT === "function") window.SEA_RELAYOUT();
    }, 120);
  }
  if (langToggle) {
    langToggle.addEventListener("click", function () {
      var toEn = !body.classList.contains("en");
      body.classList.toggle("en", toEn);
      root.lang = toEn ? "en" : "zh-CN";
      langToggle.textContent = toEn ? "中" : "EN";
      langToggle.setAttribute("aria-pressed", toEn ? "true" : "false");
      try { localStorage.setItem("lemon-lang", toEn ? "en" : "zh"); } catch (e) {}
      syncLabels();
      paintSkyBtn();   // 星图按钮提示语同步切换语言
      afterLangChange();
    });
    try {
      if (localStorage.getItem("lemon-lang") === "en") {
        body.classList.add("en");
        root.lang = "en";
        langToggle.textContent = "中";
        langToggle.setAttribute("aria-pressed", "true");
      }
    } catch (e) {}
  }

  // ---- 浅色 / 深色背景切换 ----
  var skyToggle = document.getElementById("skyToggle");
  function paintSkyBtn() {
    if (!skyToggle) return;
    var abyss = body.classList.contains("abyss");
    skyToggle.textContent = abyss ? "☀" : "☾";
    var tip = abyss
      ? (isEn() ? "Switch to light theme" : "切换浅色模式")
      : (isEn() ? "Switch to dark theme" : "切换深色模式");
    skyToggle.title = tip;
    skyToggle.setAttribute("aria-label", tip);
    skyToggle.setAttribute("aria-pressed", abyss ? "true" : "false");
    skyToggle.dataset.tip = "1";
  }
  if (skyToggle) {
    skyToggle.addEventListener("click", function () {
      var toAbyss = !body.classList.contains("abyss");
      body.classList.toggle("abyss", toAbyss);
      try { localStorage.setItem("lemon-sky", toAbyss ? "abyss" : "day"); } catch (e) {}
      paintSkyBtn();
      syncThemeColor();
      if (typeof window.COSMOS_RETHEME === "function") window.COSMOS_RETHEME();
      if (typeof window.SEA_RETHEME === "function") window.SEA_RETHEME();
      afterLangChange();
    });
    paintSkyBtn();
  }
  syncThemeColor();
  syncLabels();

  // ---- 移动端菜单：aria-expanded / Esc / 点击外部关闭 ----
  var burger = document.getElementById("navBurger");
  var navLinks = document.getElementById("navLinks");
  function setMenu(open) {
    if (!burger || !navLinks) return;
    burger.classList.toggle("open", open);
    navLinks.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (burger && navLinks) {
    burger.addEventListener("click", function (e) {
      e.stopPropagation();
      setMenu(!navLinks.classList.contains("open"));
    });
    navLinks.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("click", function (e) {
      if (navLinks.classList.contains("open") && !navLinks.contains(e.target) && e.target !== burger) {
        setMenu(false);
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navLinks.classList.contains("open")) {
        setMenu(false);
        burger.focus();
      }
    });
  }

  // ---- Scrollspy：高亮当前章节 ----
  if ("IntersectionObserver" in window) {
    var sections = document.querySelectorAll("section[id], header[id]");
    var linkMap = {};
    if (navLinks) {
      navLinks.querySelectorAll("a[href^='#']").forEach(function (a) {
        linkMap[a.getAttribute("href").slice(1)] = a;
      });
    }
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && navLinks) {
          var id = entry.target.id;
          navLinks.querySelectorAll("a").forEach(function (a) { a.classList.remove("active"); });
          if (linkMap[id]) linkMap[id].classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  // ---- 入场动画（无 JS 时 CSS 不隐藏内容；无 IO 时兜底全部显示） ----
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("visible"); });
  }

  // ---- 奖项筛选 ----
  var filterBtns = document.querySelectorAll(".filter-btn");
  var awards = document.querySelectorAll("#awardsGrid .award");
  var yearGroups = document.querySelectorAll("#awardsGrid .tl-year-group");
  function applyFilter(cat) {
    awards.forEach(function (a) {
      var match = cat === "all" || a.classList.contains("award-" + cat);
      a.classList.toggle("hidden", !match);
    });
    /* 该年份已无可见条目时，整段年份一并收起 */
    yearGroups.forEach(function (g) {
      g.classList.toggle("hidden", !g.querySelector(".award:not(.hidden)"));
    });
  }
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterBtns.forEach(function (b) {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      applyFilter(btn.getAttribute("data-filter"));
      afterLangChange();
    });
  });
  if (awards.length) applyFilter("all");

  window.__SIGNAL_DEEP_READY = true;
})();
