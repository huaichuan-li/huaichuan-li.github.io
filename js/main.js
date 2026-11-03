// ============ 山湖之间 · 交互脚本 ============
(function () {
  "use strict";

  // ---- 导航滚动状态 ----
  var nav = document.getElementById("nav");
  function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 60);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- 语言切换 ----
  var langToggle = document.getElementById("langToggle");
  langToggle.addEventListener("click", function () {
    var toEn = !document.body.classList.contains("en");
    document.body.classList.toggle("en", toEn);
    document.documentElement.lang = toEn ? "en" : "zh-CN";
    langToggle.textContent = toEn ? "中" : "EN";
    try { localStorage.setItem("lemon-lang", toEn ? "en" : "zh"); } catch (e) {}
  });
  try {
    if (localStorage.getItem("lemon-lang") === "en") {
      document.body.classList.add("en");
      document.documentElement.lang = "en";
      langToggle.textContent = "中";
    }
  } catch (e) {}

  // ---- 移动端菜单 ----
  var burger = document.getElementById("navBurger");
  var navLinks = document.getElementById("navLinks");
  burger.addEventListener("click", function () {
    navLinks.classList.toggle("open");
  });
  navLinks.addEventListener("click", function (e) {
    if (e.target.tagName === "A") navLinks.classList.remove("open");
  });

  // ---- Scrollspy：高亮当前章节 ----
  var sections = document.querySelectorAll("section[id], header[id]");
  var linkMap = {};
  navLinks.querySelectorAll("a[href^='#']").forEach(function (a) {
    linkMap[a.getAttribute("href").slice(1)] = a;
  });
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        navLinks.querySelectorAll("a").forEach(function (a) { a.classList.remove("active"); });
        if (linkMap[id]) linkMap[id].classList.add("active");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach(function (s) { spy.observe(s); });

  // ---- 入场动画 ----
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(function (el) { revealObserver.observe(el); });

  // ---- 数字计数动画 ----
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var duration = 1400;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var statObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll("[data-count]").forEach(animateCount);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  var statsEl = document.getElementById("stats");
  if (statsEl) statObserver.observe(statsEl);

  // ---- 实习 Tab 切换 ----
  var tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      tabBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
      var panel = document.getElementById("tab-" + btn.getAttribute("data-tab"));
      if (panel) {
        panel.classList.add("active");
        panel.querySelectorAll(".reveal:not(.visible)").forEach(function (el) { el.classList.add("visible"); });
      }
    });
  });

  // ---- 奖项筛选 ----
  var filterBtns = document.querySelectorAll(".filter-btn");
  var awards = document.querySelectorAll("#awardsGrid > div");
  function applyFilter(cat) {
    awards.forEach(function (a) {
      var match = cat === "all" || a.classList.contains("award-" + cat);
      a.classList.toggle("hidden", !match);
    });
  }
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      applyFilter(btn.getAttribute("data-filter"));
    });
  });
  // 初始状态：全部显示
  applyFilter("all");
})();
