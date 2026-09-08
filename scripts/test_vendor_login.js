const http = require("http");

function doRequest(method, path, body = null, cookie = "") {
    return new Promise((resolve, reject) => {
        const u = new URL(path, "http://127.0.0.1:3000");
        const headers = {};
        if (cookie) headers["Cookie"] = cookie;
        if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";

        const req = http.request(u, { method, headers }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve({
                status: res.statusCode,
                headers: res.headers,
                body: data,
                cookie: res.headers["set-cookie"] ? res.headers["set-cookie"][0].split(";")[0] : ""
            }));
        });
        req.on("error", reject);
        if (body) req.write(body);
        req.end();
    });
}

async function test() {
    console.log("1. Fetching /vendor/login...");
    const getRes = await doRequest("GET", "/vendor/login");
    console.log("   Status:", getRes.status);
    const cookie = getRes.cookie;

    const csrfMatch = getRes.body.match(/name="_csrf" value="([a-f0-9]+)"/i) || getRes.body.match(/value="([a-f0-9]{64})"/i);
    const csrfToken = csrfMatch ? csrfMatch[1] : "";
    console.log("   CSRF Token found:", csrfToken ? "YES (" + csrfToken.substring(0, 10) + "...)" : "NO");

    console.log("2. Submitting login with shop@drinkit.com / Vendor@123...");
    const postBody = new URLSearchParams({
        _csrf: csrfToken,
        identifier: "shop@drinkit.com",
        password: "Vendor@123"
    }).toString();

    const postRes = await doRequest("POST", "/vendor/login", postBody, cookie);
    console.log("   Status:", postRes.status);
    console.log("   Location:", postRes.headers.location);

    const authCookie = postRes.cookie || cookie;

    console.log("3. Accessing /vendor/dashboard...");
    const dashRes = await doRequest("GET", "/vendor/dashboard", null, authCookie);
    console.log("   Dashboard Status:", dashRes.status);
    console.log("   Contains 'Drinkit Shop':", dashRes.body.includes("Drinkit Shop"));
    console.log("   Contains 'Vendor Portal':", dashRes.body.includes("Vendor Portal") || dashRes.body.includes("Dashboard"));

    if (dashRes.status === 200) {
        console.log("\n🎉 VENDOR DASHBOARD ACCESSED SUCCESSFULLY!");
    } else {
        console.log("\n❌ Failed to access dashboard.");
    }
}

test();
