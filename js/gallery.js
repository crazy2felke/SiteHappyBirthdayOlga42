(function () {
  const done = localStorage.getItem("diamond-segment-complete") === "1";
  const lockScreen = document.getElementById("lockScreen");
  const galleryShell = document.getElementById("galleryShell");

  if (done) {
    document.body.classList.add("is-open");
    return;
  }

  document.body.classList.add("is-locked");
  if (lockScreen) lockScreen.hidden = false;
  if (galleryShell) galleryShell.hidden = true;
})();
