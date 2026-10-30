const EVENT_DATE = { year: 2026, month: 9, day: 30 };
const COUNTDOWN_HOUR = 17;
const AWARDS_AVAILABLE_HOUR = 19;
const POST_EVENT_CONTENT_HOUR = 22;
const MAX_TIMEOUT_DELAY = 2_147_000_000;

function createEventTime(hour) {
    return new Date(
        EVENT_DATE.year,
        EVENT_DATE.month,
        EVENT_DATE.day,
        hour
    );
}

function scheduleAt(target, callback) {
    const remaining = target.getTime() - Date.now();

    if (remaining <= 0) {
        callback();
        return;
    }

    window.setTimeout(
        () => scheduleAt(target, callback),
        Math.min(remaining, MAX_TIMEOUT_DELAY)
    );
}

function initializeCountdown() {
    const countdown = document.querySelector("#countdown");
    const now = new Date();
    let target = createEventTime(COUNTDOWN_HOUR);

    if (target <= now) {
        target = new Date(
            now.getFullYear() + 1,
            EVENT_DATE.month,
            EVENT_DATE.day,
            COUNTDOWN_HOUR
        );
    }

    function updateCountdown() {
        const remaining = target.getTime() - Date.now();

        if (remaining <= 0) {
            countdown.textContent = "¡El festival ha comenzado!";
            window.clearInterval(timer);
            return;
        }

        const days = Math.floor(remaining / 86_400_000);
        const hours = String(
            Math.floor((remaining % 86_400_000) / 3_600_000)
        ).padStart(2, "0");
        const minutes = String(
            Math.floor((remaining % 3_600_000) / 60_000)
        ).padStart(2, "0");
        const seconds = String(
            Math.floor((remaining % 60_000) / 1_000)
        ).padStart(2, "0");

        countdown.textContent = `Faltan ${days} días -  ${hours}, ${minutes}, ${seconds}.`;
    }

    const timer = window.setInterval(updateCountdown, 1_000);
    updateCountdown();
}

function initializeHeader() {
    const siteHeader = document.querySelector(".site-main > header");
    const revealZone = document.querySelector(".header-reveal-zone");
    const compactBreakpoint = window.matchMedia(
        "(min-width: 769px) and (hover: hover) and (pointer: fine)"
    );
    let hideTimeout;
    let pointerInHeader = false;
    let pointerInRevealZone = false;
    let headerHasFocus = false;

    function updateHeader() {
        const canHideHeader = compactBreakpoint.matches && window.scrollY > 80;
        const isHidden =
            canHideHeader &&
            !pointerInHeader &&
            !pointerInRevealZone &&
            !headerHasFocus;

        siteHeader.classList.toggle("is-compact", canHideHeader);
        siteHeader.classList.toggle("is-hidden", isHidden);
        revealZone.classList.toggle(
            "is-active",
            isHidden || pointerInRevealZone
        );
    }

    function cancelHide() {
        window.clearTimeout(hideTimeout);
    }

    function scheduleUpdate() {
        cancelHide();
        hideTimeout = window.setTimeout(updateHeader, 250);
    }

    siteHeader.addEventListener("pointerenter", () => {
        pointerInHeader = true;
        cancelHide();
        updateHeader();
    });
    siteHeader.addEventListener("pointerleave", () => {
        pointerInHeader = false;
        scheduleUpdate();
    });
    revealZone.addEventListener("pointerenter", () => {
        pointerInRevealZone = true;
        cancelHide();
        updateHeader();
    });
    revealZone.addEventListener("pointerleave", () => {
        pointerInRevealZone = false;
        scheduleUpdate();
    });
    siteHeader.addEventListener("focusin", () => {
        headerHasFocus = true;
        updateHeader();
    });
    siteHeader.addEventListener("focusout", () => {
        headerHasFocus = false;
        scheduleUpdate();
    });

    window.addEventListener("scroll", updateHeader, { passive: true });
    compactBreakpoint.addEventListener("change", updateHeader);
    updateHeader();
}

function initializeThemeToggle() {
    const themeToggle = document.querySelector("#theme-toggle");
    const themeIcon = themeToggle.querySelector("span");
    const themeRoot = document.documentElement;
    const systemPreference = window.matchMedia(
        "(prefers-color-scheme: dark)"
    );

    function updateThemeToggle() {
        const isDark = themeRoot.dataset.theme === "dark";
        const action = isDark
            ? "Activar modo claro"
            : "Activar modo oscuro";

        themeIcon.textContent = isDark ? "light_mode" : "dark_mode";
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
                console.error("Could not save the theme preference:", error);
            }
        }

        updateThemeToggle();
    }

    themeToggle.addEventListener("click", () => {
        const nextTheme =
            themeRoot.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(nextTheme, true);
    });

    systemPreference.addEventListener("change", (event) => {
        if (themeRoot.dataset.themeMode !== "manual") {
            applyTheme(event.matches ? "dark" : "light");
        }
    });

    updateThemeToggle();
}

function initializeAwardsMarquee() {
    const awardsMarquee = document.querySelector("#awards-marquee");
    scheduleAt(createEventTime(AWARDS_AVAILABLE_HOUR), () => {
        awardsMarquee.hidden = false;
    });
}

function initializePostEventContent() {
    const cutoff = createEventTime(POST_EVENT_CONTENT_HOUR);
    const postEventContent = document.querySelectorAll(
        "markdown-content[data-post-event-src]"
    );

    function switchToPostEventContent() {
        postEventContent.forEach((content) => {
            content.setAttribute(
                "src",
                content.getAttribute("data-post-event-src")
            );
        });
    }

    scheduleAt(cutoff, switchToPostEventContent);
}

function initializeDigitalAltar() {
    const altarForm = document.querySelector("#digital-altar-form");
    const petNameInput = document.querySelector("#digital-altar-pet-name");
    const petDisplay = document.querySelector("#digital-altar-pet-display");
    const altarMessage = document.querySelector("#digital-altar-message");
    const candleButton = document.querySelector("#digital-altar-candle");
    const altarArt = document.querySelector("#digital-altar-art");

    if (
        !altarForm ||
        !petNameInput ||
        !petDisplay ||
        !altarMessage ||
        !candleButton ||
        !altarArt
    ) {
        throw new Error("Could not initialize the digital altar: required elements are missing.");
    }

    altarForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const petName = petNameInput.value.trim();

        if (!petName) {
            altarMessage.textContent =
                "Escribe el nombre de tu mascota para dedicarle el recuerdo.";
            petNameInput.focus();
            return;
        }

        petDisplay.textContent = petName;
        altarMessage.textContent = `Este recuerdo es para ${petName}. Gracias por acompañarnos.`;
        petNameInput.value = "";
    });

    candleButton.addEventListener("click", () => {
        const isLit = candleButton.getAttribute("aria-pressed") !== "true";
        candleButton.setAttribute("aria-pressed", String(isLit));
        altarArt.classList.toggle("is-lit", isLit);
        candleButton.textContent = isLit
            ? "Apagar veladora"
            : "Encender veladora";
        candleButton.setAttribute(
            "aria-label",
            isLit ? "Apagar veladora virtual" : "Encender veladora virtual"
        );
    });
}

async function initializeContentComponents() {
    try {
        await Promise.all([
            import("./modules/markdown-content.js"),
            import("./modules/markdown-dialog.js")
        ]);
    } catch (error) {
        console.error("Could not load the content components:", error);
        document.querySelectorAll("markdown-content").forEach((component) => {
            component.textContent =
                "No se pudieron habilitar los componentes de contenido.";
        });
    }
}

async function initializeAwardsPodium() {
    try {
        await import("./modules/awards-podium.js");
    } catch (error) {
        console.error("Could not load the awards podium component:", error);
        const podium = document.querySelector("awards-podium");

        if (podium) {
            podium.textContent = "No se pudo habilitar el componente del podio.";
        }
    }
}

initializeCountdown();
initializeHeader();
initializeThemeToggle();
initializeAwardsMarquee();
initializePostEventContent();
initializeDigitalAltar();
initializeContentComponents();
initializeAwardsPodium();
