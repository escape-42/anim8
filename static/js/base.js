const toggle = document.getElementById("theme-toggle");
const knob = toggle.querySelector(".theme-toggle__knob");

function getStoredTheme() {
    return localStorage.getItem("anim8-theme") || "dark";
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    knob.textContent = theme === "light" ? "\u2600" : "\u263E";
    localStorage.setItem("anim8-theme", theme);
}

applyTheme(getStoredTheme());

toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
});

// --- Help Modal ---

const helpBtn     = document.getElementById("help-btn");
const helpOverlay = document.getElementById("help-overlay");
const helpClose   = document.getElementById("help-close");

helpBtn.addEventListener("click", () => {
    helpOverlay.hidden = false;
});

helpClose.addEventListener("click", () => {
    helpOverlay.hidden = true;
});

helpOverlay.addEventListener("click", (e) => {
    if (e.target === helpOverlay) helpOverlay.hidden = true;
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !helpOverlay.hidden) helpOverlay.hidden = true;
});
