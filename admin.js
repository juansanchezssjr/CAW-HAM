const GITHUB_OWNER = "juansanchezssjr";
const GITHUB_REPOSITORY = "CAW-HAM";
const GITHUB_BRANCH = "main";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPOSITORY}`;
const PODIUM_PATH = "pages/podios.md";
const AUTH_API_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8787"
    : "https://ham-admin-auth.sanchezs.workers.dev";
const WINNERS = [
    { category: "catrinas", place: 1, title: "Catrinas y catrines · 1.er lugar" },
    { category: "catrinas", place: 2, title: "Catrinas y catrines · 2.º lugar" },
    { category: "catrinas", place: 3, title: "Catrinas y catrines · 3.er lugar" },
    { category: "altares", place: 1, title: "Altares · 1.er lugar" },
    { category: "altares", place: 2, title: "Altares · 2.º lugar" },
    { category: "altares", place: 3, title: "Altares · 3.er lugar" },
    { category: "altares", place: 4, title: "Altares · 4.º lugar" },
    { category: "altares", place: 5, title: "Altares · 5.º lugar" }
];

let accessToken = null;
let deviceCode = null;
let pollTimer = 0;
let pollInterval = 5;
let deviceExpiresAt = 0;
let savedFiles = new Map();

const elements = {
    loginPanel: document.querySelector("#login-panel"),
    loginButton: document.querySelector("#github-login"),
    deviceFlow: document.querySelector("#device-flow"),
    deviceCode: document.querySelector("#device-code"),
    deviceLink: document.querySelector("#device-link"),
    cancelLogin: document.querySelector("#cancel-login"),
    loginStatus: document.querySelector("#login-status"),
    workspace: document.querySelector("#admin-workspace"),
    githubUser: document.querySelector("#github-user"),
    logoutButton: document.querySelector("#github-logout"),
    adminStatus: document.querySelector("#admin-status"),
    winnersForm: document.querySelector("#winners-form"),
    winnersIntro: document.querySelector("#winners-intro"),
    winnerEditors: document.querySelector("#winner-editors"),
    imageEditors: document.querySelector("#image-editors"),
    themeToggle: document.querySelector("#theme-toggle")
};

if (Object.values(elements).some((element) => !element)) {
    throw new Error("No se pudo inicializar la administración: faltan elementos requeridos.");
}

function setStatus(element, message, isError = false) {
    element.textContent = message;
    element.dataset.error = String(isError);
}

function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.dataset.theme === "dark";
    const nextTheme = isDark ? "light" : "dark";
    const action = nextTheme === "dark" ? "Activar modo oscuro" : "Activar modo claro";

    root.dataset.theme = nextTheme;
    root.dataset.themeMode = "manual";
    elements.themeToggle.querySelector("span").textContent = nextTheme === "dark" ? "☀" : "☾";
    elements.themeToggle.setAttribute("aria-label", action);
    elements.themeToggle.title = action;

    try {
        localStorage.setItem("ham-theme", nextTheme);
    } catch (error) {
        console.error("No se pudo guardar la preferencia del tema:", error);
    }
}

elements.themeToggle.addEventListener("click", toggleTheme);
{
    const isDark = document.documentElement.dataset.theme === "dark";
    const action = isDark ? "Activar modo claro" : "Activar modo oscuro";
    elements.themeToggle.querySelector("span").textContent = isDark ? "☀" : "☾";
    elements.themeToggle.setAttribute("aria-label", action);
    elements.themeToggle.title = action;
}

function getApiPath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
}

async function githubRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/vnd.github+json");
    headers.set("X-GitHub-Api-Version", "2022-11-28");
    headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(`${GITHUB_API}/${path}`, { ...options, headers });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
        const detail = result?.message || response.statusText;
        throw new Error(`GitHub respondió HTTP ${response.status}: ${detail}`);
    }

    return result;
}

function decodeContent(encoded) {
    const binary = atob(encoded.replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

function encodeContent(content) {
    const bytes = new TextEncoder().encode(content);
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
}

async function fetchFile(path) {
    const file = await githubRequest(`contents/${getApiPath(path)}?ref=${GITHUB_BRANCH}`);
    if (file.type !== "file" || file.encoding !== "base64") {
        throw new Error(`GitHub no devolvió el archivo esperado: ${path}`);
    }

    const record = {
        path: file.path,
        sha: file.sha,
        content: decodeContent(file.content)
    };
    savedFiles.set(path, record);
    return record;
}

async function saveFile(path, content, message) {
    const current = await fetchFile(path);
    if (current.content === content) {
        return false;
    }

    await githubRequest(`contents/${getApiPath(path)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message,
            content: encodeContent(content),
            sha: current.sha,
            branch: GITHUB_BRANCH
        })
    });
    savedFiles.set(path, { ...current, content });
    return true;
}

function createField(labelText, name, value, type = "text", maxLength = 180) {
    const label = document.createElement("label");
    label.className = "admin-field";
    label.textContent = labelText;

    const input = document.createElement("input");
    input.name = name;
    input.type = type;
    input.maxLength = maxLength;
    input.value = value;
    if (type === "url") {
        input.placeholder = "https://...";
        input.autocomplete = "url";
    } else {
        input.autocomplete = "off";
    }

    label.append(input);
    return label;
}

function parseWinners(markdown) {
    const markers = [...markdown.matchAll(/<!--\s*winner:(catrinas|altares):(\d+)\s*-->/g)];
    return new Map(markers.map((marker, index) => {
        const start = marker.index + marker[0].length;
        const end = markers[index + 1]?.index ?? markdown.length;
        const block = markdown.slice(start, end);
        const image = block.match(/!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)/);
        const getFieldValue = (field) =>
            block.match(new RegExp(`^\\*\\*${field}:\\*\\*\\s*(.*)$`, "m"))?.[1].trim() || "";

        return [
            `${marker[1]}:${marker[2]}`,
            {
                name: getFieldValue("Nombre"),
                team: getFieldValue("Equipo"),
                description: getFieldValue("Descripción"),
                photo: image?.[2] || ""
            }
        ];
    }));
}

function renderWinnerEditors(winners) {
    elements.winnerEditors.replaceChildren();

    WINNERS.forEach((winner) => {
        const values = winners.get(`${winner.category}:${winner.place}`) || {};
        const card = document.createElement("fieldset");
        card.className = "winner-editor";

        const title = document.createElement("legend");
        title.textContent = winner.title;
        card.append(title);
        card.append(
            createField("Nombre de la persona o equipo", "name", values.name || ""),
            createField("Grupo", "team", values.team || ""),
            createField("URL de la fotografía", "photo", values.photo || "", "url"),
            createField("Descripción breve", "description", values.description || "", "text", 300)
        );
        card.dataset.category = winner.category;
        card.dataset.place = String(winner.place);
        elements.winnerEditors.append(card);
    });
}

function readField(card, name) {
    return card.querySelector(`[name="${name}"]`).value.trim();
}

function escapeMarkdownText(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/([\\`*_{}\[\]()#+.!|])/g, "\\$1");
}

function normalizePhotoUrl(value, label) {
    if (!value) {
        return "";
    }

    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error(`${label}: escribe una URL completa que empiece con https://.`);
    }

    if (url.protocol !== "https:") {
        throw new Error(`${label}: por seguridad, las fotografías deben usar HTTPS.`);
    }

    return url.href.replace(/[()]/g, (character) =>
        character === "(" ? "%28" : "%29"
    );
}

function getPlaceTitle(category, place) {
    return WINNERS.find(
        (winner) => winner.category === category && winner.place === place
    ).title;
}

function serializePodiums() {
    const introduction = elements.winnersIntro.value.trim();
    const sections = [
        ["catrinas", "Clasificación de Catrinas y Catrines", 3],
        ["altares", "Altares destacados", 5]
    ];
    const lines = [
        "# Ganadores del festival",
        "",
        introduction
            ? introduction
                .replace(/\r\n/g, "\n")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
            : "Resultados del festival Huellitas al Mictlán."
    ];

    sections.forEach(([category, heading, count]) => {
        lines.push("", `## ${heading}`, "");
        for (let place = 1; place <= count; place += 1) {
            const card = elements.winnerEditors.querySelector(
                `[data-category="${category}"][data-place="${place}"]`
            );
            const label = getPlaceTitle(category, place).replace(/^.*·\s*/, "");
            const name = readField(card, "name") || "Por definir";
            const team = readField(card, "team") || "Por definir";
            const description = readField(card, "description") || "Sin descripción.";
            const photo = normalizePhotoUrl(readField(card, "photo"), label);

            lines.push(
                `<!-- winner:${category}:${place} -->`,
                `### ${label}`,
                `**Nombre:** ${escapeMarkdownText(name)}`,
                `**Equipo:** ${escapeMarkdownText(team)}`,
                `**Descripción:** ${escapeMarkdownText(description)}`
            );

            if (photo) {
                lines.push(`![Fotografía del ${label}](${photo})`);
            }
            lines.push("");
        }
    });

    return `${lines.join("\n").trimEnd()}\n`;
}

function renderImageEditors(imageFiles) {
    elements.imageEditors.replaceChildren();
    if (imageFiles.length === 0) {
        const message = document.createElement("p");
        message.textContent = "No se encontraron imágenes en los archivos Markdown de pages/.";
        elements.imageEditors.append(message);
        return;
    }

    imageFiles.forEach((image) => {
        const card = document.createElement("div");
        card.className = "image-editor";
        card.dataset.path = image.path;
        card.dataset.index = String(image.index);

        const preview = document.createElement("img");
        preview.src = image.url;
        preview.alt = image.alt || `Vista previa de ${image.path}`;
        preview.loading = "lazy";
        preview.addEventListener("error", () => {
            preview.alt = "No se pudo cargar la vista previa de esta URL.";
        });

        const label = document.createElement("label");
        label.className = "admin-field";
        label.textContent = "URL HTTPS de la fotografía";
        const input = document.createElement("input");
        input.type = "url";
        input.value = image.url;
        input.required = true;
        input.autocomplete = "url";
        input.setAttribute("aria-label", `URL de la imagen ${image.alt || image.path}`);
        label.append(input);

        const heading = document.createElement("p");
        heading.className = "image-editor__title";
        heading.textContent = image.alt || "Imagen sin descripción";
        const path = document.createElement("span");
        path.className = "image-editor__path";
        path.textContent = image.path;
        heading.append(path);

        const saveButton = document.createElement("button");
        saveButton.className = "admin-button";
        saveButton.type = "button";
        saveButton.dataset.saveImage = "true";
        saveButton.textContent = "Guardar esta imagen";

        card.append(preview, heading, label, saveButton);
        elements.imageEditors.append(card);
    });
}

function findMarkdownImages(markdown) {
    return [...markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)].map((match, index) => ({
        index,
        alt: match[1],
        url: match[2]
    }));
}

async function loadAdminContent() {
    setStatus(elements.adminStatus, "Cargando los archivos del repositorio...");
    const [podiums, directory] = await Promise.all([
        fetchFile(PODIUM_PATH),
        githubRequest(`contents/pages?ref=${GITHUB_BRANCH}`)
    ]);

    if (!Array.isArray(directory)) {
        throw new Error("GitHub no devolvió la carpeta pages/ esperada.");
    }

    const markdownFiles = directory.filter(
        (entry) =>
            entry.type === "file" &&
            entry.name.endsWith(".md") &&
            entry.path !== PODIUM_PATH
    );
    const files = await Promise.all(markdownFiles.map((entry) => fetchFile(entry.path)));
    const imageFiles = files.flatMap((file) =>
        findMarkdownImages(file.content).map((image) => ({
            ...image,
            path: file.path
        }))
    );

    const intro = podiums.content.match(
        /^# Ganadores del festival\s*\n+([\s\S]*?)(?=\n## Clasificación de Catrinas y Catrines)/
    );
    elements.winnersIntro.value = intro?.[1].trim() || "";
    renderWinnerEditors(parseWinners(podiums.content));
    renderImageEditors(imageFiles);
    setStatus(elements.adminStatus, `Archivos cargados. Rama: ${GITHUB_BRANCH}.`);
}

async function verifyAccountAndLoad() {
    const user = await githubRequest("user");
    if (user.login?.toLowerCase() !== GITHUB_OWNER.toLowerCase()) {
        throw new Error(`La cuenta @${GITHUB_OWNER} es la única autorizada para administrar este sitio.`);
    }

    const repository = await githubRequest("");
    if (repository.permissions?.push !== true) {
        throw new Error("La cuenta autenticada no tiene permiso de escritura en este repositorio.");
    }

    elements.githubUser.textContent = `@${user.login}`;
    elements.loginPanel.hidden = true;
    elements.workspace.hidden = false;
    await loadAdminContent();
}

function stopDeviceFlow() {
    window.clearTimeout(pollTimer);
    pollTimer = 0;
    deviceCode = null;
    elements.deviceFlow.hidden = true;
    elements.loginButton.disabled = false;
}

async function pollForAuthorization() {
    if (!deviceCode) {
        return;
    }
    if (Date.now() >= deviceExpiresAt) {
        stopDeviceFlow();
        setStatus(elements.loginStatus, "El código expiró. Inicia el acceso de nuevo.", true);
        return;
    }

    try {
        const response = await fetch(`${AUTH_API_BASE}/access_token`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({ device_code: deviceCode })
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(`GitHub respondió HTTP ${response.status}.`);
        }

        if (result.access_token) {
            accessToken = result.access_token;
            stopDeviceFlow();
            await verifyAccountAndLoad();
            setStatus(elements.loginStatus, "");
            return;
        }

        if (result.error === "authorization_pending") {
            setStatus(elements.loginStatus, "Esperando a que confirmes el acceso en GitHub...");
        } else if (result.error === "slow_down") {
            pollInterval += 5;
        } else if (result.error === "access_denied") {
            stopDeviceFlow();
            setStatus(elements.loginStatus, "Se canceló la autorización en GitHub.", true);
            return;
        } else if (result.error === "expired_token") {
            stopDeviceFlow();
            setStatus(elements.loginStatus, "El código expiró. Inicia el acceso de nuevo.", true);
            return;
        } else {
            throw new Error(result.error_description || result.error || "Respuesta de autorización inesperada.");
        }

        pollTimer = window.setTimeout(pollForAuthorization, pollInterval * 1_000);
    } catch (error) {
        console.error("No se pudo completar el acceso con GitHub:", error);
        stopDeviceFlow();
        setStatus(elements.loginStatus, error.message, true);
        accessToken = null;
    }
}

async function startDeviceFlow() {
    elements.loginButton.disabled = true;
    setStatus(elements.loginStatus, "Solicitando un código a GitHub...");

    try {
        const response = await fetch(`${AUTH_API_BASE}/device/code`, {
            method: "POST",
            headers: { Accept: "application/json" }
        });
        const result = await response.json();

        if (!response.ok || !result.device_code || !result.user_code) {
            throw new Error(
                result.error_description ||
                result.error ||
                `GitHub respondió HTTP ${response.status} al solicitar el código.`
            );
        }

        deviceCode = result.device_code;
        pollInterval = Math.max(5, Number(result.interval) || 5);
        deviceExpiresAt = Date.now() + (Number(result.expires_in) || 900) * 1_000;
        elements.deviceCode.textContent = result.user_code;
        elements.deviceCode.href = result.verification_uri || "https://github.com/login/device";
        elements.deviceLink.href = result.verification_uri || "https://github.com/login/device";
        elements.deviceFlow.hidden = false;
        setStatus(elements.loginStatus, "El código es de un solo uso y caduca pronto.");
        pollTimer = window.setTimeout(pollForAuthorization, pollInterval * 1_000);
    } catch (error) {
        console.error("No se pudo iniciar el acceso con GitHub:", error);
        elements.loginButton.disabled = false;
        setStatus(
            elements.loginStatus,
            `${error.message} Comprueba que el Worker auxiliar esté desplegado y que Device Flow esté habilitado en la OAuth App.`,
            true
        );
    }
}

function replaceMarkdownImage(content, index, url) {
    let currentIndex = 0;
    let replaced = false;
    const updated = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (image, alt) => {
        if (currentIndex === index) {
            replaced = true;
            return `![${alt}](${url})`;
        }
        currentIndex += 1;
        return image;
    });

    if (!replaced) {
        throw new Error("La imagen cambió desde que se cargó el panel. Recarga los archivos e inténtalo de nuevo.");
    }
    return updated;
}

elements.loginButton.addEventListener("click", startDeviceFlow);
elements.cancelLogin.addEventListener("click", () => {
    stopDeviceFlow();
    setStatus(elements.loginStatus, "Acceso cancelado.");
});

elements.logoutButton.addEventListener("click", () => {
    stopDeviceFlow();
    accessToken = null;
    savedFiles.clear();
    elements.workspace.hidden = true;
    elements.loginPanel.hidden = false;
    setStatus(elements.adminStatus, "");
    setStatus(elements.loginStatus, "Sesión cerrada. La autorización del dispositivo no se guardó.");
});

elements.winnersForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = elements.winnersForm.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
        const content = serializePodiums();
        const changed = await saveFile(
            PODIUM_PATH,
            content,
            "Actualizar resultados y ganadores del festival"
        );
        setStatus(
            elements.adminStatus,
            changed ? "Resultados guardados en GitHub." : "Los resultados no cambiaron; no se creó un commit."
        );
    } catch (error) {
        console.error("No se pudieron guardar los resultados:", error);
        setStatus(elements.adminStatus, error.message, true);
    } finally {
        button.disabled = false;
    }
});

elements.imageEditors.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-save-image]");
    if (!button) {
        return;
    }

    const card = button.closest(".image-editor");
    const input = card.querySelector('input[type="url"]');
    const preview = card.querySelector("img");
    button.disabled = true;

    try {
        if (!input.reportValidity()) {
            return;
        }

        const url = normalizePhotoUrl(input.value.trim(), card.dataset.path);
        const file = await fetchFile(card.dataset.path);
        const content = replaceMarkdownImage(file.content, Number(card.dataset.index), url);
        const changed = await saveFile(
            card.dataset.path,
            content,
            `Actualizar fotografía en ${card.dataset.path}`
        );
        preview.src = url;
        setStatus(
            elements.adminStatus,
            changed ? `Fotografía guardada en ${card.dataset.path}.` : "La URL no cambió; no se creó un commit."
        );
    } catch (error) {
        console.error("No se pudo guardar la imagen:", error);
        setStatus(elements.adminStatus, error.message, true);
    } finally {
        button.disabled = false;
    }
});
