(function () {
  var root = document.documentElement;
  var params = new URLSearchParams(window.location.search);

  function wrapHue(value) {
    var hue = Number(value);
    if (!Number.isFinite(hue)) {
      return 194;
    }
    return ((Math.round(hue) % 360) + 360) % 360;
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

  root.dataset.tokens = "ready";
})();
