const countdown = document.querySelector("#countdown");
const now = new Date();
let target = new Date(now.getFullYear(), 9, 30, 17, 0, 0);

if (target <= now) {
    target = new Date(now.getFullYear() + 1, 9, 30, 17, 0, 0);
}

function updateCountdown() {
    const remaining = target.getTime() - Date.now();

    if (remaining <= 0) {
        countdown.textContent = "¡El festival ha comenzado!";
        clearInterval(timer);
        return;
    }

    const days = Math.floor(remaining / 86_400_000);
    const hours = String(Math.floor((remaining % 86_400_000) / 3_600_000)).padStart(2, "0");
    const minutes = String(Math.floor((remaining % 3_600_000) / 60_000)).padStart(2, "0");
    const seconds = String(Math.floor((remaining % 60_000) / 1_000)).padStart(2, "0");

    countdown.textContent =
        `Faltan ${days} días -  ${hours}, ${minutes}, ${seconds}.`;
}

const timer = setInterval(updateCountdown, 1_000);
updateCountdown();

const siteHeader = document.querySelector(".page-main > header");
const headerRevealZone = document.querySelector(".header-reveal-zone");
const compactHeaderBreakpoint = window.matchMedia(
    "(min-width: 769px) and (hover: hover) and (pointer: fine)"
);
let headerHideTimeout;
let pointerInHeader = false;
let pointerInRevealZone = false;
let headerHasFocus = false;

function updateHeaderSize() {
    const isScrolled = window.scrollY > 80;
    const canHideHeader = compactHeaderBreakpoint.matches && isScrolled;
    const isHidden =
        canHideHeader && !pointerInHeader && !pointerInRevealZone && !headerHasFocus;

    siteHeader.classList.toggle("is-compact", canHideHeader);
    siteHeader.classList.toggle("is-hidden", isHidden);
    headerRevealZone.classList.toggle("is-active", isHidden || pointerInRevealZone);
}

function cancelHeaderHide() {
    window.clearTimeout(headerHideTimeout);
}

function scheduleHeaderUpdate() {
    cancelHeaderHide();
    headerHideTimeout = window.setTimeout(updateHeaderSize, 250);
}

siteHeader.addEventListener("pointerenter", () => {
    pointerInHeader = true;
    cancelHeaderHide();
    updateHeaderSize();
});
siteHeader.addEventListener("pointerleave", () => {
    pointerInHeader = false;
    scheduleHeaderUpdate();
});
headerRevealZone.addEventListener("pointerenter", () => {
    pointerInRevealZone = true;
    cancelHeaderHide();
    updateHeaderSize();
});
headerRevealZone.addEventListener("pointerleave", () => {
    pointerInRevealZone = false;
    scheduleHeaderUpdate();
});
siteHeader.addEventListener("focusin", () => {
    headerHasFocus = true;
    updateHeaderSize();
});
siteHeader.addEventListener("focusout", () => {
    headerHasFocus = false;
    scheduleHeaderUpdate();
});
window.addEventListener("scroll", updateHeaderSize, { passive: true });
compactHeaderBreakpoint.addEventListener("change", updateHeaderSize);
updateHeaderSize();

import("./modules/mmd.js").catch((error) => {
    console.error("No se pudo habilitar el componente Markdown:", error);
    document.querySelectorAll("m-md").forEach((component) => {
        component.textContent = "No se pudo habilitar el componente Markdown.";
    });
});