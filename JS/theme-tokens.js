(function () {
  var root = document.documentElement;
  var params = new URLSearchParams(window.location.search);
  var storageKey = "meghna-site-theme";

  function wrapHue(value) {
    var hue = Number(value);
    if (!Number.isFinite(hue)) {
      return 194;
    }
    return ((Math.round(hue) % 360) + 360) % 360;
  }

  function getStoredTheme() {
    try {
      return window.localStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }
  }

  function getPreferredTheme() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }

    return "light";
  }

  function normalizeTheme(value) {
    return value === "dark" || value === "light" ? value : null;
  }

  function setTheme(theme, persist) {
    var nextTheme = normalizeTheme(theme) || "light";
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;

    if (persist) {
      try {
        window.localStorage.setItem(storageKey, nextTheme);
      } catch (error) {
        return;
      }
    }
  }

  var baseHue = wrapHue(root.dataset.hue || params.get("hue") || 194);
  var hues = {
    "--hue": baseHue,
    "--hue-cool": wrapHue(baseHue + 24),
    "--hue-warm": wrapHue(baseHue + 194),
    "--hue-leaf": wrapHue(baseHue - 82),
    "--hue-rose": wrapHue(baseHue + 154)
  };

  Object.keys(hues).forEach(function (name) {
    root.style.setProperty(name, hues[name]);
  });

  setTheme(normalizeTheme(params.get("theme")) || normalizeTheme(getStoredTheme()) || getPreferredTheme(), false);

  window.siteTheme = {
    current: function () {
      return root.dataset.theme === "dark" ? "dark" : "light";
    },
    set: function (theme) {
      setTheme(theme, true);
      window.dispatchEvent(new CustomEvent("site-theme-change", { detail: { theme: root.dataset.theme } }));
    },
    toggle: function () {
      this.set(this.current() === "dark" ? "light" : "dark");
    }
  };

  root.dataset.tokens = "ready";
})();
