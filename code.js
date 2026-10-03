/**
 * ==========================================================
 *  PokemonAR.js v5 — Photo Capture · i18n · Touch Rotate
 * ==========================================================
 */
/**
 * ==========================================================
 *  PokemonAR.js v5 — Photo Capture · i18n · Touch Rotate
 * ==========================================================
 */
(function () {
  "use strict";

  /* ============================================================
     CONSTANTS & STATE
     ============================================================ */
  var DEFAULTS = {
    marker: "hiro",
    scale: 0.5,
    spinSpeed: 5000,
    bobSpeed: 1500,
    ringRadius: 0.3,
  };

  var _pokemon = [];
  var _current = 0;
  var _config = {};
  var _scale = 0.5;
  var _loaderHidden = false;
  var _spinning = true;
  var _lang = "en";
  var _capturing = false;

  /* Model cache (LRU) */
  var _sceneCache = {};
  var _cacheOrder = [];
  var MAX_CACHE = 6;

  var EMOJI = {
    GRASS: "🌿",
    FIRE: "🔥",
    WATER: "💧",
    ELECTRIC: "⚡",
    NORMAL: "⭐",
    PSYCHIC: "🔮",
    ICE: "❄️",
    DRAGON: "🐉",
    DARK: "🌙",
    FAIRY: "✨",
    FIGHTING: "👊",
    POISON: "☠️",
    GROUND: "🌍",
    FLYING: "🕊️",
    BUG: "🐛",
    ROCK: "🪨",
    GHOST: "👻",
    STEEL: "⚙️",
  };

  var LANG_CYCLE = ["en", "zh_tw", "zh_cn"];
  var LANG_LABELS = { en: "EN", zh_tw: "繁體", zh_cn: "简体" };

  var UI = {
    point_camera: {
      en: "📷 Point camera at Hiro marker",
      zh_tw: "",
      zh_cn: "",
    },
    appeared: {
      en: "✨ Wild {n} appeared!",
      zh_tw: "✨ 狂野的 {名} 出現了！",
      zh_cn: "✨ 野生的 {n} 出现了！",
    },
    loading_name: {
      en: "⏳ Loading {n}…",
      zh_tw: "⏳ 正在載入 {n}…",
      zh_cn: "⏳ 正在載入 {n}…",
    },
    model_failed: {
      en: "❌ Model failed to load",
      zh_tw: "",
      zh_cn: "",
    },
    spin_on: { en: "Spin ON", zh_tw: "旋轉 在", zh_cn: "旋转 开" },
    spin_off: { en: "Spin OFF", zh_tw: "旋轉 關", zh_cn: "旋转 关" },
    loading_title: {
      en: "Loading Pokémon AR…",
      zh_tw: "正在載入 口袋妖怪 AR…",
      zh_cn: "正在加载 口袋妖怪 AR…",
    },
    requesting_camera: {
      en: "Requesting camera…",
      zh_tw: "正在請求相機權限…",
      zh_cn: "正在请求相机权限…",
    },
    loading_ar: {
      en: "Loading AR engine…",
      zh_tw: "正在載入 AR 引擎…",
      zh_cn: "正在加载 AR 引擎…",
    },
    building_ui: {
      en: "Building interface…",
      zh_tw: "正在建立介面…",
      zh_cn: "正在构建界面…",
    },
    loading_3d: {
      en: "Loading 3D models…",
      zh_tw: "",
      zh_cn: "",
    },
    ready: {
      en: "Ready! Point camera at Hiro marker 📷",
      zh_tw: "",
      zh_cn: "",
    },
    drag_hint: {
      en: "👆 Drag to rotate model",
      zh_tw: "",
      zh_cn: "",
    },
    photo_saved: {
      en: "📸 Photo captured!",
      zh_tw: "",
      zh_cn: "",
    },
    photo_save: { en: "💾 Save", zh_tw: "💾 拯救", zh_cn: "💾 保存" },
    photo_share: { en: "📤 Share", zh_tw: "📤 分享", zh_cn: "📤 分享" },
    photo_close: { en: "✕ Close", zh_tw: "✕ 關閉", zh_cn: "✕ 关闭" },
    photo_retake: { en: "🔄 Retake", zh_tw: "🔄 重拍", zh_cn: "🔄 重拍" },
    capture: { en: "Capture", zh_tw: "拍照", zh_cn: "拍照" },
    photo_watermark: {
      en: "Caught with Pokémon AR",
      zh_tw: "",
      zh_cn: "",
    },
  };

  /* ============================================================
     i18n HELPERS
     ============================================================ */
  function t(key, rep) {
    var obj = UI[key];
    if (!obj) return key;
    var s = obj[_lang] || obj.en || key;
    if (rep) {
      for (var k in rep) s = s.replace("{" + k + "}", rep[k]);
    }
    return s;
  }

  function getF(poke, field) {
    var v = poke[field];
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") return v[_lang] || v.en || "";
    return String(v);
  }

  /* ============================================================
     MOBILE META
     ============================================================ */
  function injectMobileMeta() {
    var c =
      "width=device-width,initial-scale=1,maximum-scale=1," +
      "user-scalable=no,viewport-fit=cover";
    var vp = document.querySelector('meta[name="viewport"]');
    if (vp) {
      vp.setAttribute("content", c);
    } else {
      addMeta("viewport", c);
    }
    addMeta("apple-mobile-web-app-capable", "yes");
    addMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    document.documentElement.style.webkitTextSizeAdjust = "100%";
  }

  function addMeta(n, c) {
    var m = document.createElement("meta");
    m.name = n;
    m.content = c;
    document.head.appendChild(m);
  }

  /* ============================================================
     CSS
     ============================================================ */
  function injectCSS() {
    var s = document.createElement("style");
    s.textContent =
      "*{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}" +
      "body{margin:0;overflow:hidden;touch-action:none;" +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,' +
      '"Noto Sans SC","Noto Sans TC","PingFang SC","PingFang TC",' +
      '"Microsoft YaHei","Microsoft JhengHei",Helvetica,Arial,sans-serif;}' +
      /* Loader */
      "#par-loader{position:fixed;inset:0;" +
      "background:linear-gradient(135deg,#0d0d0d,#1a1a2e);z-index:9999;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "color:#fff;padding:20px;}" +
      "#par-loader h2{margin:0 0 20px;font-size:20px;letter-spacing:1px;text-align:center;}" +
      "#par-loader .bar{width:min(260px,80vw);height:8px;background:#333;border-radius:4px;overflow:hidden;}" +
      "#par-loader .fill{height:100%;background:linear-gradient(90deg,#4CAF50,#00e676);" +
      "border-radius:4px;transition:width .4s ease;}" +
      "#par-loader p{margin:14px 0 0;font-size:13px;opacity:.6;text-align:center;}" +
      "#par-loader .emoji{font-size:48px;margin-bottom:16px;animation:bounce 1s infinite alternate;}" +
      "@keyframes bounce{0%{transform:translateY(0)}100%{transform:translateY(-12px)}}" +
      /* Top buttons */
      "#par-btns{position:fixed;top:env(safe-area-inset-top,10px);left:50%;" +
      "transform:translateX(-50%);z-index:999;display:flex;gap:6px;" +
      "flex-wrap:wrap;justify-content:center;padding:8px 10px;max-width:100vw;}" +
      "#par-btns button{padding:10px 14px;border:none;border-radius:20px;font-size:13px;" +
      "font-weight:bold;color:#fff;cursor:pointer;opacity:.8;transition:all .15s;" +
      "box-shadow:0 2px 8px rgba(0,0,0,.3);-webkit-user-select:none;user-select:none;" +
      "white-space:nowrap;min-height:44px;}" +
      "#par-btns button:active,#par-btns button.active{opacity:1;transform:scale(1.08);}" +
      /* Right controls */
      "#par-controls{position:fixed;top:70px;right:env(safe-area-inset-right,10px);" +
      "z-index:999;display:flex;flex-direction:column;gap:6px;align-items:center;}" +
      "#par-controls button{width:48px;height:48px;border:none;border-radius:50%;" +
      "background:rgba(0,0,0,.7);color:#fff;font-size:22px;cursor:pointer;" +
      "box-shadow:0 2px 8px rgba(0,0,0,.3);-webkit-user-select:none;user-select:none;" +
      "display:flex;align-items:center;justify-content:center;min-height:48px;}" +
      "#par-controls button:active{background:rgba(0,0,0,.95);transform:scale(1.1);}" +
      "#par-controls span{color:#fff;font-size:11px;text-align:center;" +
      "background:rgba(0,0,0,.5);border-radius:10px;padding:2px 8px;}" +
      "#par-controls .divider{width:36px;height:1px;background:rgba(255,255,255,.2);margin:2px 0;}" +
      /* Left lang button */
      "#par-lang{position:fixed;top:70px;left:env(safe-area-inset-left,10px);z-index:999;}" +
      "#par-lang button{width:48px;height:48px;border:none;border-radius:50%;" +
      "background:rgba(0,0,0,.7);color:#fff;font-size:14px;font-weight:bold;" +
      "cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);" +
      "-webkit-user-select:none;user-select:none;min-height:48px;}" +
      "#par-lang button:active{background:rgba(0,0,0,.95);transform:scale(1.1);}" +
      /* Capture shutter button */
      "#par-shutter{position:fixed;bottom:env(safe-area-inset-bottom,14px);" +
      "right:env(safe-area-inset-right,18px);z-index:1000;}" +
      "#par-shutter button{width:64px;height:64px;border:4px solid #fff;border-radius:50%;" +
      "background:rgba(255,255,255,.25);color:#fff;font-size:28px;cursor:pointer;" +
      "box-shadow:0 4px 16px rgba(0,0,0,.4);-webkit-user-select:none;user-select:none;" +
      "display:flex;align-items:center;justify-content:center;transition:all .15s;}" +
      "#par-shutter button:active{transform:scale(.88);background:rgba(255,255,255,.6);}" +
      "#par-shutter span{display:block;color:#fff;font-size:10px;text-align:center;" +
      "margin-top:4px;text-shadow:0 1px 4px rgba(0,0,0,.7);}" +
      /* Flash overlay */
      "#par-flash{position:fixed;inset:0;background:#fff;z-index:9998;" +
      "opacity:0;pointer-events:none;transition:opacity .08s;}" +
      "#par-flash.active{opacity:.85;transition:opacity .04s;}" +
      /* Photo preview overlay */
      "#par-preview{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:10000;" +
      "display:none;flex-direction:column;align-items:center;justify-content:center;" +
      "padding:16px;gap:12px;}" +
      "#par-preview.show{display:flex;}" +
      "#par-preview img{max-width:92vw;max-height:60vh;border-radius:12px;" +
      "box-shadow:0 8px 32px rgba(0,0,0,.6);object-fit:contain;}" +
      "#par-preview .actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;}" +
      "#par-preview .actions button{padding:12px 22px;border:none;border-radius:24px;" +
      "font-size:15px;font-weight:bold;cursor:pointer;min-height:48px;" +
      "-webkit-user-select:none;user-select:none;transition:all .12s;}" +
      "#par-preview .actions button:active{transform:scale(.95);}" +
      "#par-preview .btn-save{background:#4CAF50;color:#fff;}" +
      "#par-preview .btn-share{background:#2196F3;color:#fff;}" +
      "#par-preview .btn-retake{background:#FF9800;color:#fff;}" +
      "#par-preview .btn-close{background:#666;color:#fff;}" +
      "#par-preview .timestamp{color:rgba(255,255,255,.4);font-size:11px;margin:0;}" +
      /* Bottom info card */
      "#par-info-card{position:fixed;bottom:env(safe-area-inset-bottom,14px);" +
      "left:50%;transform:translateX(-50%);z-index:999;" +
      "background:rgba(0,0,0,.8);color:#fff;padding:12px 22px;border-radius:16px;" +
      "backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);" +
      "text-align:center;max-width:72vw;pointer-events:none;min-width:160px;}" +
      "#par-info-card .pname{font-size:17px;font-weight:bold;margin:0 0 2px;" +
      "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      "#par-info-card .pdex{font-size:12px;opacity:.65;margin:0 0 4px;}" +
      "#par-info-card .ptype{font-size:13px;font-weight:600;margin:0;}" +
      "#par-info-card .pstatus{font-size:12px;opacity:.55;margin:6px 0 0;}";

    document.head.appendChild(s);
  }

  /* ============================================================
     DEBUG
     ============================================================ */
  function log(msg) {
    console.log("[PokemonAR] " + msg);
  }

  /* ============================================================
     LOADING SCREEN
     ============================================================ */
  function showLoader() {
    var d = document.createElement("div");
    d.id = "par-loader";
    d.innerHTML =
      '<div class="emoji">⚡</div>' +
      '<h2 id="par-load-title">' +
      t("loading_title") +
      "</h2>" +
      '<div class="bar"><div class="fill" id="par-fill" style="width:0%"></div></div>' +
      '<p id="par-load-text">…</p>';
    document.body.appendChild(d);
  }

  function updateLoader(pct, txt) {
    var f = document.getElementById("par-fill");
    var p = document.getElementById("par-load-text");
    if (f) f.style.width = pct + "%";
    if (p) p.textContent = txt;
  }

  function hideLoader() {
    if (_loaderHidden) return;
    _loaderHidden = true;
    updateLoader(100, t("ready"));
    setTimeout(function () {
      var d = document.getElementById("par-loader");
      if (d) {
        d.style.transition = "opacity .5s";
        d.style.opacity = "0";
        setTimeout(function () {
          d.remove();
        }, 500);
      }
    }, 600);
  }

  /* ============================================================
     SCRIPT LOADING (deduped)
     ============================================================ */
  var _loadedScripts = {};

  function loadScript(src) {
    if (_loadedScripts[src]) return Promise.resolve(true);
    return new Promise(function (resolve) {
      log("📜 " + src.split("/").pop());
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () {
        _loadedScripts[src] = true;
        log("✅ " + src.split("/").pop());
        resolve(true);
      };
      s.onerror = function () {
        log("❌ " + src.split("/").pop());
        resolve(false);
      };
      document.head.appendChild(s);
    });
  }

  /* ============================================================
     RESOURCE MANAGEMENT — LRU Model Cache
     ============================================================ */
  function cacheScene(url, scene) {
    if (_sceneCache[url]) return;
    while (_cacheOrder.length >= MAX_CACHE) {
      var old = _cacheOrder.shift();
      var obj = _sceneCache[old];
      if (obj) {
        disposeObject(obj);
        delete _sceneCache[old];
        log("🗑️ Evicted: " + old.split("/").pop());
      }
    }
    _sceneCache[url] = scene;
    _cacheOrder.push(url);
    log(
      "💾 Cached: " +
        url.split("/").pop() +
        " (" +
        _cacheOrder.length +
        "/" +
        MAX_CACHE +
        ")"
    );
  }

  function touchCache(url) {
    var i = _cacheOrder.indexOf(url);
    if (i > -1) {
      _cacheOrder.splice(i, 1);
      _cacheOrder.push(url);
    }
  }

  function disposeObject(obj) {
    if (!obj) return;
    obj.traverse(function (c) {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        var mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach(function (m) {
          for (var k in m) {
            if (m[k] && m[k].isTexture) m[k].dispose();
          }
          m.dispose();
        });
      }
    });
  }

  /* ============================================================
     A-FRAME COMPONENTS
     ============================================================ */
  function registerComponents() {
    if (!window.AFRAME) return;

    /* ---------- gltf-model-next (cached) ---------- */
    AFRAME.registerComponent("gltf-model-next", {
      schema: { type: "model" },
      init: function () {
        this.model = null;
        this._url = null;
      },

      update: function (oldData) {
        var self = this,
          el = this.el,
          src = this.data;
        if (!src || src === oldData) return;

        if (this.model) {
          el.removeObject3D("mesh");
          this.model = null;
        }

        var url = src;
        if (src.charAt(0) === "#") {
          var a = document.getElementById(src.substring(1));
          url = a ? a.getAttribute("src") : src;
        }
        this._url = url;

        if (_sceneCache[url]) {
          log("♻️ Cache hit: " + url.split("/").pop());
          touchCache(url);
          var clone = _sceneCache[url].clone();
          self.model = clone;
          el.setObject3D("mesh", clone);
          el.emit("model-loaded", { model: clone, format: "gltf" });
          return;
        }

        log("🔄 Fetching: " + url.split("/").pop());
        var loader = new THREE.GLTFLoader();

        if (THREE.DRACOLoader) {
          try {
            var dr = new THREE.DRACOLoader();
            dr.setDecoderPath(
              "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
            );
            loader.setDRACOLoader(dr);
          } catch (e) {
            /* skip */
          }
        }
        if (window.MeshoptDecoder && loader.setMeshoptDecoder) {
          try {
            loader.setMeshoptDecoder(window.MeshoptDecoder);
          } catch (e) {
            /* skip */
          }
        }

        loader.load(
          url,
          function (gltf) {
            if (self._url !== url) return;
            var m = gltf.scene || gltf.scenes[0];
            cacheScene(url, m);
            var cl = m.clone();
            self.model = cl;
            el.setObject3D("mesh", cl);
            log("✅ Ready: " + url.split("/").pop());
            el.emit("model-loaded", { model: cl, format: "gltf" });
          },
          undefined,
          function (err) {
            var msg = err && err.message ? err.message : String(err);
            log("❌ Error: " + msg);
            el.emit("model-error", { format: "gltf", src: url, error: msg });
          }
        );
      },

      remove: function () {
        if (this.model) {
          this.el.removeObject3D("mesh");
          this.model = null;
        }
      },
    });

    /* ---------- touch-rotate (mouse + touch) ---------- */
    AFRAME.registerComponent("touch-rotate", {
      schema: {
        sensitivity: { type: "number", default: 0.4 },
        maxPitch: { type: "number", default: 60 },
      },

      init: function () {
        var self = this;
        this.rotX = 0;
        this.rotY = 0;
        this.dragging = false;
        this.sx = 0;
        this.sy = 0;

        this.el.sceneEl.addEventListener("renderstart", function () {
          var cv = self.el.sceneEl.canvas;
          if (!cv) return;

          cv.addEventListener(
            "touchstart",
            function (e) {
              if (e.touches.length === 1) {
                self.dragging = true;
                self.sx = e.touches[0].pageX;
                self.sy = e.touches[0].pageY;
              }
            },
            { passive: true }
          );

          cv.addEventListener(
            "touchmove",
            function (e) {
              if (!self.dragging || e.touches.length !== 1) return;
              var dx = e.touches[0].pageX - self.sx;
              var dy = e.touches[0].pageY - self.sy;
              self._applyDelta(dx, dy);
              self.sx = e.touches[0].pageX;
              self.sy = e.touches[0].pageY;
            },
            { passive: true }
          );

          cv.addEventListener(
            "touchend",
            function () {
              self.dragging = false;
            },
            { passive: true }
          );

          cv.addEventListener("mousedown", function (e) {
            self.dragging = true;
            self.sx = e.pageX;
            self.sy = e.pageY;
          });
          cv.addEventListener("mousemove", function (e) {
            if (!self.dragging) return;
            self._applyDelta(e.pageX - self.sx, e.pageY - self.sy);
            self.sx = e.pageX;
            self.sy = e.pageY;
          });
          cv.addEventListener("mouseup", function () {
            self.dragging = false;
          });
          cv.addEventListener("mouseleave", function () {
            self.dragging = false;
          });

          log("👆 touch-rotate active");
        });
      },

      _applyDelta: function (dx, dy) {
        var sens = this.data.sensitivity;
        this.rotY += dx * sens;
        this.rotX += dy * sens * 0.6;
        this.rotX = Math.max(
          -this.data.maxPitch,
          Math.min(this.data.maxPitch, this.rotX)
        );
        this.el.setAttribute("rotation", this.rotX + " " + this.rotY + " 0");
      },

      resetRotation: function () {
        this.rotX = 0;
        this.rotY = 0;
        this.el.setAttribute("rotation", "0 0 0");
      },
    });

    log("✅ Components registered");
  }

  /* ============================================================
     LOAD DEPENDENCIES
     ============================================================ */
  async function loadDeps() {
    if (!window.AFRAME) {
      await loadScript("https://aframe.io/releases/1.4.0/aframe.min.js");
    }
    if (!window.AFRAME || !AFRAME.components["arjs-look-controls"]) {
      await loadScript(
        "https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js"
      );
    }
    log("A-Frame " + (window.AFRAME ? AFRAME.version : "N/A"));

    await loadScript("https://unpkg.com/meshoptimizer@0.18/meshopt_decoder.js");
    if (window.MeshoptDecoder) {
      try {
        await MeshoptDecoder.ready;
        log("✅ MeshoptDecoder");
      } catch (e) {
        log("⚠️ MeshoptDecoder: " + e);
      }
    }

    registerComponents();
  }

  /* ============================================================
     UI — POKEMON BUTTONS
     ============================================================ */
  function buildButtons() {
    var w = document.createElement("div");
    w.id = "par-btns";
    _pokemon.forEach(function (p, i) {
      var b = document.createElement("button");
      b.dataset.idx = i;
      b.style.background = p.color;
      if (i === _current) b.classList.add("active");
      b.addEventListener("click", function (e) {
        e.preventDefault();
        switchPokemon(i);
      });
      w.appendChild(b);
    });
    document.body.appendChild(w);
    refreshButtons();
  }

  function refreshButtons() {
    document.querySelectorAll("#par-btns button").forEach(function (b) {
      var i = parseInt(b.dataset.idx);
      var p = _pokemon[i];
      var ft = getF(p, "type").split("/")[0].trim().toUpperCase();
      b.textContent = (EMOJI[ft] || "⭐") + " " + getF(p, "name");
    });
  }

  /* ============================================================
     UI — RIGHT CONTROLS
     ============================================================ */
  function buildControls() {
    var w = document.createElement("div");
    w.id = "par-controls";

    w.appendChild(
      mkBtn("+", function () {
        changeScale(1.5);
      })
    );
    var sl = document.createElement("span");
    sl.id = "par-scale-label";
    sl.textContent = _scale.toFixed(2) + "x";
    w.appendChild(sl);
    w.appendChild(
      mkBtn("−", function () {
        changeScale(0.66);
      })
    );

    var dv = document.createElement("div");
    dv.className = "divider";
    w.appendChild(dv);

    var sb = mkBtn("🔄", toggleSpin);
    sb.id = "par-spin-btn";
    w.appendChild(sb);
    var sbl = document.createElement("span");
    sbl.id = "par-spin-label";
    sbl.textContent = t("spin_on");
    w.appendChild(sbl);

    var dv2 = document.createElement("div");
    dv2.className = "divider";
    w.appendChild(dv2);
    var rb = mkBtn("🎯", resetPivot);
    rb.id = "par-reset-btn";
    w.appendChild(rb);

    document.body.appendChild(w);
  }

  function mkBtn(txt, fn) {
    var b = document.createElement("button");
    b.textContent = txt;
    b.addEventListener("click", function (e) {
      e.preventDefault();
      fn();
    });
    return b;
  }

  function changeScale(factor) {
    _scale = Math.max(0.01, Math.min(10, _scale * factor));
    var s = _scale.toFixed(4);
    var m = document.getElementById("par-mdl");
    if (m) m.setAttribute("scale", s + " " + s + " " + s);
    var l = document.getElementById("par-scale-label");
    if (l) l.textContent = _scale.toFixed(2) + "x";
  }

  function toggleSpin() {
    _spinning = !_spinning;
    var mdl = document.getElementById("par-mdl");
    var ring = document.getElementById("par-ring");
    var lb = document.getElementById("par-spin-label");
    var bt = document.getElementById("par-spin-btn");

    if (_spinning) {
      mdl.setAttribute(
        "animation",
        "property:rotation; to:0 360 0; loop:true; dur:" +
          _config.spinSpeed +
          "; easing:linear"
      );
      mdl.setAttribute(
        "animation__bob",
        "property:position; from:0 0 0; to:0 0.15 0; dir:alternate; " +
          "loop:true; dur:" +
          _config.bobSpeed +
          "; easing:easeInOutSine"
      );
      ring.setAttribute(
        "animation",
        "property:rotation; from:-90 0 0; to:-90 360 0; " +
          "loop:true; dur:3000; easing:linear"
      );
      if (lb) lb.textContent = t("spin_on");
      if (bt) bt.textContent = "🔄";
    } else {
      mdl.removeAttribute("animation");
      mdl.removeAttribute("animation__bob");
      ring.removeAttribute("animation");
      mdl.setAttribute("position", "0 0 0");
      ring.setAttribute("rotation", "-90 0 0");
      if (lb) lb.textContent = t("spin_off");
      if (bt) bt.textContent = "⏸️";
    }
  }

  function resetPivot() {
    var pv = document.getElementById("par-pivot");
    if (pv) {
      var comp = pv.components["touch-rotate"];
      if (comp) comp.resetRotation();
      else pv.setAttribute("rotation", "0 0 0");
    }
  }

  /* ============================================================
     UI — LANGUAGE TOGGLE
     ============================================================ */
  function buildLangToggle() {
    var w = document.createElement("div");
    w.id = "par-lang";
    var b = document.createElement("button");
    b.id = "par-lang-btn";
    b.textContent = LANG_LABELS[_lang];
    b.addEventListener("click", function (e) {
      e.preventDefault();
      cycleLang();
    });
    w.appendChild(b);
    document.body.appendChild(w);
  }

  function cycleLang() {
    var i = LANG_CYCLE.indexOf(_lang);
    _lang = LANG_CYCLE[(i + 1) % LANG_CYCLE.length];
    applyLang();
  }

  function applyLang() {
    log("🌐 Lang → " + _lang);
    var lb = document.getElementById("par-lang-btn");
    if (lb) lb.textContent = LANG_LABELS[_lang];
    refreshButtons();
    refreshInfoCard();
    var sl = document.getElementById("par-spin-label");
    if (sl) sl.textContent = _spinning ? t("spin_on") : t("spin_off");
    var cl = document.getElementById("par-cap-label");
    if (cl) cl.textContent = t("capture");
  }

  /* ============================================================
     UI — INFO CARD
     ============================================================ */
  function buildInfoCard() {
    var d = document.createElement("div");
    d.id = "par-info-card";
    d.innerHTML =
      '<div class="pname" id="par-ic-name"></div>' +
      '<div class="pdex"  id="par-ic-dex"></div>' +
      '<div class="ptype" id="par-ic-type"></div>' +
      '<div class="pstatus" id="par-ic-status"></div>';
    document.body.appendChild(d);
    refreshInfoCard();
  }

  function refreshInfoCard() {
    var p = _pokemon[_current];
    var nm = document.getElementById("par-ic-name");
    var dx = document.getElementById("par-ic-dex");
    var tp = document.getElementById("par-ic-type");
    if (nm) nm.textContent = getF(p, "name");
    if (dx) dx.textContent = getF(p, "dex");
    if (tp) {
      tp.textContent = getF(p, "type");
      tp.style.color = p.color;
    }
  }

  function setStatus(key, rep) {
    var s = document.getElementById("par-ic-status");
    if (s) s.textContent = t(key, rep);
  }

  /* ============================================================
     📸 PHOTO CAPTURE
     ============================================================ */
  function buildCaptureUI() {
    /* Flash overlay */
    var flash = document.createElement("div");
    flash.id = "par-flash";
    document.body.appendChild(flash);

    /* Preview overlay */
    var preview = document.createElement("div");
    preview.id = "par-preview";
    preview.innerHTML =
      '<img id="par-preview-img" src="" alt="capture" />' +
      '<p class="timestamp" id="par-preview-ts"></p>' +
      '<div class="actions">' +
      '  <button class="btn-save"   id="par-prev-save">' +
      t("photo_save") +
      "</button>" +
      '  <button class="btn-share"  id="par-prev-share">' +
      t("photo_share") +
      "</button>" +
      '  <button class="btn-retake" id="par-prev-retake">' +
      t("photo_retake") +
      "</button>" +
      '  <button class="btn-close"  id="par-prev-close">' +
      t("photo_close") +
      "</button>" +
      "</div>";
    document.body.appendChild(preview);

    /* Shutter button */
    var wrap = document.createElement("div");
    wrap.id = "par-shutter";
    var btn = document.createElement("button");
    btn.innerHTML = "📸";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      capturePhoto();
    });
    wrap.appendChild(btn);
    var lbl = document.createElement("span");
    lbl.id = "par-cap-label";
    lbl.textContent = t("capture");
    wrap.appendChild(lbl);
    document.body.appendChild(wrap);

    /* Event listeners */
    document
      .getElementById("par-prev-save")
      .addEventListener("click", function (e) {
        e.preventDefault();
        saveCapture();
      });
    document
      .getElementById("par-prev-share")
      .addEventListener("click", function (e) {
        e.preventDefault();
        shareCapture();
      });
    document
      .getElementById("par-prev-retake")
      .addEventListener("click", function (e) {
        e.preventDefault();
        closePreview();
        setTimeout(capturePhoto, 300);
      });
    document
      .getElementById("par-prev-close")
      .addEventListener("click", function (e) {
        e.preventDefault();
        closePreview();
      });
  }

  var _lastCaptureBlob = null;
  var _lastCaptureURL = null;

  function capturePhoto() {
    if (_capturing) return;
    _capturing = true;
    log("📸 Capture start");

    /* Flash */
    var flash = document.getElementById("par-flash");
    if (flash) {
      flash.classList.add("active");
      setTimeout(function () {
        flash.classList.remove("active");
      }, 200);
    }

    try {
      var sceneEl = document.querySelector("a-scene");
      if (!sceneEl) {
        _capturing = false;
        return;
      }

      /* Force a render so the canvas is fresh */
      sceneEl.renderer.render(sceneEl.object3D, sceneEl.camera);

      /* Get the WebGL canvas */
      var glCanvas = sceneEl.canvas;

      /* Get the video element (camera feed) */
      var video = document.querySelector("video");

      /* Create offscreen composite canvas */
      var w = glCanvas.width;
      var h = glCanvas.height;
      var composite = document.createElement("canvas");
      composite.width = w;
      composite.height = h;
      var ctx = composite.getContext("2d");

      /* Layer 1: camera video */
      if (video && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, w, h);
      } else {
        /* Fallback: dark background */
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, w, h);
      }

      /* Layer 2: WebGL 3D overlay */
      ctx.drawImage(glCanvas, 0, 0, w, h);

      /* Layer 3: Watermark */
      drawWatermark(ctx, w, h);

      /* Convert to blob for save/share */
      composite.toBlob(function (blob) {
        _lastCaptureBlob = blob;
        _lastCaptureURL = URL.createObjectURL(blob);

        /* Show preview */
        var img = document.getElementById("par-preview-img");
        if (img) img.src = _lastCaptureURL;
        var ts = document.getElementById("par-preview-ts");
        if (ts) ts.textContent = new Date().toLocaleString();
        var pv = document.getElementById("par-preview");
        if (pv) pv.classList.add("show");

        /* Update button labels for current lang */
        var s = document.getElementById("par-prev-save");
        var sh = document.getElementById("par-prev-share");
        var rt = document.getElementById("par-prev-retake");
        var cl = document.getElementById("par-prev-close");
        if (s) s.textContent = t("photo_save");
        if (sh) sh.textContent = t("photo_share");
        if (rt) rt.textContent = t("photo_retake");
        if (cl) cl.textContent = t("photo_close");

        /* Hide share if not supported */
        if (sh) sh.style.display = navigator.canShare ? "" : "none";

        setStatus("photo_saved");
        log("📸 Capture complete " + w + "x" + h);
        _capturing = false;

        /* Free composite canvas memory */
        composite.width = 1;
        composite.height = 1;
      }, "image/png");
    } catch (err) {
      log("📸 Error: " + err.message);
      _capturing = false;
    }
  }

  function drawWatermark(ctx, w, h) {
    var p = _pokemon[_current];
    var name = getF(p, "name");
    var dex = getF(p, "dex");
    var tagline = t("photo_watermark");

    var fontSize = Math.max(14, Math.round(w * 0.025));
    var smallSize = Math.max(10, Math.round(w * 0.016));
    var pad = Math.round(w * 0.02);

    /* Semi-transparent background strip at bottom */
    var stripH = fontSize + smallSize + pad * 2.5;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, h - stripH, w, stripH);

    /* Pokemon name + dex */
    ctx.fillStyle = "#fff";
    ctx.font =
      "bold " +
      fontSize +
      'px -apple-system, BlinkMacSystemFont, "Noto Sans SC", "Noto Sans TC", "PingFang SC", sans-serif';
    ctx.textBaseline = "bottom";
    ctx.fillText(name + "  " + dex, pad, h - pad - smallSize);

    /* Tagline + timestamp */
    ctx.font =
      smallSize +
      'px -apple-system, BlinkMacSystemFont, "Noto Sans SC", "Noto Sans TC", sans-serif';
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    var now = new Date();
    var stamp =
      tagline +
      "  •  " +
      now.getFullYear() +
      "/" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "/" +
      String(now.getDate()).padStart(2, "0") +
      " " +
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0");
    ctx.fillText(stamp, pad, h - pad);

    /* Small pokeball icon (right side) */
    var cx = w - pad - fontSize;
    var cy = h - stripH / 2;
    var r = fontSize * 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function saveCapture() {
    if (!_lastCaptureURL) return;
    var p = _pokemon[_current];
    var name = getF(p, "name").replace(/\s+/g, "_");
    var ts = Date.now();
    var a = document.createElement("a");
    a.href = _lastCaptureURL;
    a.download = "PokemonAR_" + name + "_" + ts + ".png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    log("💾 Saved");
  }

  async function shareCapture() {
    if (!_lastCaptureBlob || !navigator.canShare) return;
    var p = _pokemon[_current];
    var name = getF(p, "name");
    try {
      var file = new File([_lastCaptureBlob], "PokemonAR_" + name + ".png", {
        type: "image/png",
      });
      var shareData = {
        title: "Pokémon AR — " + name,
        text: t("photo_watermark") + " — " + name,
        files: [file],
      };
      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        log("📤 Shared");
      } else {
        /* Fallback: share without file */
        await navigator.share({
          title: "Pokémon AR — " + name,
          text: t("photo_watermark") + " — " + name,
        });
      }
    } catch (e) {
      if (e.name !== "AbortError") log("📤 Share error: " + e.message);
    }
  }

  function closePreview() {
    var pv = document.getElementById("par-preview");
    if (pv) pv.classList.remove("show");
    /* Release blob URL */
    if (_lastCaptureURL) {
      setTimeout(function () {
        URL.revokeObjectURL(_lastCaptureURL);
        _lastCaptureURL = null;
        _lastCaptureBlob = null;
      }, 500);
    }
  }

  /* ============================================================
     BUILD AR SCENE
     ============================================================ */
  function buildScene() {
    var p = _pokemon[_current];
    var sc = _scale.toFixed(4);

    var scene = document.createElement("a-scene");
    scene.setAttribute("embedded", "");
    scene.setAttribute("vr-mode-ui", "enabled:false");
    scene.setAttribute(
      "renderer",
      "antialias:true; alpha:true; precision:mediump; logarithmicDepthBuffer:false; preserveDrawingBuffer:true;"
    );
    scene.setAttribute(
      "arjs",
      "sourceType:webcam; debugUIEnabled:false; " +
        "detectionMode:mono_and_matrix; matrixCodeType:3x3;"
    );

    var al = document.createElement("a-light");
    al.setAttribute("type", "ambient");
    al.setAttribute("intensity", "0.9");
    scene.appendChild(al);

    var dl = document.createElement("a-light");
    dl.setAttribute("type", "directional");
    dl.setAttribute("position", "1 2 1");
    dl.setAttribute("intensity", "0.6");
    scene.appendChild(dl);

    var marker = document.createElement("a-marker");
    marker.id = "par-marker";
    marker.setAttribute("preset", _config.marker);
    marker.setAttribute("emitevents", "true");
    marker.setAttribute("smooth", "true");
    marker.setAttribute("smoothCount", "5");
    marker.setAttribute("smoothTolerance", "0.01");
    marker.setAttribute("smoothThreshold", "2");

    var pivot = document.createElement("a-entity");
    pivot.id = "par-pivot";
    pivot.setAttribute("touch-rotate", "sensitivity:0.4; maxPitch:60");

    var mdl = document.createElement("a-entity");
    mdl.id = "par-mdl";
    mdl.setAttribute("gltf-model-next", p.model);
    mdl.setAttribute("position", "0 0 0");
    mdl.setAttribute("scale", sc + " " + sc + " " + sc);

    if (_spinning) {
      mdl.setAttribute(
        "animation",
        "property:rotation; to:0 360 0; loop:true; dur:" +
          _config.spinSpeed +
          "; easing:linear"
      );
      mdl.setAttribute(
        "animation__bob",
        "property:position; from:0 0 0; to:0 0.15 0; dir:alternate; " +
          "loop:true; dur:" +
          _config.bobSpeed +
          "; easing:easeInOutSine"
      );
    }

    mdl.addEventListener("model-loaded", function (e) {
      log("🎉 Visible!");
      hideLoader();
      if (e.detail.model) {
        try {
          var box = new THREE.Box3().setFromObject(e.detail.model);
          var sz = new THREE.Vector3();
          box.getSize(sz);
          var mx = Math.max(sz.x, sz.y, sz.z);
          if (mx > 0 && isFinite(mx)) {
            _scale = 0.5 / mx;
            var s = _scale.toFixed(4);
            mdl.setAttribute("scale", s + " " + s + " " + s);
            var lb = document.getElementById("par-scale-label");
            if (lb) lb.textContent = _scale.toFixed(2) + "x";
          }
        } catch (err) {
          /* skip */
        }
      }
      setStatus("appeared", { n: getF(_pokemon[_current], "name") });
    });

    mdl.addEventListener("model-error", function () {
      setStatus("model_failed");
      hideLoader();
    });

    pivot.appendChild(mdl);
    marker.appendChild(pivot);

    var ring = document.createElement("a-torus");
    ring.id = "par-ring";
    ring.setAttribute("position", "0 0.005 0");
    ring.setAttribute("rotation", "-90 0 0");
    ring.setAttribute("radius", _config.ringRadius.toString());
    ring.setAttribute("radius-tubular", "0.01");
    ring.setAttribute("color", p.color);
    ring.setAttribute("opacity", "0.5");
    if (_spinning) {
      ring.setAttribute(
        "animation",
        "property:rotation; from:-90 0 0; to:-90 360 0; " +
          "loop:true; dur:3000; easing:linear"
      );
    }
    marker.appendChild(ring);

    scene.appendChild(marker);

    var cam = document.createElement("a-entity");
    cam.setAttribute("camera", "");
    scene.appendChild(cam);

    document.body.appendChild(scene);
    log("🎬 Scene ready");

    marker.addEventListener("markerFound", function () {
      setStatus("appeared", { n: getF(_pokemon[_current], "name") });
    });
    marker.addEventListener("markerLost", function () {
      setStatus("point_camera");
    });

    setTimeout(hideLoader, 15000);
  }

  /* ============================================================
     SWITCH POKEMON
     ============================================================ */
  function switchPokemon(i) {
    _current = i;
    var p = _pokemon[i];
    log("🔄 → " + getF(p, "name"));

    document.getElementById("par-mdl").setAttribute("gltf-model-next", p.model);
    document.getElementById("par-ring").setAttribute("color", p.color);

    refreshInfoCard();
    setStatus("loading_name", { n: getF(p, "name") });

    document.querySelectorAll("#par-btns button").forEach(function (b, idx) {
      b.classList.toggle("active", idx === i);
    });

    resetPivot();
  }

  /* ============================================================
     CAMERA PERMISSION
     ============================================================ */
  async function requestCamera() {
    try {
      var stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      stream.getTracks().forEach(function (t) {
        t.stop();
      });
      log("📷 Camera OK");
      return true;
    } catch (e) {
      log("📷 Camera denied: " + e.message);
      return false;
    }
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  window.PokemonAR = {
    init: async function (opts) {
      if (!opts || !opts.pokemon || !opts.pokemon.length) {
        console.error("PokemonAR: need at least 1 pokemon");
        return;
      }

      _pokemon = opts.pokemon;
      _current = 0;
      _lang = opts.lang || "en";

      var rs = opts.scale || DEFAULTS.scale;
      _scale = typeof rs === "string" ? parseFloat(rs) || DEFAULTS.scale : rs;

      _config = {
        marker: opts.marker || DEFAULTS.marker,
        spinSpeed: opts.spinSpeed || DEFAULTS.spinSpeed,
        bobSpeed: opts.bobSpeed || DEFAULTS.bobSpeed,
        ringRadius: opts.ringRadius || DEFAULTS.ringRadius,
      };

      if (opts.maxCache) MAX_CACHE = opts.maxCache;

      injectMobileMeta();
      injectCSS();
      showLoader();

      log("🚀 v5 init | lang=" + _lang + " | pokemon=" + _pokemon.length);

      updateLoader(10, t("requesting_camera"));
      await requestCamera();

      updateLoader(30, t("loading_ar"));
      await loadDeps();

      updateLoader(65, t("building_ui"));
      buildButtons();
      buildControls();
      buildLangToggle();
      buildInfoCard();
      buildCaptureUI();

      updateLoader(80, t("loading_3d"));
      buildScene();
    },

    select: function (i) {
      switchPokemon(i);
    },
    current: function () {
      return _current;
    },
    resize: function (s) {
      _scale = s;
      changeScale(1);
    },
    spin: function (on) {
      if (on !== _spinning) toggleSpin();
    },
    setLang: function (l) {
      if (LANG_CYCLE.indexOf(l) > -1) {
        _lang = l;
        applyLang();
      }
    },
    resetAngle: resetPivot,
    capture: capturePhoto,
    cacheInfo: function () {
      return {
        cached: _cacheOrder.length,
        max: MAX_CACHE,
        urls: _cacheOrder.slice(),
      };
    },
  };
})();
