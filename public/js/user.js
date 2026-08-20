/* ==========================================================
   DRINKIT USER JAVASCRIPT
========================================================== */

$(document).ready(function () {


    // ======================================================
    // SEARCH OPEN
    // ======================================================

    $("#openSearch").on("click", function () {

        $("#searchOverlay")
            .addClass("active");

        setTimeout(function () {

            $("#navbarSearch").trigger("focus");

        }, 200);

    });


    // ======================================================
    // SEARCH CLOSE
    // ======================================================

    $("#closeSearch").on("click", function () {

        $("#searchOverlay")
            .removeClass("active");

    });


    // ======================================================
    // CLOSE SEARCH USING ESCAPE
    // ======================================================

    $(document).on("keydown", function (event) {

        if (event.key === "Escape") {

            $("#searchOverlay")
                .removeClass("active");

        }

    });


    // ======================================================
    // CLICK OUTSIDE SEARCH
    // ======================================================

    $("#searchOverlay").on("click", function (event) {

        if ($(event.target).is("#searchOverlay")) {

            $("#searchOverlay")
                .removeClass("active");

        }

    });


    // ======================================================
    // NAVBAR SCROLL EFFECT
    // ======================================================

    $(window).on("scroll", function () {

        if ($(window).scrollTop() > 20) {

            $(".drinkit-navbar")
                .addClass("navbar-scrolled");

        } else {

            $(".drinkit-navbar")
                .removeClass("navbar-scrolled");

        }

    });


});