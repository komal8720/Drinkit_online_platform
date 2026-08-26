// ==========================================================
// DRINKIT - MULTI VENDOR BEVERAGE DELIVERY PLATFORM
// Main Server File
// ==========================================================

require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const fs = require("fs");
const { pool, testConnection } = require("./config/db");

// Load translation files
const locales = {
    en: JSON.parse(fs.readFileSync(path.join(__dirname, "locales/en.json"), "utf8")),
    mr: JSON.parse(fs.readFileSync(path.join(__dirname, "locales/mr.json"), "utf8")),
    hi: JSON.parse(fs.readFileSync(path.join(__dirname, "locales/hi.json"), "utf8"))
};

const app = express();


// ==========================================================
// ENVIRONMENT CONFIGURATION
// ==========================================================

const PORT = process.env.PORT || 3000;


// ==========================================================
// SECURITY MIDDLEWARE
// ==========================================================

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);


// ==========================================================
// CORS
// ==========================================================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);


// ==========================================================
// LOGGING
// ==========================================================

if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}


// ==========================================================
// BODY PARSER
// ==========================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// ==========================================================
// STATIC FILES
// ==========================================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ==========================================================
// SESSION
// ==========================================================

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "drinkit_default_secret_change_this",

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            secure:
                process.env.NODE_ENV === "production",

            maxAge: 1000 * 60 * 60 * 24
        }
    })
);


// ==========================================================
// FLASH MESSAGES
// ==========================================================

app.use(flash());


// ==========================================================
// GLOBAL VARIABLES FOR EJS
// ==========================================================

app.use(async (req, res, next) => {

    res.locals.success = req.flash("success");

    res.locals.error = req.flash("error");

    res.locals.user =
        req.session.user || null;

    res.locals.appName =
        process.env.APP_NAME || "Drinkit";

    // Set selected location
    res.locals.selectedLocation = req.session.location || "Nagar, Maharashtra";

    // Set current language and translation helper
    let lang = req.query.lang || req.session.lang || "en";
    if (!locales[lang]) {
        lang = "en";
    }
    req.session.lang = lang;
    res.locals.currentLang = lang.toUpperCase();
    res.locals.langCode = lang;
    res.locals.__ = (key) => {
        return locales[lang][key] || locales["en"][key] || key;
    };

    // Fetch dynamic cart count for logged-in user
    let cartCount = 0;
    if (req.session.user) {
        try {
            const [cartRows] = await pool.query(
                `SELECT SUM(ci.quantity) as count 
                 FROM carts c 
                 JOIN cart_items ci ON c.id = ci.cart_id 
                 WHERE c.user_id = ?`,
                [req.session.user.id]
            );
            cartCount = cartRows[0].count || 0;
        } catch (err) {
            try {
                const [flatCartRows] = await pool.query(
                    `SELECT SUM(quantity) as count FROM cart WHERE user_id = ?`,
                    [req.session.user.id]
                );
                cartCount = flatCartRows[0].count || 0;
            } catch (flatErr) {
                console.error("Error fetching cart count:", flatErr);
            }
        }
    }
    res.locals.cartCount = Number(cartCount);

    next();

});


// ==========================================================
// VIEW ENGINE
// ==========================================================

app.set("view engine", "ejs");

app.set(
    "views",
    path.join(__dirname, "views")
);





// ==========================================================
// ROUTES
// ==========================================================

const userRouter = require("./routes/userRouter");
const authRouter = require("./routes/auth");
const adminRoutes = require("./routes/admin");
app.use("/", userRouter);
app.use("/auth", authRouter);
app.use("/admin", adminRoutes);


// ==========================================================
// USER SIDE - HOME ROUTE
// ==========================================================

app.get("/", (req, res) => {

    res.render("user/home", {

        title:
            "Drinkit - Beverage Delivery Platform"

    });

});


// ==========================================================
// HEALTH CHECK
// ==========================================================

app.get("/health", async (req, res) => {

    res.status(200).json({

        success: true,

        application: "Drinkit",

        status: "running",

        environment:
            process.env.NODE_ENV

    });

});


// ==========================================================
// 404 HANDLER
// ==========================================================

app.use((req, res) => {

    res.status(404).render("user/404", {

        title: "404 - Page Not Found"

    });

});


// ==========================================================
// GLOBAL ERROR HANDLER
// ==========================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "❌ Application Error:"
        );

        console.error(err);


        res.status(500).render(
            "user/500",
            {
                title:
                    "500 - Internal Server Error"
            }
        );

    }
);


// ==========================================================
// START SERVER
// ==========================================================

async function startServer() {

    try {

        // Test MySQL connection
        await testConnection();


        // Start Express Server
        app.listen(
            PORT,
            () => {

                console.log("");

                console.log(
                    "=========================================="
                );

                console.log(
                    "🚀 DRINKIT SERVER STARTED"
                );

                console.log(
                    "=========================================="
                );

                console.log(
                    `🌐 URL: http://localhost:${PORT}`
                );

                console.log(
                    `🏠 Home: http://localhost:${PORT}/`
                );

                console.log(
                    `❤️ Health: http://localhost:${PORT}/health`
                );

                console.log(
                    "=========================================="
                );

                console.log("");

            }
        );

    } catch (error) {

        console.error(
            "❌ Failed to start Drinkit server:",
            error.message
        );

        process.exit(1);

    }

}


// ==========================================================
// RUN SERVER
// ==========================================================

startServer();