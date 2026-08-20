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

const { testConnection } = require("./config/db");

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

app.use((req, res, next) => {

    res.locals.success = req.flash("success");

    res.locals.error = req.flash("error");

    res.locals.user =
        req.session.user || null;

    res.locals.appName =
        process.env.APP_NAME || "Drinkit";

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
// STATIC FILES
// ==========================================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


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