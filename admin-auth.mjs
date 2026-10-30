const GITHUB_CLIENT_ID = "Ov23liDoD5xQeSnFxE2i";
const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const ALLOWED_ORIGINS = new Set([
    "https://ham.sanchezs.workers.dev",
    "http://127.0.0.1:8765",
    "http://localhost:8765"
]);
const MAX_REQUEST_SIZE = 2_048;

function jsonResponse(body, status, origin) {
    const headers = new Headers({
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        Vary: "Origin"
    });

    if (origin && ALLOWED_ORIGINS.has(origin)) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Accept, Content-Type");
        headers.set("Access-Control-Max-Age", "86400");
    }

    return new Response(JSON.stringify(body), { status, headers });
}

async function forwardToGitHub(url, parameters, origin) {
    let response;
    try {
        response = await fetch(url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: parameters
        });
    } catch (error) {
        console.error("GitHub OAuth upstream request failed:", error);
        return jsonResponse({ error: "authorization_service_unavailable" }, 502, origin);
    }

    return new Response(response.body, {
        status: response.status,
        headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Accept, Content-Type",
            "Access-Control-Max-Age": "86400",
            Vary: "Origin"
        }
    });
}

export default {
    async fetch(request) {
        const origin = request.headers.get("Origin");
        if (!origin || !ALLOWED_ORIGINS.has(origin)) {
            return jsonResponse({ error: "origin_not_allowed" }, 403, origin);
        }

        const { pathname } = new URL(request.url);
        if (request.method === "OPTIONS") {
            if (pathname !== "/device/code" && pathname !== "/access_token") {
                return jsonResponse({ error: "not_found" }, 404, origin);
            }
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Accept, Content-Type",
                    "Access-Control-Max-Age": "86400",
                    "Cache-Control": "no-store",
                    Vary: "Origin"
                }
            });
        }

        if (request.method !== "POST") {
            return jsonResponse({ error: "method_not_allowed" }, 405, origin);
        }

        const contentLength = Number(request.headers.get("Content-Length") || 0);
        if (contentLength > MAX_REQUEST_SIZE) {
            return jsonResponse({ error: "request_too_large" }, 413, origin);
        }

        if (pathname === "/device/code") {
            const parameters = new URLSearchParams({
                client_id: GITHUB_CLIENT_ID,
                scope: "public_repo"
            });
            return forwardToGitHub(GITHUB_DEVICE_CODE_URL, parameters, origin);
        }

        if (pathname === "/access_token") {
            const body = await request.text();
            if (body.length > MAX_REQUEST_SIZE) {
                return jsonResponse({ error: "request_too_large" }, 413, origin);
            }

            const deviceCode = new URLSearchParams(body).get("device_code")?.trim();
            if (!deviceCode || deviceCode.length > 1_024 || /\s/.test(deviceCode)) {
                return jsonResponse({ error: "invalid_device_code" }, 400, origin);
            }

            const parameters = new URLSearchParams({
                client_id: GITHUB_CLIENT_ID,
                device_code: deviceCode,
                grant_type: "urn:ietf:params:oauth:grant-type:device_code"
            });
            return forwardToGitHub(GITHUB_ACCESS_TOKEN_URL, parameters, origin);
        }

        return jsonResponse({ error: "not_found" }, 404, origin);
    }
};
