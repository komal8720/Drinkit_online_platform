$(document).ready(function () {
    // 1. Helper to display floating red toast error alerts
    function showToast(message) {
        let toast = $(".cart-toast");
        if (toast.length === 0) {
            toast = $('<div class="cart-toast" style="position: fixed; bottom: 20px; right: 20px; background-color: #dc3545; color: #ffffff; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.25); z-index: 10000; font-weight: 600; display: none; font-family: sans-serif;"></div>');
            $("body").append(toast);
        }
        toast.text(message).fadeIn().delay(3000).fadeOut();
    }

    // 2. Helper to replace ADD button with quantity control
    function replaceAddButtonWithControl(btn, quantity) {
        const productId = btn.data("product-id");
        if (!productId) return;

        // Save original HTML as data if not already saved
        if (!btn.data("original-html")) {
            btn.data("original-html", btn[0].outerHTML);
        }

        const control = $(`
            <div class="product-quantity-control" data-product-id="${productId}">
                <button class="qty-minus" aria-label="Decrease quantity" type="button">−</button>
                <span class="qty-value">${quantity}</span>
                <button class="qty-plus" aria-label="Increase quantity" type="button">+</button>
            </div>
        `);

        // Save original HTML on control so we can restore it when qty reaches 0
        control.data("original-html", btn.data("original-html"));

        btn.replaceWith(control);
    }

    // 3. Helper to update cart count badge in navbar
    function updateCartCountBadge(count) {
        const badge = $(".cart-count");
        if (badge.length) {
            const countNum = Number(count);
            if (countNum > 0) {
                badge.text(countNum).show();
            } else {
                badge.hide();
            }
        }
    }

    // 4. Hydrate cart state from server on page load
    function hydrateCartState() {
        $.getJSON("/cart/items", function (data) {
            if (data.success && data.items) {
                data.items.forEach(item => {
                    const productId = item.product_id;
                    const quantity = item.quantity;

                    $(`.add-cart-btn[data-product-id="${productId}"]`).each(function () {
                        replaceAddButtonWithControl($(this), quantity);
                    });
                });
            }
        }).fail(function (xhr) {
            console.error("Failed to fetch cart items:", xhr.statusText);
        });
    }

    // Execute hydration
    hydrateCartState();

    // 5. Click handler for ADD buttons
    $(document).on("click", ".add-cart-btn", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const btn = $(this);
        const productId = btn.data("product-id");
        if (!productId) return;

        // Save original HTML if not done
        if (!btn.data("original-html")) {
            btn.data("original-html", btn[0].outerHTML);
        }

        // Double-click protection
        btn.prop("disabled", true);

        // Call backend to update quantity to 1
        $.ajax({
            url: "/cart/update-quantity",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ productId, quantity: 1 }),
            success: function (data) {
                if (data.success) {
                    replaceAddButtonWithControl(btn, 1);
                    updateCartCountBadge(data.cartCount);
                    showToast("Added to cart 🛒");
                } else {
                    showToast(data.message || "Unable to add product. Please try again.");
                    btn.prop("disabled", false);
                }
            },
            error: function (xhr) {
                if (xhr.status === 401) {
                    alert("Please login to add items to your cart.");
                    window.location.href = "/auth/login";
                } else {
                    showToast("Unable to update cart. Please try again.");
                    btn.prop("disabled", false);
                }
            }
        });
    });

    // 6. Click handler for PLUS buttons
    $(document).on("click", ".product-quantity-control .qty-plus", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const plusBtn = $(this);
        const control = plusBtn.closest(".product-quantity-control");
        const productId = control.data("product-id");
        const valueSpan = control.find(".qty-value");
        const minusBtn = control.find(".qty-minus");
        const currentQty = parseInt(valueSpan.text()) || 0;
        const newQty = currentQty + 1;

        // Disable control buttons during processing
        plusBtn.prop("disabled", true);
        minusBtn.prop("disabled", true);

        $.ajax({
            url: "/cart/update-quantity",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ productId, quantity: newQty }),
            success: function (data) {
                if (data.success) {
                    valueSpan.text(newQty);
                    updateCartCountBadge(data.cartCount);
                } else {
                    showToast(data.message || "Unable to update cart. Please try again.");
                }
            },
            error: function (xhr) {
                if (xhr.status === 401) {
                    alert("Please login to update your cart.");
                    window.location.href = "/auth/login";
                } else {
                    showToast("Unable to update cart. Please try again.");
                }
            },
            complete: function () {
                plusBtn.prop("disabled", false);
                minusBtn.prop("disabled", false);
            }
        });
    });

    // 7. Click handler for MINUS buttons
    $(document).on("click", ".product-quantity-control .qty-minus", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const minusBtn = $(this);
        const control = minusBtn.closest(".product-quantity-control");
        const productId = control.data("product-id");
        const valueSpan = control.find(".qty-value");
        const plusBtn = control.find(".qty-plus");
        const currentQty = parseInt(valueSpan.text()) || 0;
        const newQty = currentQty - 1;

        // Disable control buttons during processing
        minusBtn.prop("disabled", true);
        plusBtn.prop("disabled", true);

        $.ajax({
            url: "/cart/update-quantity",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ productId, quantity: newQty }),
            success: function (data) {
                if (data.success) {
                    if (newQty === 0) {
                        // Restore the original ADD button HTML
                        const originalHtml = control.data("original-html");
                        if (originalHtml) {
                            const newBtn = $(originalHtml);
                            // Restore original HTML reference on the new button too
                            newBtn.data("original-html", originalHtml);
                            control.replaceWith(newBtn);
                        } else {
                            // Fallback if original HTML is missing
                            location.reload();
                        }
                    } else {
                        valueSpan.text(newQty);
                    }
                    updateCartCountBadge(data.cartCount);
                } else {
                    showToast(data.message || "Unable to update cart. Please try again.");
                    minusBtn.prop("disabled", false);
                    plusBtn.prop("disabled", false);
                }
            },
            error: function (xhr) {
                if (xhr.status === 401) {
                    alert("Please login to update your cart.");
                    window.location.href = "/auth/login";
                } else {
                    showToast("Unable to update cart. Please try again.");
                    minusBtn.prop("disabled", false);
                    plusBtn.prop("disabled", false);
                }
            }
        });
    });

    // ==========================================
    // WISHLIST FUNCTIONALITY
    // ==========================================

    function hydrateWishlistState() {
        $.getJSON("/wishlist/ids", function (data) {
            if (data.success && data.ids) {
                data.ids.forEach(id => {
                    $(`.wishlist-btn[data-product-id="${id}"], .details-wishlist-btn[data-product-id="${id}"], .category-wishlist[data-product-id="${id}"]`).each(function () {
                        $(this).addClass("active");
                        $(this).find("i").removeClass("bi-heart").addClass("bi-heart-fill");
                    });
                });
            }
        });
    }

    hydrateWishlistState();

    // Toggle wishlist
    $(document).on("click", ".wishlist-btn, .details-wishlist-btn, .category-wishlist", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const btn = $(this);
        const productId = btn.data("product-id");
        if (!productId) return;

        // Double click protection
        if (btn.data("loading")) return;
        btn.data("loading", true);

        const icon = btn.find("i");
        const isRemove = btn.hasClass("active") || icon.hasClass("bi-heart-fill");
        const url = isRemove ? "/wishlist/remove" : "/wishlist/add";

        $.ajax({
            url: url,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ productId }),
            success: function (data) {
                if (data.success) {
                    if (data.wishlisted) {
                        btn.addClass("active");
                        icon.removeClass("bi-heart").addClass("bi-heart-fill");
                        showToast(data.message || "Added to wishlist ❤️");
                        
                        if (btn.hasClass("details-wishlist-btn")) {
                            btn.find(".wishlist-text").text("In Wishlist");
                        }
                    } else {
                        btn.removeClass("active");
                        icon.removeClass("bi-heart-fill").addClass("bi-heart");
                        showToast(data.message || "Removed from wishlist");

                        if (btn.hasClass("details-wishlist-btn")) {
                            btn.find(".wishlist-text").text("Add to Wishlist");
                        }

                        // If on wishlist page, remove the card dynamically
                        if (window.location.pathname === "/wishlist") {
                            const card = btn.closest(".wishlist-item-card");
                            card.fadeOut(400, function () {
                                card.remove();
                                updateWishlistItemCount();
                            });
                        }
                    }
                } else if (data.requiresLogin) {
                    alert(data.message || "Please login to manage your wishlist.");
                    window.location.href = "/auth/login";
                } else {
                    showToast(data.message || "Unable to update wishlist.");
                }
            },
            error: function (xhr) {
                if (xhr.status === 401) {
                    alert("Please login to manage your wishlist.");
                    window.location.href = "/auth/login";
                } else {
                    showToast("Unable to update wishlist. Please try again.");
                }
            },
            complete: function () {
                btn.data("loading", false);
            }
        });
    });

    function updateWishlistItemCount() {
        const cards = $(".wishlist-item-card");
        const count = cards.length;
        const countText = count === 1 ? "1 Item" : `${count} Items`;
        $(".wishlist-count-text").text(countText);

        if (count === 0) {
            $("#wishlistGridContainer").hide();
            $("#wishlistEmptyContainer").fadeIn();
        }
    }
});
