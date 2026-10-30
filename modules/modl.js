class MarkdownModal extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${new URL("./modl.css", import.meta.url).href}">
            <button class="trigger" type="button"><slot>Abrir contenido</slot></button>
            <dialog aria-label="Contenido Markdown">
                <header>
                    <button class="close" type="button" aria-label="Cerrar ventana modal">×</button>
                </header>
                <main><slot name="content"></slot></main>
            </dialog>
        `;

        this.dialog = this.shadowRoot.querySelector("dialog");
        this.triggerButton = this.shadowRoot.querySelector(".trigger");
        this.closeButton = this.shadowRoot.querySelector(".close");

        this.triggerButton.addEventListener("click", () => this.show());
        this.closeButton.addEventListener("click", () => this.hide());
    }

    connectedCallback() {
        const content = [...this.children].some((child) => child.slot === "content");
        if (!content) {
            this.triggerButton.disabled = true;
            this.triggerButton.title = 'Agrega contenido con slot="content".';
        }
    }

    show() {
        if (!this.dialog.open) {
            this.dialog.showModal();
        }
    }

    hide() {
        if (this.dialog.open) {
            this.dialog.close();
        }
    }
}

customElements.define("m-modl", MarkdownModal);