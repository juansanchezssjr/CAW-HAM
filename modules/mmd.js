class MarkdownPage extends HTMLElement {
    static get observedAttributes() {
        return ["src", "path"];
    }

    constructor() {
        super();

        this.attachShadow({ mode: "open" });
        this.loadId = 0;
        this.hasConnected = false;
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    color: var(--fontMainColor);
                    font-family: var(--fontText);
                }

                .mmd-error {
                    max-width: 52rem;
                    margin: 0 auto;
                    padding: 1rem 1.25rem;
                    color: #a12222;
                    font-weight: 700;
                }
            </style>
            <link rel="stylesheet" href="${new URL("./mmd.css", import.meta.url).href}">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css">
            <div id="mmd" aria-live="polite">Cargando contenido...</div>
        `;

        this.content = this.shadowRoot.querySelector("#mmd");
    }

    async connectedCallback() {
        this.hasConnected = true;
        this.loadContent();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && this.hasConnected && this.isConnected) {
            this.loadContent();
        }
    }

    async loadContent() {
        const loadId = ++this.loadId;
        const path = this.getAttribute("src") || this.getAttribute("path");

        if (!path) {
            this.showError(new Error('Falta el atributo "src" con la ruta del archivo Markdown.'));
            return;
        }

        try {
            if (typeof window.markdownit !== "function") {
                throw new Error("markdown-it no está disponible.");
            }

            const response = await fetch(new URL(path, document.baseURI), { cache: "no-cache" });
            if (loadId !== this.loadId) {
                return;
            }

            if (!response.ok) {
                throw new Error(`No se pudo cargar "${path}" (HTTP ${response.status}).`);
            }

            const markdown = await response.text();
            if (loadId !== this.loadId) {
                return;
            }

            const parser = window.markdownit({
                html: true,
                linkify: true,
                typographer: true,
                highlight: (code, language) => {
                    if (window.hljs && language && window.hljs.getLanguage(language)) {
                        try {
                            const highlighted = window.hljs.highlight(code, {
                                language,
                                ignoreIllegals: true
                            }).value;
                            return `<pre class="hljs"><code>${highlighted}</code></pre>`;
                        } catch (error) {
                            console.error(`No se pudo resaltar el bloque "${language}":`, error);
                        }
                    }

                    return "";
                }
            });

            this.content.innerHTML = parser.render(markdown);
        } catch (error) {
            if (loadId === this.loadId) {
                this.showError(error);
            }
        }
    }

    showError(error) {
        console.error("Error al cargar el contenido Markdown:", error);
        this.content.className = "mmd-error";
        this.content.textContent = `No se pudo mostrar el contenido: ${error.message}`;
    }
}

customElements.define("m-md", MarkdownPage);
