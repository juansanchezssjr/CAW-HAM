class MarkdownContent extends HTMLElement {
    static get observedAttributes() {
        return ["src", "path"];
    }

    constructor() {
        super();

        this.attachShadow({ mode: "open" });
        this.requestId = 0;
        this.isInitialized = false;
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    color: var(--fontMainColor);
                    font-family: var(--fontText);
                }

                .markdown-error {
                    max-width: 52rem;
                    margin: 0 auto;
                    padding: 1rem 1.25rem;
                    color: #a12222;
                    font-weight: 700;
                }
            </style>
            <link rel="stylesheet" href="${new URL("./markdown-content.css", import.meta.url).href}">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css">
            <div id="markdown-content" aria-live="polite">Cargando contenido...</div>
        `;

        this.markdownContent = this.shadowRoot.querySelector("#markdown-content");
    }

    async connectedCallback() {
        this.isInitialized = true;
        this.loadMarkdown();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && this.isInitialized && this.isConnected) {
            this.loadMarkdown();
        }
    }

    async loadMarkdown() {
        const requestId = ++this.requestId;
        const path = this.getAttribute("src") || this.getAttribute("path");

        if (!path) {
            this.renderError(new Error('Missing required "src" attribute for the Markdown file.'));
            return;
        }

        try {
            if (typeof window.markdownit !== "function") {
                throw new Error("markdown-it is unavailable.");
            }

            const response = await fetch(new URL(path, document.baseURI));
            if (requestId !== this.requestId) {
                return;
            }

            if (!response.ok) {
                throw new Error(`Could not load "${path}" (HTTP ${response.status}).`);
            }

            const markdown = await response.text();
            if (requestId !== this.requestId) {
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
                            console.error(`Could not highlight the "${language}" code block:`, error);
                        }
                    }

                    return "";
                }
            });

            this.markdownContent.innerHTML = parser.render(markdown);
        } catch (error) {
            if (requestId === this.requestId) {
                this.renderError(error);
            }
        }
    }

    renderError(error) {
        console.error("Could not load Markdown content:", error);
        this.markdownContent.className = "markdown-error";
        this.markdownContent.textContent = `No se pudo mostrar el contenido: ${error.message}`;
    }
}

customElements.define("markdown-content", MarkdownContent);
