/* ==========================================================
   DRINKIT HOME PAGE JAVASCRIPT
========================================================== */

$(document).ready(function () {

    /* ======================================================
       HERO LOAD ANIMATION
    ====================================================== */

    $(".hero-eyebrow").css({
        opacity: 0,
        transform: "translateY(20px)"
    });

    $(".hero-heading").css({
        opacity: 0,
        transform: "translateY(25px)"
    });

    $(".hero-description").css({
        opacity: 0,
        transform: "translateY(20px)"
    });

    $(".hero-actions").css({
        opacity: 0,
        transform: "translateY(20px)"
    });

    $(".hero-trust").css({
        opacity: 0,
        transform: "translateY(20px)"
    });

    setTimeout(function () {
        $(".hero-eyebrow").animate({
            opacity: 1
        }, 700);

        $(".hero-eyebrow").css(
            "transform",
            "translateY(0)"
        );
    }, 200);

    setTimeout(function () {
        $(".hero-heading").animate({
            opacity: 1
        }, 800);

        $(".hero-heading").css(
            "transform",
            "translateY(0)"
        );
    }, 400);

    setTimeout(function () {
        $(".hero-description").animate({
            opacity: 1
        }, 700);

        $(".hero-description").css(
            "transform",
            "translateY(0)"
        );
    }, 650);

    setTimeout(function () {
        $(".hero-actions").animate({
            opacity: 1
        }, 700);

        $(".hero-actions").css(
            "transform",
            "translateY(0)"
        );
    }, 850);

    setTimeout(function () {
        $(".hero-trust").animate({
            opacity: 1
        }, 700);

        $(".hero-trust").css(
            "transform",
            "translateY(0)"
        );
    }, 1050);


    /* ======================================================
       WISHLIST BUTTON
    ====================================================== */

    $(".wishlist-btn").on("click", function (event) {

        event.preventDefault();
        event.stopPropagation();

        const icon = $(this).find("i");

        icon.toggleClass("bi-heart");
        icon.toggleClass("bi-heart-fill");

        $(this).toggleClass("active");
    });


    /* ======================================================
       PRODUCT CARD HOVER
    ====================================================== */

    $(".product-card").on("mouseenter", function () {

        $(this)
            .find(".product-bottle i")
            .css(
                "transform",
                "translateY(-8px) scale(1.03)"
            );
    });

    $(".product-card").on("mouseleave", function () {

        $(this)
            .find(".product-bottle i")
            .css(
                "transform",
                "translateY(0) scale(1)"
            );
    });


    /* ======================================================
       SMOOTH SCROLL
    ====================================================== */

    $("a[href^='#']").on("click", function (event) {

        const target = $(this).attr("href");

        if (
            target !== "#" &&
            $(target).length
        ) {

            event.preventDefault();

            $("html, body").animate({
                scrollTop:
                    $(target).offset().top - 80
            }, 700);
        }
    });


    /* ======================================================
       SCROLL REVEAL
    ====================================================== */

    function revealOnScroll() {

        $(
            ".product-card, .why-card, .step-item, .testimonial-card"
        ).each(function () {

            const elementTop =
                $(this).offset().top;

            const windowBottom =
                $(window).scrollTop() +
                $(window).height();

            if (
                elementTop <
                windowBottom - 70
            ) {

                $(this).addClass("revealed");
            }
        });
    }

    $(window).on(
        "scroll",
        revealOnScroll
    );

    revealOnScroll();


    /* ======================================================
       NEWSLETTER
    ====================================================== */

    $("#newsletterForm").on(
        "submit",
        function (event) {

            event.preventDefault();

            const email =
                $(this)
                    .find("input[name='email']")
                    .val()
                    .trim();

            const message =
                $("#newsletterMessage");


            if (!email) {

                message
                    .text(
                        "Please enter your email address."
                    )
                    .css(
                        "color",
                        "#8f1733"
                    );

                return;
            }


            /* FIXED EMAIL REGEX */

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(email)
            ) {

                message
                    .text(
                        "Please enter a valid email address."
                    )
                    .css(
                        "color",
                        "#8f1733"
                    );

                return;
            }


            message
                .text(
                    "Thank you! You are now subscribed to Drinkit."
                )
                .css(
                    "color",
                    "#287443"
                );


            $(this)
                .find("input")
                .val("");
        }
    );


    /* ======================================================
       CATEGORY HOVER
    ====================================================== */

    $(".quick-category").on(
        "mouseenter",
        function () {

            $(this)
                .find(".quick-category-icon")
                .css(
                    "transform",
                    "scale(1.08)"
                );
        }
    );

    $(".quick-category").on(
        "mouseleave",
        function () {

            $(this)
                .find(".quick-category-icon")
                .css(
                    "transform",
                    "scale(1)"
                );
        }
    );


    /* ======================================================
       DRINK CATEGORY HOVER
    ====================================================== */

    $(".drink-type-card").on(
        "mouseenter",
        function () {

            $(this)
                .find(".drink-arrow, .drink-type-arrow")
                .css(
                    "transform",
                    "translate(4px,-4px)"
                );
        }
    );

    $(".drink-type-card").on(
        "mouseleave",
        function () {

            $(this)
                .find(".drink-arrow, .drink-type-arrow")
                .css(
                    "transform",
                    "translate(0,0)"
                );
        }
    );


    /* ======================================================
       COUNTER ANIMATION
    ====================================================== */

    function animateCounters() {

        $(".vendor-stats strong").each(
            function () {

                const element = $(this);

                if (
                    element.data("animated")
                ) {
                    return;
                }

                const top =
                    element.offset().top;

                const bottom =
                    $(window).scrollTop() +
                    $(window).height();

                if (
                    top < bottom - 50
                ) {

                    element.data(
                        "animated",
                        true
                    );

                    const text =
                        element.text();

                    const number =
                        parseInt(
                            text.replace(/\D/g, ""),
                            10
                        );

                    const suffix =
                        text.replace(
                            /[0-9]/g,
                            ""
                        );

                    let current = 0;

                    const duration = 1000;
                    const steps = 40;
                    const increment =
                        number / steps;

                    const timer =
                        setInterval(
                            function () {

                                current +=
                                    increment;

                                if (
                                    current >=
                                    number
                                ) {

                                    current =
                                        number;

                                    clearInterval(
                                        timer
                                    );
                                }

                                element.text(
                                    Math.floor(
                                        current
                                    ) +
                                    suffix
                                );

                            },
                            duration / steps
                        );
                }
            }
        );
    }

    $(window).on(
        "scroll",
        animateCounters
    );

    animateCounters();


    /* ======================================================
       PARALLAX HERO
    ====================================================== */

    $(window).on(
        "scroll",
        function () {

            const scrollTop =
                $(window).scrollTop();

            if (
                scrollTop < 800
            ) {

                $(".hero-background").css(
                    "transform",
                    "scale(1.02) translateY(" +
                    scrollTop * 0.12 +
                    "px)"
                );
            }
        }
    );


    /* ======================================================
       SCROLL TO EXPLORE
    ====================================================== */

    $(".hero-scroll").on(
        "click",
        function () {

            const section =
                $(".quick-category-section");

            if (section.length) {

                $("html, body").animate({
                    scrollTop:
                        section.offset().top
                }, 700);
            }
        }
    );


    /* ======================================================
       PREVENT EMPTY LINKS
    ====================================================== */

    $("a[href='#']").on(
        "click",
        function (event) {

            event.preventDefault();
        }
    );


    /* ======================================================
       PRODUCT IMAGE LOAD CHECK
    ====================================================== */

    $(".product-image").on(
        "error",
        function () {

            console.warn(
                "Drinkit product image could not be loaded:",
                $(this).attr("src")
            );
        }
    );


    /* ======================================================
       HERO IMAGE LOAD CHECK
    ====================================================== */

    $(".hero-wine-image").on(
        "error",
        function () {

            console.warn(
                "Drinkit hero wine image could not be loaded:",
                $(this).attr("src")
            );
        }
    );


    /* ======================================================
       INTRO IMAGE LOAD CHECK
    ====================================================== */

    $(".intro-main-img").on(
        "error",
        function () {

            console.warn(
                "Drinkit intro image could not be loaded:",
                $(this).attr("src")
            );
        }
    );


    /* ======================================================
       DRINK TYPE IMAGE LOAD CHECK
    ====================================================== */

    $(".drink-type-image").on(
        "error",
        function () {

            console.warn(
                "Drinkit drink type image could not be loaded:",
                $(this).attr("src")
            );
        }
    );

});