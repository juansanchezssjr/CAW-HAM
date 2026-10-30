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

const themeToggle = document.querySelector("#theme-toggle");
const themeIcon = themeToggle.querySelector("span");
const themeRoot = document.documentElement;
const systemThemePreference = window.matchMedia("(prefers-color-scheme: dark)");

function updateThemeToggle() {
    const isDark = themeRoot.dataset.theme === "dark";
    const action = isDark ? "Activar modo claro" : "Activar modo oscuro";

    themeIcon.textContent = isDark ? "☀" : "☾";
    themeToggle.setAttribute("aria-label", action);
    themeToggle.title = action;
}

function applyTheme(theme, savePreference = false) {
    themeRoot.dataset.theme = theme;

    if (savePreference) {
        themeRoot.dataset.themeMode = "manual";

        try {
            localStorage.setItem("ham-theme", theme);
        } catch (error) {
            console.error("No se pudo guardar la preferencia del tema:", error);
        }
    }

    updateThemeToggle();
}

themeToggle.addEventListener("click", () => {
    const nextTheme = themeRoot.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme, true);
});

systemThemePreference.addEventListener("change", (event) => {
    if (themeRoot.dataset.themeMode !== "manual") {
        applyTheme(event.matches ? "dark" : "light");
    }
});
updateThemeToggle();

const eventMarkdownCutoff = new Date(2026, 9, 30, 22, 0, 0);
const postEventMarkdown = document.querySelectorAll("m-md[data-post-event-src]");

function switchToPostEventMarkdown() {
    if (Date.now() < eventMarkdownCutoff.getTime()) {
        return false;
    }

    postEventMarkdown.forEach((markdownPage) => {
        markdownPage.setAttribute(
            "src",
            markdownPage.getAttribute("data-post-event-src")
        );
    });

    return true;
}

function schedulePostEventMarkdown() {
    const remaining = eventMarkdownCutoff.getTime() - Date.now();

    if (remaining <= 0) {
        switchToPostEventMarkdown();
        return;
    }

    window.setTimeout(schedulePostEventMarkdown, remaining);
}

if (!switchToPostEventMarkdown()) {
    schedulePostEventMarkdown();
}

const altarForm = document.querySelector("#altar-form");
const altarNameInput = document.querySelector("#altar-pet-name");
const altarPetDisplay = document.querySelector("#altar-pet-display");
const altarMessage = document.querySelector("#altar-message");
const altarCandleButton = document.querySelector("#altar-candle");
const altarArt = document.querySelector("#altar-art");

if (!altarForm || !altarNameInput || !altarPetDisplay || !altarMessage || !altarCandleButton || !altarArt) {
    throw new Error("No se pudo inicializar el altar digital: faltan elementos requeridos.");
}

altarForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const petName = altarNameInput.value.trim();

    if (!petName) {
        altarMessage.textContent = "Escribe el nombre de tu mascota para dedicarle el recuerdo.";
        altarNameInput.focus();
        return;
    }

    altarPetDisplay.textContent = petName;
    altarMessage.textContent = `Este recuerdo es para ${petName}. Gracias por acompañarnos.`;
    altarNameInput.value = "";
});

altarCandleButton.addEventListener("click", () => {
    const isLit = altarCandleButton.getAttribute("aria-pressed") !== "true";
    altarCandleButton.setAttribute("aria-pressed", String(isLit));
    altarArt.classList.toggle("is-lit", isLit);
    altarCandleButton.textContent = isLit ? "Apagar veladora" : "Encender veladora";
    altarCandleButton.setAttribute(
        "aria-label",
        isLit ? "Apagar veladora virtual" : "Encender veladora virtual"
    );
});

Promise.all([
    import("./modules/mmd.js"),
    import("./modules/modl.js")
]).catch((error) => {
    console.error("No se pudieron habilitar los componentes de contenido:", error);
    document.querySelectorAll("m-md").forEach((component) => {
        component.textContent = "No se pudieron habilitar los componentes de contenido.";
    });
});

import("./modules/mpod.js")
    .then(() => import("./modules/podium-results.js"))
    .then(({ loadPodiumResults }) => loadPodiumResults())
    .catch((error) => {
        console.error("No se pudo habilitar el podio y sus resultados:", error);
        const podium = document.querySelector("m-pod");
        if (podium) {
            podium.textContent = "No se pudo habilitar el podio del festival.";
        }
        const status = document.querySelector("#podios-status");
        if (status) {
            status.hidden = false;
            status.textContent = "No se pudieron habilitar los resultados del festival.";
        }
    });