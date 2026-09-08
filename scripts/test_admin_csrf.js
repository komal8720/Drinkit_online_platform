require("dotenv").config({ path: "d:/NextGen-IT-Academy/Drinkit_online_platform/.env" });
const http = require("http");

const BASE_URL = "http://127.0.0.1:3000";

async function runTests() {
    console.log("================================================================");
    console.log("      DRINKIT ADMIN LOGIN & CSRF SECURITY VERIFICATION SUITE    ");
    console.log("================================================================\n");

    let passed = 0;
    let failed = 0;

    function assert(cond, name, details = "") {
        if (cond) {
            console.log(`  ✅ [PASS] ${name}`);
            passed++;
        } else {
            console.error(`  ❌ [FAIL] ${name} ${details ? "(" + details + ")" : ""}`);
            failed++;
        }
    }

    // Helper to send HTTP requests preserving or returning cookies
    async function doRequest(method, path, body = null, cookie = "", headers = {}) {
        const url = new URL(path, BASE_URL);
        const reqHeaders = { ...headers };
        if (cookie) {
            reqHeaders["Cookie"] = cookie;
        }

        let postData = null;
        if (body) {
            if (typeof body === "string") {
                postData = body;
                if (!reqHeaders["Content-Type"]) {
                    reqHeaders["Content-Type"] = "application/x-www-form-urlencoded";
                }
            } else if (typeof body === "object") {
                const params = new URLSearchParams();
                for (const [k, v] of Object.entries(body)) {
                    params.append(k, v);
                }
                postData = params.toString();
                if (!reqHeaders["Content-Type"]) {
                    reqHeaders["Content-Type"] = "application/x-www-form-urlencoded";
                }
            }
            reqHeaders["Content-Length"] = Buffer.byteLength(postData);
        }

        return new Promise((resolve, reject) => {
            const req = http.request(url, {
                method,
                headers: reqHeaders
            }, (res) => {
                let resData = "";
                res.on("data", (chunk) => resData += chunk);
                res.on("end", () => {
                    const rawSetCookie = res.headers["set-cookie"] || [];
                    const cookies = rawSetCookie.map(c => c.split(";")[0]);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: resData,
                        cookies,
                        firstCookie: cookies.length > 0 ? cookies[0] : ""
                    });
                });
            });

            req.on("error", (err) => reject(err));
            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }

    try {
        // -------------------------------------------------------------
        // TEST 1: GET /admin/login
        // -------------------------------------------------------------
        console.log("--- TEST 1: GET /admin/login ---");
        const getRes = await doRequest("GET", "/admin/login");
        assert(getRes.statusCode === 200, "GET /admin/login returns HTTP 200");
        assert(getRes.cookies.length > 0, "Session cookie (connect.sid) is issued on GET /admin/login");

        const sessionCookie = getRes.firstCookie;
        console.log(`      Session Cookie: ${sessionCookie}`);

        // Check for CSRF hidden input in HTML
        const csrfInputRegex = /<input[^>]*name=["']_csrf["'][^>]*value=["']([a-f0-9]{64})["']/i;
        const csrfMatch = getRes.body.match(csrfInputRegex);
        assert(csrfMatch !== null, "Rendered HTML contains <input name='_csrf'> with 64-char hex token");

        let csrfToken = csrfMatch ? csrfMatch[1] : null;
        console.log(`      Extracted CSRF Token: ${csrfToken}`);

        // -------------------------------------------------------------
        // TEST 2: POST /admin/login WITHOUT CSRF token
        // -------------------------------------------------------------
        console.log("\n--- TEST 2: POST /admin/login WITHOUT CSRF token (Security Check) ---");
        const noCsrfRes = await doRequest("POST", "/admin/login", {
            email: "rutwikghule07@gmail.com",
            password: "Rutwik@123"
        }, sessionCookie);
        assert(noCsrfRes.statusCode === 403, "Missing CSRF token returns HTTP 403 Forbidden");
        assert(
            noCsrfRes.body.includes("Action rejected: CSRF verification token is invalid or missing") ||
            noCsrfRes.body.includes("403 - Forbidden"),
            "Error page explicitly informs user of missing/invalid CSRF token"
        );

        // -------------------------------------------------------------
        // TEST 3: POST /admin/login WITH INVALID/TAMPERED CSRF token
        // -------------------------------------------------------------
        console.log("\n--- TEST 3: POST /admin/login WITH INVALID/TAMPERED CSRF token ---");
        const invalidCsrfRes = await doRequest("POST", "/admin/login", {
            _csrf: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            email: "rutwikghule07@gmail.com",
            password: "Rutwik@123"
        }, sessionCookie);
        assert(invalidCsrfRes.statusCode === 403, "Tampered CSRF token returns HTTP 403 Forbidden");
        assert(
            invalidCsrfRes.body.includes("Action rejected: CSRF token verification failed") ||
            invalidCsrfRes.body.includes("403 - Forbidden"),
            "Error page indicates CSRF verification failed"
        );

        // -------------------------------------------------------------
        // TEST 4: POST /admin/login WITH VALID CSRF but WRONG PASSWORD
        // -------------------------------------------------------------
        console.log("\n--- TEST 4: POST /admin/login WITH VALID CSRF but WRONG PASSWORD ---");
        const wrongPassRes = await doRequest("POST", "/admin/login", {
            _csrf: csrfToken,
            email: "rutwikghule07@gmail.com",
            password: "WrongPassword123!"
        }, sessionCookie);
        assert(wrongPassRes.statusCode === 200, "Invalid credentials returns HTTP 200 (re-render form)");
        assert(wrongPassRes.body.includes("Invalid email or password"), "Page displays error: 'Invalid email or password'");
        // Form should still contain valid CSRF token after re-render
        const reRenderMatch = wrongPassRes.body.match(csrfInputRegex);
        assert(reRenderMatch !== null, "Re-rendered form preserves CSRF token in <input name='_csrf'>");

        // -------------------------------------------------------------
        // TEST 5: POST /admin/login WITH VALID CSRF AND VALID SUPER ADMIN CREDENTIALS
        // -------------------------------------------------------------
        console.log("\n--- TEST 5: POST /admin/login WITH VALID CSRF AND VALID CREDENTIALS ---");
        const validLoginRes = await doRequest("POST", "/admin/login", {
            _csrf: csrfToken,
            email: "rutwikghule07@gmail.com",
            password: "Rutwik@123"
        }, sessionCookie);

        assert(validLoginRes.statusCode === 302, "Valid login returns HTTP 302 Redirect");
        assert(
            validLoginRes.headers["location"] === "/admin/dashboard",
            "Redirect target is '/admin/dashboard'",
            `Got: ${validLoginRes.headers["location"]}`
        );

        // Session fixation protection check: a new session cookie should be issued
        const authCookie = validLoginRes.firstCookie || sessionCookie;
        assert(validLoginRes.cookies.length > 0, "New session cookie issued on login (session fixation protection)");
        console.log(`      Authenticated Cookie: ${authCookie}`);

        // -------------------------------------------------------------
        // TEST 6: ACCESS PROTECTED /admin/dashboard WITH AUTHENTICATED SESSION
        // -------------------------------------------------------------
        console.log("\n--- TEST 6: ACCESS /admin/dashboard WITH AUTHENTICATED SESSION ---");
        const dashboardRes = await doRequest("GET", "/admin/dashboard", null, authCookie);
        assert(dashboardRes.statusCode === 200, "GET /admin/dashboard returns HTTP 200 OK");
        assert(
            dashboardRes.body.includes("Dashboard") && dashboardRes.body.includes("Admin"),
            "Dashboard page content successfully loaded"
        );

        // -------------------------------------------------------------
        // TEST 7: ACCESS SAFE GET ROUTES WITHOUT CSRF TOKENS
        // -------------------------------------------------------------
        console.log("\n--- TEST 7: SAFE GET ROUTES OPERATE NORMALLY ---");
        const vendorsRes = await doRequest("GET", "/admin/vendors", null, authCookie);
        assert(vendorsRes.statusCode === 200, "GET /admin/vendors returns HTTP 200 OK (no token required for GET)");

        const productsRes = await doRequest("GET", "/admin/products", null, authCookie);
        assert(productsRes.statusCode === 200, "GET /admin/products returns HTTP 200 OK (no token required for GET)");

        const ordersRes = await doRequest("GET", "/admin/orders", null, authCookie);
        assert(ordersRes.statusCode === 200, "GET /admin/orders returns HTTP 200 OK (no token required for GET)");

        // -------------------------------------------------------------
        // TEST 8: VERIFY CSRF ON STATE-CHANGING POST (ORDERS STATUS)
        // -------------------------------------------------------------
        console.log("\n--- TEST 8: STATE-CHANGING ADMIN POST CSRF ENFORCEMENT ---");
        const orderStatusNoCsrf = await doRequest("POST", "/admin/orders/5/status", {
            order_status: "delivered"
        }, authCookie);
        assert(orderStatusNoCsrf.statusCode === 403, "POST /admin/orders/5/status without CSRF token returns 403 Forbidden");

        // Extract CSRF token from /admin/orders
        const ordersPageCsrfMatch = ordersRes.body.match(csrfInputRegex);
        assert(ordersPageCsrfMatch !== null, "Admin orders page contains CSRF token in status form");
        const ordersCsrfToken = ordersPageCsrfMatch ? ordersPageCsrfMatch[1] : null;

        const orderStatusWithCsrf = await doRequest("POST", "/admin/orders/5/status", {
            _csrf: ordersCsrfToken,
            order_status: "pending"
        }, authCookie);
        assert(orderStatusWithCsrf.statusCode === 302, "POST /admin/orders/5/status with valid CSRF succeeds and redirects (302)");
        assert(orderStatusWithCsrf.headers["location"] === "/admin/orders", "Redirect target is /admin/orders");

        // -------------------------------------------------------------
        // TEST 9: ADMIN LOGOUT & SUBSEQUENT UNAUTHENTICATED ACCESS
        // -------------------------------------------------------------
        console.log("\n--- TEST 9: ADMIN LOGOUT ---");
        const logoutRes = await doRequest("GET", "/admin/logout", null, authCookie);
        assert(logoutRes.statusCode === 302, "GET /admin/logout redirects");
        assert(logoutRes.headers["location"] === "/admin/login", "Logout redirects to /admin/login");

        // Access dashboard again with logged out session
        const afterLogoutDash = await doRequest("GET", "/admin/dashboard", null, authCookie);
        assert(afterLogoutDash.statusCode === 302, "Unauthenticated access to dashboard redirected");
        assert(afterLogoutDash.headers["location"] === "/admin/login", "Redirect target is /admin/login");

        console.log("\n================================================================");
        console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
        console.log("================================================================\n");

        if (failed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }

    } catch (err) {
        console.error("❌ Test runner exception:", err);
        process.exit(1);
    }
}

runTests();
