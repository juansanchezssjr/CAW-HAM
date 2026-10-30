const podiumFile = new URL("../pages/podios.md", import.meta.url);
const winnerMarker = /<!--\s*winner:(catrinas|altares):(\d+)\s*-->/g;

function getField(block, field) {
    const match = block.match(new RegExp(`^\\*\\*${field}:\\*\\*\\s*(.*)$`, "m"));
    return match?.[1].trim() || "";
}

function parseWinners(markdown) {
    const markers = [...markdown.matchAll(winnerMarker)];

    return markers.map((marker, index) => {
        const start = marker.index + marker[0].length;
        const end = markers[index + 1]?.index ?? markdown.length;
        const block = markdown.slice(start, end);
        const image = block.match(/!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)/);

        return {
            category: marker[1],
            place: Number(marker[2]),
            name: getField(block, "Nombre"),
            team: getField(block, "Equipo"),
            description: getField(block, "Descripción"),
            imageAlt: image?.[1] || "",
            imageUrl: image?.[2] || ""
        };
    });
}

function createWinnerCard(winner) {
    const card = document.createElement("div");
    card.className = "winner-place";

    if (winner.imageUrl) {
        const image = document.createElement("img");
        image.src = winner.imageUrl;
        image.alt = winner.imageAlt || winner.name || "Fotografía de la propuesta ganadora";
        image.loading = "lazy";
        card.append(image);
    }

    if (winner.name) {
        const name = document.createElement("strong");
        name.className = "winner-place__name";
        name.textContent = winner.name;
        card.append(name);
    }

    if (winner.team) {
        const team = document.createElement("span");
        team.className = "winner-place__team";
        team.textContent = winner.team;
        card.append(team);
    }

    return card;
}

export async function loadPodiumResults() {
    const status = document.querySelector("#podios-status");

    try {
        const response = await fetch(podiumFile, { cache: "no-cache" });
        if (!response.ok) {
            throw new Error(`No se pudo cargar podios.md (HTTP ${response.status}).`);
        }

        const winners = parseWinners(await response.text());
        document.querySelectorAll("m-pod").forEach((podium) => {
            const category = podium.getAttribute("variant") === "altars"
                ? "altares"
                : "catrinas";

            podium.querySelectorAll("podium-place").forEach((place) => {
                const winner = winners.find(
                    (entry) =>
                        entry.category === category &&
                        entry.place === Number(place.getAttribute("place"))
                );

                if (winner) {
                    place.replaceChildren(createWinnerCard(winner));
                }
            });
        });
    } catch (error) {
        console.error("No se pudieron cargar los resultados del festival:", error);
        if (status) {
            status.hidden = false;
            status.textContent = "No se pudieron cargar los datos de los podios.";
        }
    }
}
