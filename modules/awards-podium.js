const podiumPlaces = {
    1: { label: "1.er lugar · Oro", color: "#b4872e", height: "10rem" },
    2: { label: "2.º lugar · Plata", color: "#78828e", height: "7.5rem" },
    3: { label: "3.er lugar · Bronce", color: "#9b6040", height: "6rem" }
};

const altarPlaces = {
    1: { label: "1.er lugar", color: "#777267" },
    2: { label: "2.º lugar", color: "#837e73" },
    3: { label: "3.er lugar", color: "#8f897e" },
    4: { label: "4.º lugar", color: "#9b958a" },
    5: { label: "5.º lugar", color: "#a7a195" }
};

class PodiumPlace extends HTMLElement {
    connectedCallback() {
        const place = Number(this.getAttribute("place"));
        const hasAltars = this.closest("awards-podium")?.getAttribute("variant") === "altars";
        const details = (hasAltars ? altarPlaces : podiumPlaces)[place];

        if (!Number.isInteger(place) || !details) {
            this.hidden = true;
            console.warn(`podium-place requires place between 1 and ${hasAltars ? 5 : 3}.`);
            return;
        }

        if (this.shadowRoot) {
            return;
        }

        const root = this.attachShadow({ mode: "open" });
        root.innerHTML = `
            <link rel="stylesheet" href="${new URL("./awards-podium.css", import.meta.url).href}">
            <article class="place${hasAltars ? " place--altar" : ""}" aria-label="${details.label}">
                <header class="place-heading">
                    <span class="place-number" aria-hidden="true">0${place}</span>
                    <h3>${details.label}</h3>
                </header>
                <div class="place-stand">
                    <slot></slot>
                </div>
            </article>`;
        root.querySelector(".place").style.setProperty("--place-color", details.color);
        if (!hasAltars) {
            root.querySelector(".place-stand").style.setProperty("--stand-height", details.height);
        }
    }
}

class AwardsPodium extends HTMLElement {
    connectedCallback() {
        if (this.shadowRoot) {
            return;
        }

        const title = this.getAttribute("title") || "Clasificación";
        const hasAltars = this.getAttribute("variant") === "altars";
        const root = this.attachShadow({ mode: "open" });
        root.innerHTML = `
            <link rel="stylesheet" href="${new URL("./awards-podium.css", import.meta.url).href}">
            <section class="podium${hasAltars ? " awards-podium--altars" : ""}" aria-labelledby="podium-title">
                <p class="podium-eyebrow">Festival del Día de Muertos</p>
                <h2 id="podium-title"></h2>
                <div class="podium-places">
                    <slot></slot>
                </div>
            </section>`;
        root.querySelector("#podium-title").textContent = title;
    }
}

customElements.define("podium-place", PodiumPlace);
customElements.define("awards-podium", AwardsPodium);
