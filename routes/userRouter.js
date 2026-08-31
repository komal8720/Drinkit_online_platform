// ==========================================================
// DRINKIT - USER ROUTER
// ==========================================================

const express = require("express");
const { ensureAuthenticated } = require("../middleware/auth");
const { pool } = require("../config/db");
const upload = require("../middleware/upload");

const router = express.Router();


// ==========================================================
// PRODUCTS (SEARCH & LISTING)
// ==========================================================

router.get("/products", async (req, res, next) => {
    try {
        const searchQuery = req.query.search || "";
        const categoryFilter = req.query.category || "";
        const brandFilter = req.query.brand || "";
        const typeFilter = req.query.type || "";
        const sort = req.query.sort || "popular";
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const offset = (page - 1) * limit;

        // 1. Validate category if set
        let isInvalidCategory = false;
        let selectedCategory = null;
        if (categoryFilter.trim()) {
            const [catRows] = await pool.query("SELECT * FROM categories WHERE slug = ? AND status = 'active' LIMIT 1", [categoryFilter.trim()]);
            if (catRows.length > 0) {
                selectedCategory = catRows[0];
            } else {
                isInvalidCategory = true;
            }
        }

        const conditions = ["p.status = 'approved'"];
        const params = [];

        if (searchQuery.trim()) {
            const wildcard = `%${searchQuery.trim()}%`;
            conditions.push("(p.name LIKE ? OR c.name LIKE ? OR p.description LIKE ?)");
            params.push(wildcard, wildcard, wildcard);
        }

        if (categoryFilter.trim() && !isInvalidCategory) {
            conditions.push("c.slug = ?");
            params.push(categoryFilter.trim());
        }

        if (brandFilter.trim()) {
            conditions.push("b.slug = ?");
            params.push(brandFilter.trim());
        }

        if (typeFilter.trim()) {
            if (typeFilter === "alcoholic") {
                conditions.push("(p.alcohol_percentage > 0 OR p.is_age_restricted = 1)");
            } else if (typeFilter === "non-alcoholic") {
                conditions.push("(p.alcohol_percentage = 0 OR p.alcohol_percentage IS NULL OR p.is_age_restricted = 0)");
            }
        }

        let products = [];
        let totalProducts = 0;
        let totalPages = 0;
        let brands = [];

        if (!isInvalidCategory) {
            // Count total matching products for pagination
            let countQuery = "SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN brands b ON p.brand_id = b.id";
            if (conditions.length > 0) {
                countQuery += " WHERE " + conditions.join(" AND ");
            }
            const [countResult] = await pool.query(countQuery, params);
            totalProducts = countResult[0].total;
            totalPages = Math.ceil(totalProducts / limit);

            // Fetch paginated products
            let query = `
                SELECT p.*, c.name as category_name, c.slug as category_slug, b.name as brand_name, b.slug as brand_slug 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                LEFT JOIN brands b ON p.brand_id = b.id
            `;
            if (conditions.length > 0) {
                query += " WHERE " + conditions.join(" AND ");
            }

            // Apply sorting
            if (sort === "latest") {
                query += " ORDER BY p.created_at DESC";
            } else if (sort === "low") {
                query += " ORDER BY p.price ASC";
            } else if (sort === "high") {
                query += " ORDER BY p.price DESC";
            } else {
                query += " ORDER BY p.is_featured DESC, p.created_at DESC";
            }

            query += " LIMIT ? OFFSET ?";
            const queryParams = [...params, limit, offset];
            const [productRows] = await pool.query(query, queryParams);
            products = productRows;

            // Fetch active brands that have products in this category (or any approved products if no category filter is set)
            if (categoryFilter.trim()) {
                const [brandRows] = await pool.query(
                    `SELECT DISTINCT b.id, b.name, b.slug, b.logo 
                     FROM brands b 
                     JOIN products p ON p.brand_id = b.id 
                     JOIN categories c ON p.category_id = c.id 
                     WHERE c.slug = ? AND b.status = 'active' AND p.status = 'approved'`,
                    [categoryFilter.trim()]
                );
                brands = brandRows;
            } else {
                const [brandRows] = await pool.query(
                    `SELECT DISTINCT b.id, b.name, b.slug, b.logo 
                     FROM brands b 
                     JOIN products p ON p.brand_id = b.id 
                     WHERE b.status = 'active' AND p.status = 'approved'`
                );
                brands = brandRows;
            }
        }

        // Fetch active categories for the filter pills
        const [categories] = await pool.query("SELECT * FROM categories WHERE status = 'active'");

        res.render("user/products", {
            title: selectedCategory ? `${selectedCategory.name} - Drinkit` : "Shop - Drinkit",
            products,
            categories,
            brands,
            searchQuery,
            categoryFilter,
            brandFilter,
            typeFilter,
            sort,
            currentPage: page,
            totalPages,
            totalProducts,
            isInvalidCategory,
            selectedCategory
        });
    } catch (error) {
        console.error("❌ Error fetching products:", error);
        next(error);
    }
});


// ==========================================================
// SET LOCATION (AJAX Endpoint)
// ==========================================================

router.post("/set-location", (req, res) => {
    const { location } = req.body;
    if (location && location.trim()) {
        req.session.location = location.trim();
        return res.json({ success: true, location: req.session.location });
    }
    return res.status(400).json({ success: false, message: "Invalid location" });
});


// ==========================================================
// PROFILE
// ==========================================================

router.get("/profile", ensureAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        
        // Fetch the user's latest info from database
        const [users] = await pool.query(
            "SELECT id, role_id, first_name, last_name, email, mobile, profile_image, status, created_at FROM users WHERE id = ? LIMIT 1",
            [userId]
        );
        
        if (users.length === 0) {
            req.flash("error", "User not found.");
            return res.redirect("/auth/login");
        }
        
        const user = users[0];
        
        // Fetch user default or latest address
        const [addresses] = await pool.query(
            "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC LIMIT 1",
            [userId]
        );
        const address = addresses.length > 0 ? addresses[0] : null;
        
        res.render("user/profile", {
            title: "My Profile - Drinkit",
            user,
            address
        });
    } catch (err) {
        console.error("❌ Error fetching user profile:", err);
        next(err);
    }
});

router.post("/profile", ensureAuthenticated, (req, res, next) => {
    const uploadSingle = upload.single("profile_image");
    
    uploadSingle(req, res, async function (err) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("/profile");
        }
        
        const userId = req.session.user.id;
        const { first_name, last_name, mobile, address_line1, address_line2, city, state, pincode } = req.body;
        
        try {
            // Server-side validation
            if (!first_name || !first_name.trim()) {
                req.flash("error", "First name cannot be empty.");
                return res.redirect("/profile");
            }
            
            // Check if profile image was uploaded
            let profileImage = null;
            if (req.file) {
                profileImage = req.file.filename;
            }
            
            // 1. Update users table
            let userUpdateQuery = "UPDATE users SET first_name = ?, last_name = ?, mobile = ?";
            const userUpdateParams = [first_name.trim(), last_name ? last_name.trim() : null, mobile ? mobile.trim() : null];
            
            if (profileImage) {
                userUpdateQuery += ", profile_image = ?";
                userUpdateParams.push(profileImage);
            }
            
            userUpdateQuery += " WHERE id = ?";
            userUpdateParams.push(userId);
            
            await pool.query(userUpdateQuery, userUpdateParams);
            
            // 2. Update address in addresses table
            // Check if an address already exists for user
            const [existingAddresses] = await pool.query(
                "SELECT id FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC LIMIT 1",
                [userId]
            );
            
            const fullAddressName = [first_name.trim(), last_name ? last_name.trim() : ""].filter(Boolean).join(" ");
            const addressMobile = mobile ? mobile.trim() : "";
            
            if (existingAddresses.length > 0) {
                // Update existing address
                const addressId = existingAddresses[0].id;
                await pool.query(
                    `UPDATE addresses SET 
                        full_name = ?, 
                        mobile = ?, 
                        address_line1 = ?, 
                        address_line2 = ?, 
                        city = ?, 
                        state = ?, 
                        pincode = ? 
                     WHERE user_id = ? AND id = ?`,
                    [
                        fullAddressName,
                        addressMobile,
                        address_line1 ? address_line1.trim() : "",
                        address_line2 ? address_line2.trim() : null,
                        city ? city.trim() : "",
                        state ? state.trim() : "",
                        pincode ? pincode.trim() : "",
                        userId,
                        addressId
                    ]
                );
            } else if (address_line1 || city || state || pincode) {
                // Create new default address if at least some fields are supplied
                await pool.query(
                    `INSERT INTO addresses (user_id, address_type, full_name, mobile, address_line1, address_line2, city, state, pincode, is_default)
                     VALUES (?, 'home', ?, ?, ?, ?, ?, ?, ?, 1)`,
                    [
                        userId,
                        fullAddressName,
                        addressMobile,
                        address_line1 ? address_line1.trim() : "",
                        address_line2 ? address_line2.trim() : null,
                        city ? city.trim() : "",
                        state ? state.trim() : "",
                        pincode ? pincode.trim() : ""
                    ]
                );
            }
            
            // 3. Update session
            const [updatedUsers] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
            if (updatedUsers.length > 0) {
                const updatedUser = updatedUsers[0];
                req.session.user = {
                    id: updatedUser.id,
                    role_id: updatedUser.role_id,
                    first_name: updatedUser.first_name,
                    last_name: updatedUser.last_name,
                    email: updatedUser.email,
                    mobile: updatedUser.mobile,
                    profile_image: updatedUser.profile_image
                };
            }
            
            req.flash("success", "Profile updated successfully.");
            res.redirect("/profile");
            
        } catch (err) {
            console.error("❌ Error updating profile:", err);
            req.flash("error", "Unable to update profile. Please try again.");
            res.redirect("/profile");
        }
    });
});




// ==========================================================
// WISHLIST
// ==========================================================

router.get("/wishlist", ensureAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        
        // Fetch all wishlist products for the user
        const [wishlistItems] = await pool.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM wishlist w
             JOIN products p ON w.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE w.user_id = ?
             ORDER BY w.created_at DESC`,
            [userId]
        );
        
        res.render("user/wishlist", {
            title: "My Wishlist - Drinkit",
            user: req.session.user,
            wishlistItems
        });
    } catch (err) {
        console.error("❌ Error fetching wishlist items:", err);
        next(err);
    }
});

router.get("/wishlist/ids", async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.json({ success: true, ids: [] });
        }
        const [rows] = await pool.query("SELECT product_id FROM wishlist WHERE user_id = ?", [req.session.user.id]);
        const ids = rows.map(r => r.product_id);
        res.json({ success: true, ids });
    } catch (err) {
        console.error("❌ Error fetching wishlist ids:", err);
        res.status(500).json({ success: false, ids: [] });
    }
});

router.post("/wishlist/add", async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.json({ 
                success: false, 
                loginRequired: true, 
                requiresLogin: true, 
                message: "Please login to add products to wishlist" 
            });
        }
        
        const userId = req.session.user.id;
        const { productId } = req.body;
        
        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required." });
        }
        
        const [product] = await pool.query("SELECT id FROM products WHERE id = ? LIMIT 1", [productId]);
        if (product.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        
        const [existing] = await pool.query(
            "SELECT id FROM wishlist WHERE user_id = ? AND product_id = ? LIMIT 1",
            [userId, productId]
        );
        
        let action = "";
        let message = "";
        let wishlisted = true;
        
        if (existing.length > 0) {
            await pool.query("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", [userId, productId]);
            action = "removed";
            message = "Product removed from wishlist";
            wishlisted = false;
        } else {
            await pool.query("INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)", [userId, productId]);
            action = "added";
            message = "Product added to wishlist";
            wishlisted = true;
        }
        
        const [countResult] = await pool.query("SELECT COUNT(*) as count FROM wishlist WHERE user_id = ?", [userId]);
        const wishlistCount = countResult[0].count;
        
        res.json({
            success: true,
            action,
            message,
            wishlisted,
            wishlistCount
        });
    } catch (err) {
        console.error("❌ Error in /wishlist/add:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

router.post("/wishlist/remove", async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.json({ 
                success: false, 
                loginRequired: true, 
                requiresLogin: true, 
                message: "Please login to add products to wishlist" 
            });
        }
        
        const userId = req.session.user.id;
        const { productId } = req.body;
        
        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required." });
        }
        
        const [product] = await pool.query("SELECT id FROM products WHERE id = ? LIMIT 1", [productId]);
        if (product.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        
        const [existing] = await pool.query(
            "SELECT id FROM wishlist WHERE user_id = ? AND product_id = ? LIMIT 1",
            [userId, productId]
        );
        
        let action = "";
        let message = "";
        let wishlisted = false;
        
        if (existing.length > 0) {
            await pool.query("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", [userId, productId]);
            action = "removed";
            message = "Product removed from wishlist";
            wishlisted = false;
        } else {
            await pool.query("INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)", [userId, productId]);
            action = "added";
            message = "Product added to wishlist";
            wishlisted = true;
        }
        
        const [countResult] = await pool.query("SELECT COUNT(*) as count FROM wishlist WHERE user_id = ?", [userId]);
        const wishlistCount = countResult[0].count;
        
        res.json({
            success: true,
            action,
            message,
            wishlisted,
            wishlistCount
        });
    } catch (err) {
        console.error("❌ Error in /wishlist/remove:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

router.post("/wishlist/toggle", async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: "Please login to manage your wishlist." });
        }
        
        const userId = req.session.user.id;
        const { productId } = req.body;
        
        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required." });
        }
        
        // Check if item exists in wishlist
        const [existing] = await pool.query(
            "SELECT id FROM wishlist WHERE user_id = ? AND product_id = ? LIMIT 1",
            [userId, productId]
        );
        
        let action = "";
        if (existing.length > 0) {
            // Remove it
            await pool.query("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?", [userId, productId]);
            action = "removed";
        } else {
            // Add it
            await pool.query("INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)", [userId, productId]);
            action = "added";
        }
        
        // Fetch updated wishlist count
        const [countResult] = await pool.query("SELECT COUNT(*) as count FROM wishlist WHERE user_id = ?", [userId]);
        const wishlistCount = countResult[0].count;
        
        res.json({
            success: true,
            action,
            wishlistCount,
            message: action === "added" ? "Added to wishlist ❤️" : "Removed from wishlist"
        });
    } catch (err) {
        console.error("❌ Error toggling wishlist:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});


// ==========================================================
// CART
// ==========================================================

router.get("/cart", ensureAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user.id;

        // 1. Get cart items joining products
        const [cartItems] = await pool.query(
            `SELECT ci.id as cart_item_id, ci.quantity, ci.price as cart_item_price, 
                    p.id as product_id, p.name, p.slug, p.image, p.bottle_size, p.price as product_price, p.sale_price,
                    p.stock_quantity
             FROM carts c
             JOIN cart_items ci ON c.id = ci.cart_id
             JOIN products p ON ci.product_id = p.id
             WHERE c.user_id = ?`,
            [userId]
        );

        // Calculate totals
        let subtotal = 0;
        cartItems.forEach(item => {
            subtotal += item.quantity * item.cart_item_price;
        });

        const deliveryFee = subtotal > 500 || subtotal === 0 ? 0 : 49;
        const discount = 0;
        const total = subtotal + deliveryFee - discount;

        res.render("user/cart", {
            title: "My Cart - Drinkit",
            user: req.session.user,
            cartItems,
            subtotal,
            deliveryFee,
            discount,
            total
        });
    } catch (error) {
        console.error("❌ Error fetching cart details:", error);
        next(error);
    }
});


// ==========================================================
// SINGLE PRODUCT DETAILS
// ==========================================================

router.get("/product/:slug", async (req, res, next) => {
    const { slug } = req.params;
    try {
        // 1. Fetch main product details
        const [products] = await pool.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug, b.name as brand_name, b.slug as brand_slug 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             LEFT JOIN brands b ON p.brand_id = b.id 
             WHERE p.slug = ? AND p.status = 'approved' LIMIT 1`,
            [slug]
        );

        if (products.length === 0) {
            // Fetch active categories for error/not found state compatibility
            const [categories] = await pool.query("SELECT * FROM categories WHERE status = 'active'");
            return res.status(404).render("user/products", {
                title: "Product Not Found - Drinkit",
                products: [],
                categories,
                brands: [],
                searchQuery: "",
                categoryFilter: "",
                brandFilter: "",
                typeFilter: "",
                sort: "popular",
                currentPage: 1,
                totalPages: 0,
                totalProducts: 0,
                isInvalidCategory: false,
                selectedCategory: null
            });
        }

        const product = products[0];

        // 2. Fetch related products in the same category (excluding current)
        const [relatedProducts] = await pool.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.category_id = ? AND p.id != ? AND p.status = 'approved' 
             LIMIT 8`,
            [product.category_id, product.id]
        );

        // 3. Fetch snacks (excluding current)
        const [snacks] = await pool.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p 
             JOIN categories c ON p.category_id = c.id 
             WHERE c.slug = 'snacks' AND p.id != ? AND p.status = 'approved' 
             LIMIT 8`,
            [product.id]
        );

        // 4. Fetch soft drinks (excluding current)
        const [softDrinks] = await pool.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p 
             JOIN categories c ON p.category_id = c.id 
             WHERE c.slug = 'soft-drinks' AND p.id != ? AND p.status = 'approved' 
             LIMIT 8`,
            [product.id]
        );

        // 5. Fetch spirits (excluding current)
        const [spirits] = await pool.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p 
             JOIN categories c ON p.category_id = c.id 
             WHERE c.slug = 'spirits' AND p.id != ? AND p.status = 'approved' 
             LIMIT 8`,
            [product.id]
        );

        res.render("user/product-details", {
            title: `${product.name} - Drinkit`,
            product,
            relatedProducts,
            snacks,
            snacksProducts: snacks,
            softDrinks,
            softDrinkProducts: softDrinks,
            spirits,
            spiritsProducts: spirits
        });
    } catch (error) {
        console.error("❌ Error fetching product details:", error);
        next(error);
    }
});


// ==========================================================
// ADD TO CART (AJAX Endpoint)
// ==========================================================

router.post("/cart/add", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Please login to add items to cart." });
    }

    const { productId, quantity } = req.body;
    const userId = req.session.user.id;
    const qty = Number(quantity) || 1;

    if (!productId) {
        return res.status(400).json({ success: false, message: "Product ID is required." });
    }

    try {
        // 1. Get product price
        const [products] = await pool.query("SELECT price FROM products WHERE id = ? LIMIT 1", [productId]);
        if (products.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        const price = products[0].price;

        // 2. Manage carts and cart_items
        let cartId;
        const [carts] = await pool.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [userId]);
        if (carts.length === 0) {
            const [result] = await pool.query("INSERT INTO carts (user_id) VALUES (?)", [userId]);
            cartId = result.insertId;
        } else {
            cartId = carts[0].id;
        }

        const [items] = await pool.query("SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1", [cartId, productId]);
        if (items.length > 0) {
            await pool.query("UPDATE cart_items SET quantity = quantity + ? WHERE id = ?", [qty, items[0].id]);
        } else {
            await pool.query("INSERT INTO cart_items (cart_id, product_id, quantity, price) VALUES (?, ?, ?, ?)", [cartId, productId, qty, price]);
        }

        // 3. Fallback flat cart sync
        try {
            const [flatItems] = await pool.query("SELECT quantity FROM cart WHERE user_id = ? AND product_id = ? LIMIT 1", [userId, productId]);
            if (flatItems.length > 0) {
                await pool.query("UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?", [qty, userId, productId]);
            } else {
                await pool.query("INSERT INTO cart (cart_id, user_id, product_id, quantity) VALUES (?, ?, ?, ?)", [cartId, userId, productId, qty]);
            }
        } catch (flatErr) {
            console.error("Flat cart table fallback sync error:", flatErr.message);
        }

        // 4. Calculate total cart count
        const [countRows] = await pool.query(
            `SELECT SUM(ci.quantity) as count 
             FROM carts c 
             JOIN cart_items ci ON c.id = ci.cart_id 
             WHERE c.user_id = ?`,
            [userId]
        );
        const cartCount = countRows[0].count || 0;

        return res.json({ success: true, message: "Item added to cart successfully.", cartCount: Number(cartCount) });
    } catch (err) {
        console.error("Error adding to cart:", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
});


// ==========================================================
// UPDATE CART ITEM (AJAX Endpoint)
// ==========================================================

router.post("/cart/update", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { itemId, quantity } = req.body;
    const userId = req.session.user.id;
    const qty = parseInt(quantity);

    if (!itemId || isNaN(qty) || qty < 1) {
        return res.status(400).json({ success: false, message: "Invalid parameters." });
    }

    try {
        // Verify cart item belongs to user
        const [rows] = await pool.query(
            `SELECT ci.id, ci.product_id, c.id as cart_id 
             FROM cart_items ci 
             JOIN carts c ON ci.cart_id = c.id 
             WHERE ci.id = ? AND c.user_id = ? LIMIT 1`,
            [itemId, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Cart item not found." });
        }

        const productId = rows[0].product_id;
        const cartId = rows[0].cart_id;

        // Check stock quantity from database
        const [[product]] = await pool.query(
            "SELECT stock_quantity, name FROM products WHERE id = ? LIMIT 1",
            [productId]
        );

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        if (qty > product.stock_quantity) {
            return res.status(400).json({ 
                success: false, 
                message: `Only ${product.stock_quantity} items available in stock for "${product.name}".`,
                availableStock: product.stock_quantity
            });
        }

        // Update quantity in cart_items
        await pool.query("UPDATE cart_items SET quantity = ? WHERE id = ?", [qty, itemId]);

        // Sync with fallback flat cart table if it exists
        try {
            await pool.query("UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?", [qty, userId, productId]);
        } catch (flatErr) {
            console.error("Flat cart sync update error:", flatErr.message);
        }

        // Fetch updated totals
        const [items] = await pool.query(
            `SELECT ci.quantity, ci.price FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE c.user_id = ?`,
            [userId]
        );
        let subtotal = 0;
        let cartCount = 0;
        items.forEach(item => {
            subtotal += item.quantity * item.price;
            cartCount += item.quantity;
        });

        const deliveryFee = subtotal > 500 ? 0 : 49;
        const total = subtotal + deliveryFee;

        return res.json({
            success: true,
            subtotal,
            deliveryFee,
            total,
            cartCount
        });
    } catch (err) {
        console.error("Error updating cart:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});


// ==========================================================
// REMOVE CART ITEM (AJAX Endpoint)
// ==========================================================

router.post("/cart/remove", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { itemId } = req.body;
    const userId = req.session.user.id;

    if (!itemId) {
        return res.status(400).json({ success: false, message: "Invalid parameters." });
    }

    try {
        // Verify cart item belongs to user
        const [rows] = await pool.query(
            `SELECT ci.id, ci.product_id 
             FROM cart_items ci 
             JOIN carts c ON ci.cart_id = c.id 
             WHERE ci.id = ? AND c.user_id = ? LIMIT 1`,
            [itemId, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Cart item not found." });
        }

        const productId = rows[0].product_id;

        // Delete from cart_items
        await pool.query("DELETE FROM cart_items WHERE id = ?", [itemId]);

        // Sync with flat cart table
        try {
            await pool.query("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId]);
        } catch (flatErr) {
            console.error("Flat cart sync delete error:", flatErr.message);
        }

        // Fetch updated totals
        const [items] = await pool.query(
            `SELECT ci.quantity, ci.price FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE c.user_id = ?`,
            [userId]
        );
        let subtotal = 0;
        let cartCount = 0;
        items.forEach(item => {
            subtotal += item.quantity * item.price;
            cartCount += item.quantity;
        });

        const deliveryFee = subtotal > 500 || items.length === 0 ? 0 : 49;
        const total = subtotal + deliveryFee;

        return res.json({
            success: true,
            subtotal,
            deliveryFee,
            total,
            cartCount,
            isEmpty: items.length === 0
        });
    } catch (err) {
        console.error("Error removing item from cart:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});


// ==========================================================
// GET ACTIVE CART ITEMS (AJAX Endpoint for State Hydration)
// ==========================================================
router.get("/cart/items", async (req, res) => {
    if (!req.session.user) {
        return res.json({ success: true, items: [] });
    }
    const userId = req.session.user.id;
    try {
        const [items] = await pool.query(
            `SELECT ci.product_id, ci.quantity 
             FROM cart_items ci 
             JOIN carts c ON ci.cart_id = c.id 
             WHERE c.user_id = ?`,
            [userId]
        );
        return res.json({ success: true, items });
    } catch (err) {
        console.error("Error fetching cart items:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// ==========================================================
// UPDATE CART QUANTITY BY PRODUCT ID (AJAX Endpoint)
// ==========================================================
router.post("/cart/update-quantity", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { productId, quantity } = req.body;
    const userId = req.session.user.id;
    const qty = parseInt(quantity);

    if (!productId || isNaN(qty) || qty < 0) {
        return res.status(400).json({ success: false, message: "Invalid parameters." });
    }

    try {
        // 1. Get or create cart for user
        let cartId;
        const [carts] = await pool.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [userId]);
        if (carts.length === 0) {
            const [result] = await pool.query("INSERT INTO carts (user_id) VALUES (?)", [userId]);
            cartId = result.insertId;
        } else {
            cartId = carts[0].id;
        }

        // 2. Perform insert, update or delete based on quantity
        if (qty === 0) {
            // Delete item from cart_items
            await pool.query("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?", [cartId, productId]);
            
            // Delete from fallback flat cart table
            try {
                await pool.query("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId]);
            } catch (flatErr) {
                console.error("Flat cart delete error:", flatErr.message);
            }
        } else {
            // Fetch product price and stock (Validate product exists)
            const [products] = await pool.query("SELECT price, stock_quantity, name FROM products WHERE id = ? LIMIT 1", [productId]);
            if (products.length === 0) {
                return res.status(404).json({ success: false, message: "Product not found." });
            }
            const price = products[0].price;
            const stock = products[0].stock_quantity;

            if (qty > stock) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Only ${stock} items available in stock for "${products[0].name}".`,
                    availableStock: stock
                });
            }

            // Upsert in cart_items
            const [items] = await pool.query("SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1", [cartId, productId]);
            if (items.length > 0) {
                await pool.query("UPDATE cart_items SET quantity = ? WHERE id = ?", [qty, items[0].id]);
            } else {
                await pool.query("INSERT INTO cart_items (cart_id, product_id, quantity, price) VALUES (?, ?, ?, ?)", [cartId, productId, qty, price]);
            }

            // Sync with fallback flat cart table
            try {
                const [flatItems] = await pool.query("SELECT quantity FROM cart WHERE user_id = ? AND product_id = ? LIMIT 1", [userId, productId]);
                if (flatItems.length > 0) {
                    await pool.query("UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?", [qty, userId, productId]);
                } else {
                    await pool.query("INSERT INTO cart (cart_id, user_id, product_id, quantity) VALUES (?, ?, ?, ?)", [cartId, userId, productId, qty]);
                }
            } catch (flatErr) {
                console.error("Flat cart sync error:", flatErr.message);
            }
        }

        // 3. Recalculate totals
        const [items] = await pool.query(
            `SELECT ci.quantity, ci.price FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE c.user_id = ?`,
            [userId]
        );
        let subtotal = 0;
        let cartCount = 0;
        items.forEach(item => {
            subtotal += item.quantity * item.price;
            cartCount += item.quantity;
        });

        const deliveryFee = subtotal > 500 || items.length === 0 ? 0 : 49;
        const total = subtotal + deliveryFee;

        return res.json({
            success: true,
            subtotal,
            deliveryFee,
            total,
            cartCount
        });
    } catch (err) {
        console.error("Error updating cart quantity:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});


// ==========================================================
// CHECKOUT ROUTES
// ==========================================================

// GET /checkout - Renders the checkout page
router.get("/checkout", ensureAuthenticated, async (req, res, next) => {
    try {
        const userId = req.session.user.id;

        // 1. Get cart items joining products
        const [cartItems] = await pool.query(
            `SELECT ci.id as cart_item_id, ci.quantity, ci.price as cart_item_price, 
                    p.id as product_id, p.name, p.slug, p.image, p.bottle_size, p.price as product_price, p.sale_price,
                    p.is_age_restricted, cat.slug as category_slug, cat.name as category_name, p.stock_quantity
             FROM carts ct
             JOIN cart_items ci ON ct.id = ci.cart_id
             JOIN products p ON ci.product_id = p.id
             JOIN categories cat ON p.category_id = cat.id
             WHERE ct.user_id = ?`,
            [userId]
        );

        // 2. Verify cart is not empty
        if (cartItems.length === 0) {
            req.flash("error", "Your cart is empty. Please add items to your cart before checking out.");
            return res.redirect("/cart");
        }

        // 3. Recalculate totals, check stock limits and age requirements
        let subtotal = 0;
        let isAgeRestricted = false;
        let requiredAge = 0;
        let hasStockIssue = false;

        cartItems.forEach(item => {
            if (item.stock_quantity === 0 || item.quantity > item.stock_quantity) {
                hasStockIssue = true;
            }
            subtotal += item.quantity * item.product_price;
            if (item.is_age_restricted) {
                isAgeRestricted = true;
                if (item.category_slug === "spirits") {
                    requiredAge = Math.max(requiredAge, 25);
                } else if (item.category_slug === "beer" || item.category_slug === "wine") {
                    requiredAge = Math.max(requiredAge, 21);
                } else {
                    requiredAge = Math.max(requiredAge, 18);
                }
            }
        });

        if (hasStockIssue) {
            req.flash("error", "Some items in your cart have insufficient stock. Please update your cart to continue.");
            return res.redirect("/cart");
        }

        const deliveryFee = subtotal > 500 ? 0 : 49;
        const discount = 0;
        const total = subtotal + deliveryFee - discount;

        // 4. Fetch saved addresses
        const [addresses] = await pool.query(
            `SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
            [userId]
        );

        // 5. Fetch user verification details
        const [[user]] = await pool.query(
            `SELECT is_identity_verified, date_of_birth FROM users WHERE id = ? LIMIT 1`,
            [userId]
        );

        // Calculate current age
        let currentAge = null;
        let isEligible = true;
        let ageReason = "";

        if (user.date_of_birth) {
            const dob = new Date(user.date_of_birth);
            const diffMs = Date.now() - dob.getTime();
            const ageDate = new Date(diffMs);
            currentAge = Math.abs(ageDate.getUTCFullYear() - 1970);
            
            if (isAgeRestricted && currentAge < requiredAge) {
                isEligible = false;
                ageReason = `underage_${requiredAge}`;
            }
        } else if (isAgeRestricted) {
            isEligible = false;
            ageReason = "verification_required";
        }

        res.render("user/checkout", {
            title: "Checkout - Drinkit",
            cartItems,
            subtotal,
            deliveryFee,
            discount,
            total,
            addresses,
            user,
            isAgeRestricted,
            requiredAge,
            currentAge,
            isEligible,
            ageReason
        });
    } catch (error) {
        console.error("❌ Error loading checkout page:", error);
        next(error);
    }
});

// POST /checkout/address - Adds a new delivery address
router.post("/checkout/address", ensureAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const { full_name, mobile, address_line1, address_line2, city, state, pincode, address_type, is_default } = req.body;

    // Validate inputs
    if (!full_name || !mobile || !address_line1 || !city || !state || !pincode) {
        return res.status(400).json({ success: false, message: "Please fill in all required fields." });
    }

    // Pincode validation (6 digits)
    const pinRegex = /^[1-9][0-9]{5}$/;
    if (!pinRegex.test(pincode)) {
        return res.status(400).json({ success: false, message: "Please enter a valid 6-digit PIN code." });
    }

    // Mobile number validation (10 digits)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
        return res.status(400).json({ success: false, message: "Please enter a valid 10-digit mobile number." });
    }

    const type = address_type || 'home';
    const isDefault = is_default === '1' || is_default === true ? 1 : 0;

    try {
        // If set as default, unset previous default addresses
        if (isDefault) {
            await pool.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId]);
        }

        const [result] = await pool.query(
            `INSERT INTO addresses (user_id, address_type, full_name, mobile, address_line1, address_line2, city, state, pincode, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, type, full_name, mobile, address_line1, address_line2 || null, city, state, pincode, isDefault]
        );

        const newAddressId = result.insertId;
        const [[newAddress]] = await pool.query("SELECT * FROM addresses WHERE id = ? LIMIT 1", [newAddressId]);

        return res.json({ success: true, message: "Address added successfully.", address: newAddress });
    } catch (err) {
        console.error("Error adding address:", err);
        return res.status(500).json({ success: false, message: "Failed to add address. Please try again." });
    }
});

// POST /checkout/verify - Submits identity and DOB details
router.post("/checkout/verify", ensureAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const { date_of_birth, doc_type, doc_number, full_name } = req.body;

    if (!date_of_birth || !doc_type || !doc_number || !full_name) {
        return res.status(400).json({ success: false, message: "All verification details are required." });
    }

    // Verify format
    const dobDate = new Date(date_of_birth);
    if (isNaN(dobDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid date of birth format." });
    }

    // Calculate age
    const diffMs = Date.now() - dobDate.getTime();
    const ageDate = new Date(diffMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    if (age < 18) {
        return res.status(400).json({ success: false, message: "You must be at least 18 years old to complete identity verification." });
    }

    try {
        await pool.query(
            `UPDATE users 
             SET date_of_birth = ?, is_identity_verified = 1, identity_verified_at = NOW() 
             WHERE id = ?`,
            [date_of_birth, userId]
        );

        return res.json({ success: true, message: "Identity and age verified successfully." });
    } catch (err) {
        console.error("Error verifying identity:", err);
        return res.status(500).json({ success: false, message: "Verification failed. Please try again." });
    }
});

// POST /checkout/create-order - Submits order details and starts transaction
router.post("/checkout/create-order", ensureAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const { addressId, paymentMethod, customerNote } = req.body;

    if (!addressId || !paymentMethod) {
        return res.status(400).json({ success: false, message: "Delivery address and payment method are required." });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Verify address exists and belongs to user
        const [addresses] = await conn.query(
            "SELECT * FROM addresses WHERE id = ? AND user_id = ? LIMIT 1",
            [addressId, userId]
        );
        if (addresses.length === 0) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: "Invalid delivery address selected." });
        }

        // 2. Fetch cart items joining products (to prevent price tampering and verify stock)
        const [cartItems] = await conn.query(
            `SELECT ci.quantity, p.id as product_id, p.name, p.price, p.sale_price, p.stock_quantity, p.is_age_restricted,
                    c.slug as category_slug, p.vendor_id
             FROM carts ct
             JOIN cart_items ci ON ct.id = ci.cart_id
             JOIN products p ON ci.product_id = p.id
             JOIN categories c ON p.category_id = c.id
             WHERE ct.user_id = ?`,
            [userId]
        );

        if (cartItems.length === 0) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: "Your cart is empty." });
        }

        // 3. Validate stock, calculate totals, check age eligibility
        let subtotal = 0;
        let isAgeRestricted = false;
        let requiredAge = 0;

        for (const item of cartItems) {
            // Verify stock
            if (item.stock_quantity < item.quantity) {
                await conn.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: `Insufficient stock for product "${item.name}". Available stock: ${item.stock_quantity}.` 
                });
            }

            subtotal += item.quantity * item.price;

            if (item.is_age_restricted) {
                isAgeRestricted = true;
                if (item.category_slug === "spirits") {
                    requiredAge = Math.max(requiredAge, 25);
                } else if (item.category_slug === "beer" || item.category_slug === "wine") {
                    requiredAge = Math.max(requiredAge, 21);
                } else {
                    requiredAge = Math.max(requiredAge, 18);
                }
            }
        }

        // Verify age eligibility in database
        if (isAgeRestricted) {
            const [[user]] = await conn.query(
                "SELECT is_identity_verified, date_of_birth FROM users WHERE id = ? LIMIT 1",
                [userId]
            );
            if (!user.is_identity_verified || !user.date_of_birth) {
                await conn.rollback();
                return res.status(400).json({ success: false, message: "Identity and age verification are required for this order." });
            }

            const dob = new Date(user.date_of_birth);
            const diffMs = Date.now() - dob.getTime();
            const ageDate = new Date(diffMs);
            const age = Math.abs(ageDate.getUTCFullYear() - 1970);

            if (age < requiredAge) {
                await conn.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: `You must be at least ${requiredAge} years old to purchase items in this order. Current age: ${age}.` 
                });
            }
        }

        // Recalculate delivery fee and total
        const deliveryCharge = subtotal > 500 ? 0 : 49;
        const discountAmount = 0;
        const taxAmount = 0; // default
        const totalAmount = subtotal + deliveryCharge + taxAmount - discountAmount;

        // 4. Generate unique order number
        const orderNumber = "DI" + Date.now() + Math.floor(Math.random() * 1000);

        // 5. Insert into orders table
        const orderStatus = paymentMethod === 'cod' ? 'confirmed' : 'pending';
        const paymentStatus = 'pending';

        const [orderResult] = await conn.query(
            `INSERT INTO orders (order_number, customer_id, address_id, subtotal, discount_amount, delivery_charge, tax_amount, total_amount, payment_status, order_status, customer_note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderNumber, userId, addressId, subtotal, discountAmount, deliveryCharge, taxAmount, totalAmount, paymentStatus, orderStatus, customerNote || null]
        );

        const orderId = orderResult.insertId;

        // 6. Insert items into order_items (price snapshot) and deduct inventory stock
        for (const item of cartItems) {
            const totalPrice = item.quantity * item.price;
            await conn.query(
                `INSERT INTO order_items (order_id, product_id, vendor_id, product_name, quantity, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [orderId, item.product_id, item.vendor_id || 1, item.name, item.quantity, item.price, totalPrice]
            );

            // Deduct stock quantity
            await conn.query(
                `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`,
                [item.quantity, item.product_id]
            );
        }

        // 7. Insert payment record
        const payMethodMapped = paymentMethod === 'cod' ? 'cod' : (paymentMethod === 'card' ? 'card' : (paymentMethod === 'upi' ? 'upi' : 'online'));
        await conn.query(
            `INSERT INTO payments (order_id, payment_method, transaction_id, amount, status)
             VALUES (?, ?, ?, ?, ?)`,
            [orderId, payMethodMapped, paymentMethod === 'cod' ? 'COD-' + orderNumber : null, totalAmount, 'pending']
        );

        // 8. If COD, clear user's cart immediately
        if (paymentMethod === 'cod') {
            const [carts] = await conn.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [userId]);
            if (carts.length > 0) {
                const cartId = carts[0].id;
                await conn.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);
                try {
                    await conn.query("DELETE FROM cart WHERE user_id = ?", [userId]);
                } catch (flatErr) {}
            }
        }

        await conn.commit();
        conn.release();

        if (paymentMethod === 'cod') {
            return res.json({ success: true, redirectUrl: `/checkout/success/${orderId}`, paymentMethod: 'cod' });
        } else {
            return res.json({ success: true, redirectUrl: `/checkout/payment/${orderId}`, paymentMethod: 'online' });
        }
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error("Error creating order:", err);
        return res.status(500).json({ success: false, message: "Order creation failed. Please try again." });
    }
});

// GET /checkout/payment/:orderId - Renders the payment gateway
router.get("/checkout/payment/:orderId", ensureAuthenticated, async (req, res, next) => {
    const userId = req.session.user.id;
    const orderId = req.params.orderId;

    try {
        const [[order]] = await pool.query(
            `SELECT o.*, p.payment_method 
             FROM orders o
             LEFT JOIN payments p ON o.id = p.order_id
             WHERE o.id = ? AND o.customer_id = ? LIMIT 1`,
            [orderId, userId]
        );

        if (!order) {
            req.flash("error", "Order not found or access denied.");
            return res.redirect("/cart");
        }

        if (order.payment_status === "paid") {
            return res.redirect(`/checkout/success/${orderId}`);
        }

        // Fetch customer prefill details securely from database
        const [[user]] = await pool.query(
            "SELECT first_name, last_name, email, mobile FROM users WHERE id = ? LIMIT 1",
            [userId]
        );
        const customerName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
        const customerEmail = user.email || "";
        const customerPhone = user.mobile || "";

        res.render("user/payment-sandbox", {
            title: "Secure Order Payment - Drinkit",
            order,
            customerName,
            customerEmail,
            customerPhone,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error("Error loading payment gateway:", err);
        next(err);
    }
});

// POST /checkout/create-razorpay-order - Creates Razorpay Order ID for online transactions
router.post("/checkout/create-razorpay-order", ensureAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const { internalOrderId, orderId } = req.body;
    const actualOrderId = orderId || internalOrderId;

    console.log("[Razorpay] Create order request received");
    console.log("[Razorpay] Order ID:", actualOrderId);
    console.log("[Razorpay] Key configured:", !!process.env.RAZORPAY_KEY_ID);

    if (!actualOrderId) {
        return res.status(400).json({ success: false, message: "Order ID is required." });
    }

    try {
        const [[order]] = await pool.query(
            "SELECT * FROM orders WHERE id = ? AND customer_id = ? LIMIT 1",
            [actualOrderId, userId]
        );

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        console.log("[Razorpay] Amount:", order.total_amount);

        const [[payment]] = await pool.query(
            "SELECT * FROM payments WHERE order_id = ? LIMIT 1",
            [actualOrderId]
        );

        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment record not found." });
        }

        if (order.payment_status === "paid" || payment.status === "success") {
            return res.json({ success: true, alreadyPaid: true, redirectUrl: `/checkout/success/${actualOrderId}` });
        }

        let razorpayOrderId = payment.razorpay_order_id;
        const amountInPaise = Math.round(Number(order.total_amount) * 100);

        if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment amount"
            });
        }

        console.log("[Razorpay] Amount in paise:", amountInPaise);

        if (!razorpayOrderId) {
            const razorpay = require("../config/razorpay");
            const options = {
                amount: amountInPaise,
                currency: "INR",
                receipt: "order_" + actualOrderId,
                notes: {
                    database_order_id: String(actualOrderId)
                }
            };

            try {
                const razorpayOrder = await razorpay.orders.create(options);
                razorpayOrderId = razorpayOrder.id;
                console.log("[Razorpay] Razorpay order created:", razorpayOrderId);

                await pool.query(
                    "UPDATE payments SET razorpay_order_id = ? WHERE order_id = ?",
                    [razorpayOrderId, actualOrderId]
                );
            } catch (error) {
                console.error("[Razorpay] Order creation failed:", error);
                return res.status(500).json({
                    success: false,
                    message: "Unable to create Razorpay order"
                });
            }
        }

        return res.json({
            success: true,
            key: process.env.RAZORPAY_KEY_ID,
            orderId: razorpayOrderId,
            amount: amountInPaise,
            currency: "INR"
        });
    } catch (err) {
        console.error("Error creating Razorpay order:", err);
        return res.status(500).json({ success: false, message: "Unable to process payment order creation." });
    }
});

// POST /checkout/verify-payment - Verifies Razorpay payment signature securely on server
router.post("/checkout/verify-payment", ensureAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        internal_order_id,
        orderId
    } = req.body;

    const actualOrderId = orderId || internal_order_id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !actualOrderId) {
        return res.status(400).json({ success: false, message: "Invalid parameters." });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[order]] = await conn.query(
            "SELECT * FROM orders WHERE id = ? AND customer_id = ? LIMIT 1 FOR UPDATE",
            [actualOrderId, userId]
        );

        if (!order) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        const [[payment]] = await conn.query(
            "SELECT * FROM payments WHERE order_id = ? LIMIT 1 FOR UPDATE",
            [actualOrderId]
        );

        if (!payment) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ success: false, message: "Payment record not found." });
        }

        if (order.payment_status === "paid" || payment.status === "success") {
            await conn.commit();
            conn.release();
            return res.json({ success: true, message: "Payment already verified.", redirectUrl: `/checkout/success/${actualOrderId}` });
        }

        const crypto = require("crypto");
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        let isSignatureValid = false;
        try {
            const genBuffer = Buffer.from(generatedSignature, "utf-8");
            const sigBuffer = Buffer.from(razorpay_signature, "utf-8");
            if (genBuffer.length === sigBuffer.length) {
                isSignatureValid = crypto.timingSafeEqual(genBuffer, sigBuffer);
            }
        } catch (err) {
            console.error("Signature security comparison error:", err);
        }

        if (!isSignatureValid) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature." });
        }

        await conn.query(
            `UPDATE orders 
             SET payment_status = 'paid', order_status = 'confirmed', 
                 razorpay_order_id = ?, razorpay_payment_id = ?, razorpay_signature = ? 
             WHERE id = ?`,
            [razorpay_order_id, razorpay_payment_id, razorpay_signature, actualOrderId]
        );

        await conn.query(
            `UPDATE payments 
             SET status = 'success', razorpay_payment_id = ?, razorpay_order_id = ?, razorpay_signature = ?, paid_at = NOW() 
             WHERE order_id = ?`,
            [razorpay_payment_id, razorpay_order_id, razorpay_signature, actualOrderId]
        );

        const [carts] = await conn.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [userId]);
        if (carts.length > 0) {
            const cartId = carts[0].id;
            await conn.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);
            try {
                await conn.query("DELETE FROM cart WHERE user_id = ?", [userId]);
            } catch (flatErr) {
                console.error("Flat cart table clear error:", flatErr.message);
            }
        }

        await conn.commit();
        conn.release();

        return res.json({ success: true, redirectUrl: `/checkout/success/${actualOrderId}` });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error("Error verifying payments:", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// POST /checkout/payment/cancel - Handles customer cancelling secure payment
router.post("/checkout/payment/cancel", ensureAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const { orderId } = req.body;

    if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required." });
    }

    try {
        const [[order]] = await pool.query(
            "SELECT * FROM orders WHERE id = ? AND customer_id = ? LIMIT 1",
            [orderId, userId]
        );

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        if (order.payment_status !== 'failed' && order.order_status !== 'cancelled') {
            await pool.query(
                "UPDATE orders SET payment_status = 'failed', order_status = 'cancelled' WHERE id = ?",
                [orderId]
            );

            await pool.query(
                "UPDATE payments SET status = 'failed' WHERE order_id = ?",
                [orderId]
            );

            const [items] = await pool.query("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [orderId]);
            for (const item of items) {
                await pool.query("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", [item.quantity, item.product_id]);
            }
        }

        req.flash("error", "Payment cancelled. Items remain in your cart.");
        return res.json({ success: true, redirectUrl: "/cart" });
    } catch (err) {
        console.error("Error cancelling order:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// POST /webhooks/razorpay - Handles secure Razorpay webhook callbacks
router.post("/webhooks/razorpay", async (req, res) => {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!signature) {
        return res.status(400).json({ success: false, message: "Missing signature header." });
    }

    try {
        const crypto = require("crypto");
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(req.rawBody || "")
            .digest("hex");

        if (signature !== expectedSignature) {
            console.error("❌ Webhook verification failed. Invalid signature.");
            return res.status(400).json({ success: false, message: "Invalid signature." });
        }

        const event = req.body.event;
        const payload = req.body.payload;

        console.log(`🔔 Razorpay Webhook Event: ${event}`);

        if (event === "order.paid" || event === "payment.captured") {
            const paymentEntity = payload.payment.entity;
            const razorpayOrderId = paymentEntity.order_id;
            const razorpayPaymentId = paymentEntity.id;
            const razorpaySignature = signature;

            const [[paymentRecord]] = await pool.query(
                "SELECT * FROM payments WHERE razorpay_order_id = ? LIMIT 1",
                [razorpayOrderId]
            );

            if (paymentRecord) {
                const internalOrderId = paymentRecord.order_id;

                if (paymentRecord.status !== "success") {
                    const conn = await pool.getConnection();
                    try {
                        await conn.beginTransaction();

                        await conn.query(
                            `UPDATE orders 
                             SET payment_status = 'paid', order_status = 'confirmed',
                                 razorpay_order_id = ?, razorpay_payment_id = ?, razorpay_signature = ?
                             WHERE id = ?`,
                            [razorpayOrderId, razorpayPaymentId, razorpaySignature, internalOrderId]
                        );

                        await conn.query(
                            `UPDATE payments 
                             SET status = 'success', razorpay_payment_id = ?, razorpay_signature = ?, paid_at = NOW() 
                             WHERE order_id = ?`,
                            [razorpayPaymentId, razorpaySignature, internalOrderId]
                        );

                        const [[orderRecord]] = await conn.query(
                            "SELECT customer_id FROM orders WHERE id = ? LIMIT 1",
                            [internalOrderId]
                        );

                        if (orderRecord) {
                            const customerId = orderRecord.customer_id;
                            const [carts] = await conn.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [customerId]);
                            if (carts.length > 0) {
                                const cartId = carts[0].id;
                                await conn.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);
                                try {
                                    await conn.query("DELETE FROM cart WHERE user_id = ?", [customerId]);
                                } catch (flatErr) {}
                            }
                        }

                        await conn.commit();
                        conn.release();
                        console.log(`✅ Webhook processed payment successfully for Order ID: ${internalOrderId}`);
                    } catch (dbErr) {
                        await conn.rollback();
                        conn.release();
                        console.error("Error inside webhook transaction:", dbErr);
                        return res.status(500).json({ success: false, message: "Database transaction update failed." });
                    }
                }
            }
        } else if (event === "payment.failed") {
            const paymentEntity = payload.payment.entity;
            const razorpayOrderId = paymentEntity.order_id;

            const [[paymentRecord]] = await pool.query(
                "SELECT * FROM payments WHERE razorpay_order_id = ? LIMIT 1",
                [razorpayOrderId]
            );

            if (paymentRecord && paymentRecord.status === "pending") {
                const internalOrderId = paymentRecord.order_id;
                
                await pool.query("UPDATE orders SET payment_status = 'failed' WHERE id = ?", [internalOrderId]);
                await pool.query("UPDATE payments SET status = 'failed' WHERE id = ?", [paymentRecord.id]);

                const [items] = await pool.query("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [internalOrderId]);
                for (const item of items) {
                    await pool.query("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", [item.quantity, item.product_id]);
                }
                console.log(`❌ Webhook processed transaction failure for Order ID: ${internalOrderId}`);
            }
        }

        return res.json({ status: "ok" });
    } catch (err) {
        console.error("Error processing Razorpay webhook:", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// GET /checkout/success/:orderId - Renders success page
router.get("/checkout/success/:orderId", ensureAuthenticated, async (req, res, next) => {
    const userId = req.session.user.id;
    const orderId = req.params.orderId;

    try {
        const [[order]] = await pool.query(
            `SELECT o.*, a.full_name as address_name, a.address_line1, a.address_line2, a.city, a.state, a.pincode, a.mobile as address_mobile,
                    p.payment_method, p.razorpay_payment_id, p.status as payment_status_detail
             FROM orders o
             JOIN addresses a ON o.address_id = a.id
             LEFT JOIN payments p ON o.id = p.order_id
             WHERE o.id = ? AND o.customer_id = ? LIMIT 1`,
            [orderId, userId]
        );

        if (!order) {
            req.flash("error", "Order not found.");
            return res.redirect("/");
        }

        res.render("user/success", {
            title: "Order Placed Successfully! - Drinkit",
            order
        });
    } catch (err) {
        console.error("Error loading success page:", err);
        next(err);
    }
});

// GET /orders - User's order history
router.get("/orders", ensureAuthenticated, async (req, res, next) => {
    const userId = req.session.user.id;
    try {
        const [orders] = await pool.query(
            `SELECT o.*, 
                    (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
             FROM orders o
             WHERE o.customer_id = ?
             ORDER BY o.created_at DESC`,
            [userId]
        );

        // Fetch products preview details for each order card
        for (let order of orders) {
            const [items] = await pool.query(
                "SELECT product_name, quantity, unit_price FROM order_items WHERE order_id = ?",
                [order.id]
            );
            order.items = items;
        }

        res.render("user/orders", {
            title: "My Orders - Drinkit",
            orders
        });
    } catch (err) {
        console.error("Error fetching user orders:", err);
        next(err);
    }
});

// GET /orders/:id - Visual status tracker for order
router.get("/orders/:id", ensureAuthenticated, async (req, res, next) => {
    const userId = req.session.user.id;
    const orderId = req.params.id;

    try {
        const [[order]] = await pool.query(
            `SELECT o.*, a.full_name as address_name, a.address_line1, a.address_line2, a.city, a.state, a.pincode, a.mobile as address_mobile
             FROM orders o
             JOIN addresses a ON o.address_id = a.id
             WHERE o.id = ? AND o.customer_id = ? LIMIT 1`,
            [orderId, userId]
        );

        if (!order) {
            req.flash("error", "Order not found.");
            return res.redirect("/orders");
        }

        const [items] = await pool.query(
            "SELECT * FROM order_items WHERE order_id = ?",
            [orderId]
        );

        res.render("user/order-details", {
            title: `Order Tracking #${order.order_number} - Drinkit`,
            order,
            items
        });
    } catch (err) {
        console.error("Error loading order details:", err);
        next(err);
    }
});

module.exports = router;