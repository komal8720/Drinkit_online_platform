-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: bfrxaebtg3xpyz3tk8ni-mysql.services.clever-cloud.com:3306
-- Generation Time: Aug 27, 2026 at 06:55 AM
-- Server version: 8.0.22-13
-- PHP Version: 8.2.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bfrxaebtg3xpyz3tk8ni`
--

-- --------------------------------------------------------

--
-- Table structure for table `addresses`
--

CREATE TABLE `addresses` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `address_type` enum('home','work','other') DEFAULT 'home',
  `full_name` varchar(150) NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `address_line1` varchar(255) NOT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `pincode` varchar(20) NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `addresses`
--

INSERT INTO `addresses` (`id`, `user_id`, `address_type`, `full_name`, `mobile`, `address_line1`, `address_line2`, `city`, `state`, `pincode`, `latitude`, `longitude`, `is_default`, `created_at`, `updated_at`) VALUES
(1, 1, 'home', 'Rutwik Ghule', '7498424207', 'Near Chobhe hospital sudke mala balikaashram road ahilyanagar', NULL, 'Ahilyanagar', 'Maharashtra', '414201', NULL, NULL, 0, '2026-08-27 06:11:00', '2026-08-27 06:11:00'),
(2, 5, 'home', 'Komal Khandave', '9322200648', 'Near Chobhe hospital sudke mala balikaashram road ahilyanagar', NULL, 'Ahilyanagar', 'Maharashtra', '414201', NULL, NULL, 0, '2026-08-27 06:17:15', '2026-08-27 06:17:15');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `module` varchar(100) DEFAULT NULL,
  `description` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `banners`
--

CREATE TABLE `banners` (
  `id` int UNSIGNED NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `subtitle` varchar(255) DEFAULT NULL,
  `image` varchar(255) NOT NULL,
  `button_text` varchar(100) DEFAULT NULL,
  `button_url` varchar(255) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `status` enum('active','inactive') DEFAULT 'active',
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `brands`
--

CREATE TABLE `brands` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(180) NOT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `description` text,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `brands`
--

INSERT INTO `brands` (`id`, `name`, `slug`, `logo`, `description`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Sula Vineyards', 'sula', NULL, NULL, 'active', '2026-08-25 04:21:07', '2026-08-25 04:21:07'),
(2, 'Jacob\'s Creek', 'jacobs-creek', NULL, NULL, 'active', '2026-08-25 04:21:08', '2026-08-25 04:21:08'),
(3, 'Budweiser', 'budweiser', NULL, NULL, 'active', '2026-08-25 04:21:08', '2026-08-25 04:21:08'),
(4, 'Kingfisher', 'kingfisher', NULL, NULL, 'active', '2026-08-25 04:21:08', '2026-08-25 04:21:08'),
(5, 'Jack Daniel\'s', 'jack-daniels', NULL, NULL, 'active', '2026-08-25 04:21:09', '2026-08-25 04:21:09'),
(6, 'Coca-Cola', 'coca-cola', NULL, NULL, 'active', '2026-08-25 04:21:09', '2026-08-25 04:21:09'),
(7, 'Lay\'s', 'lays', NULL, NULL, 'active', '2026-08-25 04:21:10', '2026-08-25 04:21:10'),
(8, 'Banarasi Special', 'banarasi', NULL, NULL, 'active', '2026-08-25 04:58:38', '2026-08-25 04:58:38'),
(9, 'Nestle', 'nestle', NULL, NULL, 'active', '2026-08-26 11:54:05', '2026-08-26 11:54:05'),
(10, 'Sunfeast', 'sunfeast', NULL, NULL, 'active', '2026-08-26 11:54:06', '2026-08-26 11:54:06'),
(11, 'Parle', 'parle', NULL, NULL, 'active', '2026-08-26 11:54:06', '2026-08-26 11:54:06'),
(12, 'Britannia', 'britannia', NULL, NULL, 'active', '2026-08-26 11:54:07', '2026-08-26 11:54:07'),
(13, 'Oreo', 'oreo', NULL, NULL, 'active', '2026-08-26 11:54:08', '2026-08-26 11:54:08'),
(14, 'Haldiram\'s', 'haldirams', NULL, NULL, 'active', '2026-08-26 11:54:08', '2026-08-26 11:54:08'),
(15, 'PepsiCo', 'pepsico', NULL, NULL, 'active', '2026-08-26 11:54:08', '2026-08-26 11:54:08'),
(16, 'Marlboro', 'marlboro', NULL, NULL, 'active', '2026-08-26 12:30:43', '2026-08-26 12:30:43'),
(17, 'Classic', 'classic', NULL, NULL, 'active', '2026-08-26 12:30:43', '2026-08-26 12:30:43'),
(18, 'Gold Flake', 'gold-flake', NULL, NULL, 'active', '2026-08-26 12:30:44', '2026-08-26 12:30:44'),
(19, 'Raw', 'raw', NULL, NULL, 'active', '2026-08-26 12:30:44', '2026-08-26 12:30:44'),
(20, 'Bic', 'bic', NULL, NULL, 'active', '2026-08-26 12:30:44', '2026-08-26 12:30:44');

-- --------------------------------------------------------

--
-- Table structure for table `cart`
--

CREATE TABLE `cart` (
  `cart_id` int NOT NULL,
  `user_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `cart`
--

INSERT INTO `cart` (`cart_id`, `user_id`, `product_id`, `quantity`, `created_at`, `updated_at`) VALUES
(1, 1, 3, 1, '2026-08-25 05:01:03', '2026-08-25 05:11:27'),
(1, 1, 8, 1, '2026-08-25 05:02:48', '2026-08-27 05:24:52'),
(1, 1, 6, 1, '2026-08-25 05:26:43', '2026-08-27 05:25:20'),
(3, 4, 2, 1, '2026-08-25 06:07:25', '2026-08-25 06:07:25'),
(3, 4, 13, 1, '2026-08-25 06:07:51', '2026-08-25 06:07:51'),
(3, 4, 17, 1, '2026-08-25 06:08:22', '2026-08-25 06:08:22'),
(1, 1, 2, 1, '2026-08-26 06:14:16', '2026-08-26 06:14:16'),
(1, 1, 5, 1, '2026-08-26 11:09:49', '2026-08-26 11:09:49'),
(1, 1, 12, 1, '2026-08-27 04:49:32', '2026-08-27 04:49:32'),
(1, 1, 39, 2, '2026-08-27 05:20:55', '2026-08-27 05:21:04'),
(1, 1, 18, 1, '2026-08-27 05:22:17', '2026-08-27 05:22:17'),
(1, 1, 29, 1, '2026-08-27 05:25:57', '2026-08-27 05:25:57'),
(1, 1, 32, 1, '2026-08-27 05:26:14', '2026-08-27 05:26:21');

-- --------------------------------------------------------

--
-- Table structure for table `carts`
--

CREATE TABLE `carts` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `carts`
--

INSERT INTO `carts` (`id`, `user_id`, `created_at`, `updated_at`) VALUES
(1, 1, '2026-08-25 05:01:02', '2026-08-25 05:01:02'),
(2, 5, '2026-08-25 05:28:11', '2026-08-25 05:28:11'),
(3, 4, '2026-08-25 06:07:15', '2026-08-25 06:07:15');

-- --------------------------------------------------------

--
-- Table structure for table `cart_items`
--

CREATE TABLE `cart_items` (
  `id` bigint UNSIGNED NOT NULL,
  `cart_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `quantity` int UNSIGNED NOT NULL DEFAULT '1',
  `price` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `cart_items`
--

INSERT INTO `cart_items` (`id`, `cart_id`, `product_id`, `quantity`, `price`, `created_at`, `updated_at`) VALUES
(1, 1, 3, 1, 780.00, '2026-08-25 05:01:02', '2026-08-25 05:11:26'),
(2, 1, 8, 1, 160.00, '2026-08-25 05:02:48', '2026-08-27 05:24:52'),
(3, 1, 6, 1, 180.00, '2026-08-25 05:26:42', '2026-08-27 05:25:20'),
(14, 3, 2, 1, 850.00, '2026-08-25 06:07:25', '2026-08-25 06:07:25'),
(15, 3, 13, 1, 20.00, '2026-08-25 06:07:51', '2026-08-25 06:07:51'),
(16, 3, 17, 1, 45.00, '2026-08-25 06:08:22', '2026-08-25 06:08:22'),
(17, 1, 2, 1, 850.00, '2026-08-26 06:14:16', '2026-08-26 06:14:16'),
(19, 1, 5, 1, 1180.00, '2026-08-26 11:09:49', '2026-08-26 11:09:49'),
(22, 1, 12, 1, 20.00, '2026-08-27 04:49:32', '2026-08-27 04:49:32'),
(23, 1, 39, 2, 240.00, '2026-08-27 05:20:55', '2026-08-27 05:21:03'),
(24, 1, 18, 1, 2800.00, '2026-08-27 05:22:17', '2026-08-27 05:22:17'),
(25, 1, 29, 1, 30.00, '2026-08-27 05:25:56', '2026-08-27 05:25:56'),
(26, 1, 32, 1, 40.00, '2026-08-27 05:26:13', '2026-08-27 05:26:21');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `description` text,
  `image` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `image`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Wine', 'wine', 'Explore our complete wine collection.', NULL, 'active', '2026-08-25 04:21:06', '2026-08-25 04:21:06'),
(2, 'Beer', 'beer', 'Chill and enjoy our cold beer selection.', NULL, 'active', '2026-08-25 04:21:06', '2026-08-25 04:21:06'),
(3, 'Spirits', 'spirits', 'Whisky, vodka, rum and premium spirits.', NULL, 'active', '2026-08-25 04:21:06', '2026-08-25 04:21:06'),
(4, 'Soft Drinks', 'soft-drinks', 'Refreshing carbonated beverages.', '/uploads/image-1787808474343-38120385.png', 'active', '2026-08-25 04:21:06', '2026-08-27 05:27:54'),
(5, 'Snacks', 'snacks', 'Chips, nuts and crunchy munchies.', NULL, 'active', '2026-08-25 04:21:07', '2026-08-25 04:21:07'),
(6, 'Smoke', 'smoke', 'Premium tobacco and smoking collections.', NULL, 'active', '2026-08-25 04:21:07', '2026-08-25 04:21:07'),
(7, 'Pan', 'pan', 'Discover refreshing flavours and premium pan selections.', NULL, 'active', '2026-08-25 04:58:37', '2026-08-25 04:58:37');

-- --------------------------------------------------------

--
-- Table structure for table `commission`
--

CREATE TABLE `commission` (
  `commission_id` int NOT NULL,
  `shop_owner_id` int NOT NULL,
  `order_id` int NOT NULL,
  `commission_type` enum('percentage','fixed') NOT NULL,
  `commission_value` decimal(10,2) NOT NULL,
  `commission_amount` decimal(10,2) NOT NULL,
  `shop_owner_amount` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `commissions`
--

CREATE TABLE `commissions` (
  `id` bigint UNSIGNED NOT NULL,
  `vendor_id` bigint UNSIGNED NOT NULL,
  `order_id` bigint UNSIGNED NOT NULL,
  `order_amount` decimal(12,2) NOT NULL,
  `commission_percentage` decimal(5,2) NOT NULL,
  `commission_amount` decimal(12,2) NOT NULL,
  `vendor_amount` decimal(12,2) NOT NULL,
  `status` enum('pending','processed','paid') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `coupons`
--

CREATE TABLE `coupons` (
  `id` int UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `discount_type` enum('percentage','fixed') NOT NULL,
  `discount_value` decimal(12,2) NOT NULL,
  `minimum_order_amount` decimal(12,2) DEFAULT '0.00',
  `maximum_discount` decimal(12,2) DEFAULT NULL,
  `usage_limit` int UNSIGNED DEFAULT NULL,
  `used_count` int UNSIGNED DEFAULT '0',
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `status` enum('active','inactive','expired') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `delivery_assignments`
--

CREATE TABLE `delivery_assignments` (
  `id` bigint UNSIGNED NOT NULL,
  `order_id` bigint UNSIGNED NOT NULL,
  `delivery_partner_id` bigint UNSIGNED NOT NULL,
  `status` enum('assigned','accepted','picked_up','out_for_delivery','delivered','cancelled') DEFAULT 'assigned',
  `pickup_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `delivery_partners`
--

CREATE TABLE `delivery_partners` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `vehicle_type` varchar(50) DEFAULT NULL,
  `vehicle_number` varchar(50) DEFAULT NULL,
  `driving_license` varchar(100) DEFAULT NULL,
  `verification_status` enum('pending','approved','rejected','suspended') DEFAULT 'pending',
  `availability_status` enum('offline','available','busy') DEFAULT 'offline',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `inventory_id` int NOT NULL,
  `product_id` int NOT NULL,
  `available_quantity` int NOT NULL DEFAULT '0',
  `reserved_quantity` int NOT NULL DEFAULT '0',
  `low_stock_limit` int NOT NULL DEFAULT '5',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `offers`
--

CREATE TABLE `offers` (
  `id` int UNSIGNED NOT NULL,
  `vendor_id` bigint UNSIGNED DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `discount_type` enum('percentage','fixed') NOT NULL,
  `discount_value` decimal(12,2) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `status` enum('active','inactive','expired') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` bigint UNSIGNED NOT NULL,
  `order_number` varchar(50) NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `address_id` bigint UNSIGNED NOT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `delivery_charge` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_status` enum('pending','paid','failed','refunded') DEFAULT 'pending',
  `order_status` enum('pending','confirmed','preparing','ready_for_pickup','picked_up','out_for_delivery','delivered','cancelled','rejected') DEFAULT 'pending',
  `customer_note` text,
  `placed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `order_number`, `customer_id`, `address_id`, `subtotal`, `discount_amount`, `delivery_charge`, `tax_amount`, `total_amount`, `payment_status`, `order_status`, `customer_note`, `placed_at`, `delivered_at`, `cancelled_at`, `created_at`, `updated_at`) VALUES
(1, 'DI1787812172181593', 5, 2, 830.00, 0.00, 0.00, 0.00, 830.00, 'paid', 'confirmed', NULL, '2026-08-27 06:29:32', NULL, NULL, '2026-08-27 06:29:32', '2026-08-27 06:29:49');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` bigint UNSIGNED NOT NULL,
  `order_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `vendor_id` bigint UNSIGNED NOT NULL,
  `product_name` varchar(200) NOT NULL,
  `quantity` int UNSIGNED NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `total_price` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `vendor_id`, `product_name`, `quantity`, `unit_price`, `total_price`, `created_at`) VALUES
(1, 1, 34, 1, 'Marlboro Gold Lights Cigarette Pack', 1, 350.00, 350.00, '2026-08-27 06:29:32'),
(2, 1, 39, 1, 'No 1 brandy', 2, 240.00, 480.00, '2026-08-27 06:29:32');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` bigint UNSIGNED NOT NULL,
  `order_id` bigint UNSIGNED NOT NULL,
  `payment_method` enum('cod','online','upi','card') NOT NULL,
  `transaction_id` varchar(150) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` enum('pending','success','failed','refunded') DEFAULT 'pending',
  `payment_response` json DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `order_id`, `payment_method`, `transaction_id`, `amount`, `status`, `payment_response`, `paid_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'upi', 'TXN-1787812189292435', 830.00, 'success', NULL, '2026-08-27 06:29:49', '2026-08-27 06:29:33', '2026-08-27 06:29:49');

-- --------------------------------------------------------

--
-- Table structure for table `platform_settings`
--

CREATE TABLE `platform_settings` (
  `id` int UNSIGNED NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `setting_type` varchar(50) DEFAULT 'text',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `platform_settings`
--

INSERT INTO `platform_settings` (`id`, `setting_key`, `setting_value`, `setting_type`, `updated_at`) VALUES
(1, 'platform_name', 'Drinkit', 'text', '2026-08-19 17:03:20'),
(2, 'currency', 'INR', 'text', '2026-08-19 17:03:20'),
(3, 'commission_percentage', '10', 'number', '2026-08-19 17:03:20'),
(4, 'minimum_order_amount', '100', 'number', '2026-08-19 17:03:20'),
(5, 'delivery_charge', '40', 'number', '2026-08-19 17:03:20');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` bigint UNSIGNED NOT NULL,
  `vendor_id` bigint UNSIGNED NOT NULL,
  `category_id` int UNSIGNED NOT NULL,
  `brand_id` int UNSIGNED DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `slug` varchar(220) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `description` text,
  `bottle_size` varchar(50) DEFAULT NULL,
  `alcohol_percentage` decimal(5,2) DEFAULT NULL,
  `price` decimal(12,2) NOT NULL,
  `sale_price` decimal(12,2) DEFAULT NULL,
  `stock_quantity` int UNSIGNED DEFAULT '0',
  `min_order_quantity` int UNSIGNED DEFAULT '1',
  `max_order_quantity` int UNSIGNED DEFAULT '10',
  `image` varchar(255) DEFAULT NULL,
  `status` enum('draft','pending','approved','rejected','inactive') DEFAULT 'pending',
  `is_featured` tinyint(1) DEFAULT '0',
  `is_age_restricted` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `vendor_id`, `category_id`, `brand_id`, `name`, `slug`, `sku`, `description`, `bottle_size`, `alcohol_percentage`, `price`, `sale_price`, `stock_quantity`, `min_order_quantity`, `max_order_quantity`, `image`, `status`, `is_featured`, `is_age_restricted`, `created_at`, `updated_at`) VALUES
(2, 1, 1, 1, 'Sula Shiraz Cabernet', 'sula-shiraz-cabernet', 'SKU-WINE-9296', NULL, '750ml', NULL, 850.00, 900.00, 0, 1, 10, '/images/red-wine.jpg', 'approved', 1, 1, '2026-08-25 04:22:27', '2026-08-25 04:22:27'),
(3, 1, 1, 1, 'Sula Chenin Blanc', 'sula-chenin-blanc', 'SKU-WINE-8294', NULL, '750ml', NULL, 780.00, 820.00, 0, 1, 10, '/images/white-wine.jpg', 'approved', 0, 1, '2026-08-25 04:22:28', '2026-08-25 04:22:28'),
(4, 1, 1, 2, 'Jacob\'s Creek Cabernet Shiraz', 'jacobs-creek-cab-shiraz', 'SKU-WINE-5701', NULL, '750ml', NULL, 1250.00, 1350.00, 0, 1, 10, '/images/red-wine.jpg', 'approved', 1, 1, '2026-08-25 04:22:28', '2026-08-25 04:22:28'),
(5, 1, 1, 2, 'Jacob\'s Creek Classic Chardonnay', 'jacobs-creek-chardonnay', 'SKU-WINE-8377', NULL, '750ml', NULL, 1180.00, 1250.00, 0, 1, 10, '/images/white-wine.jpg', 'approved', 0, 1, '2026-08-25 04:22:29', '2026-08-25 04:22:29'),
(6, 1, 2, 3, 'Budweiser Premium Beer', 'budweiser-premium', 'SKU-BEER-4824', NULL, '650ml', NULL, 180.00, 200.00, 0, 1, 10, '/images/beer-1.jpg', 'approved', 1, 1, '2026-08-25 04:22:29', '2026-08-25 04:22:29'),
(7, 1, 2, 3, 'Budweiser Magnum Strong', 'budweiser-magnum', 'SKU-BEER-8203', NULL, '650ml', NULL, 220.00, 240.00, 0, 1, 10, '/images/beer-2.jpg', 'approved', 1, 1, '2026-08-25 04:22:30', '2026-08-25 04:22:30'),
(8, 1, 2, 4, 'Kingfisher Premium Lager', 'kingfisher-premium', 'SKU-BEER-7383', NULL, '650ml', NULL, 160.00, 180.00, 0, 1, 10, '/images/beer-3.jpg', 'approved', 0, 1, '2026-08-25 04:22:30', '2026-08-25 04:22:30'),
(9, 1, 2, 4, 'Kingfisher Strong Extra Beer', 'kingfisher-strong', 'SKU-BEER-2185', NULL, '650ml', NULL, 170.00, 190.00, 0, 1, 10, '/images/beer-4.jpg', 'approved', 0, 1, '2026-08-25 04:22:30', '2026-08-25 04:22:30'),
(10, 1, 4, 6, 'Coca-Cola Classic', 'coca-cola-classic', 'SKU-SOFT-DRINKS-5127', NULL, '500ml', NULL, 40.00, 45.00, 0, 1, 10, '/images/co-co_cola.jpg', 'approved', 0, 1, '2026-08-25 04:22:31', '2026-08-25 04:22:31'),
(11, 1, 4, 6, 'Diet Coke Zero Sugar', 'diet-coke-zero', 'SKU-SOFT-DRINKS-8325', NULL, '500ml', NULL, 45.00, 50.00, 0, 1, 10, '/images/limca.jpg', 'approved', 0, 1, '2026-08-25 04:22:31', '2026-08-25 04:22:31'),
(12, 1, 5, 7, 'Lay\'s Classic Salted', 'lays-classic-salted', 'SKU-SNACKS-6346', NULL, '50g', NULL, 20.00, 20.00, 0, 1, 10, '/images/crispybananachips.jpg', 'approved', 0, 1, '2026-08-25 04:22:31', '2026-08-25 04:22:31'),
(13, 1, 5, 7, 'Lay\'s American Style Onion & Sour Cream', 'lays-onion-cream', 'SKU-SNACKS-1891', NULL, '50g', NULL, 20.00, 20.00, 0, 1, 10, '/images/lays_onion_cream.jpg', 'approved', 0, 1, '2026-08-25 04:22:32', '2026-08-26 12:13:49'),
(14, 1, 7, 8, 'Classic Meetha Paan', 'classic-meetha-paan', 'SKU-PAN-1892', NULL, '1 pc', NULL, 40.00, 45.00, 0, 1, 10, '/images/pan1.jpg', 'approved', 1, 1, '2026-08-25 04:58:41', '2026-08-25 04:58:41'),
(15, 1, 7, 8, 'Chocolate Paan', 'chocolate-paan', 'SKU-PAN-7882', NULL, '1 pc', NULL, 50.00, 55.00, 0, 1, 10, '/images/choclate-pan3.jpg', 'approved', 0, 1, '2026-08-25 04:58:41', '2026-08-25 04:58:41'),
(16, 1, 7, 8, 'Keshar Paan', 'keshar-paan', 'SKU-PAN-5674', NULL, '1 pc', NULL, 60.00, 65.00, 0, 1, 10, '/images/keshar-pan2.jpg', 'approved', 1, 1, '2026-08-25 04:58:41', '2026-08-25 04:58:41'),
(17, 1, 7, 8, 'Mouth Freshener Paan', 'mouth-freshener-paan', 'SKU-PAN-3561', NULL, '1 pc', NULL, 45.00, 50.00, 0, 1, 10, '/images/mouthfresher-pan5.jpg', 'approved', 0, 1, '2026-08-25 04:58:42', '2026-08-25 04:58:42'),
(18, 1, 3, 5, 'Jack Daniel\'s Tennessee Whiskey', 'jack-daniels-whiskey', 'SKU-SPIRITS-1700', NULL, '750ml', NULL, 2800.00, 3000.00, 0, 1, 10, '/images/spirits-1.jpg', 'approved', 1, 1, '2026-08-25 05:33:52', '2026-08-25 05:33:52'),
(19, 1, 3, 5, 'Jack Daniel\'s Honey Whiskey', 'jack-daniels-honey', 'SKU-SPIRITS-2282', NULL, '750ml', NULL, 2950.00, 3200.00, 0, 1, 10, '/images/spirits-2.jpg', 'approved', 0, 1, '2026-08-25 05:33:52', '2026-08-25 05:33:52'),
(20, 1, 3, 5, 'Jack Daniel\'s Single Barrel Whiskey', 'jack-daniels-single-barrel', 'SKU-SPIRITS-7595', NULL, '750ml', NULL, 4200.00, 4500.00, 0, 1, 10, '/images/spirits-3.jpg', 'approved', 1, 1, '2026-08-25 05:33:52', '2026-08-25 05:33:52'),
(21, 1, 3, 5, 'Jack Daniel\'s Gentleman Whiskey', 'jack-daniels-gentleman', 'SKU-SPIRITS-8535', NULL, '750ml', NULL, 3400.00, 3600.00, 0, 1, 10, '/images/spirits-4.jpg', 'approved', 0, 1, '2026-08-25 05:33:52', '2026-08-25 05:33:52'),
(22, 1, 5, 9, 'Maggi 2-Minute Masala Noodles', 'maggi-masala-noodles', 'SKU-SNACKS-MAGGI-1', NULL, '70g', NULL, 14.00, 14.00, 100, 1, 10, '/images/maggi_noodles.jpg', 'approved', 0, 1, '2026-08-26 11:54:09', '2026-08-26 12:13:47'),
(23, 1, 5, 9, 'Maggi Special Masala Noodles', 'maggi-special-masala', 'SKU-SNACKS-MAGGI-2', NULL, '70g', NULL, 16.00, 16.00, 100, 1, 10, '/images/maggi_noodles.jpg', 'approved', 0, 1, '2026-08-26 11:54:10', '2026-08-26 12:13:47'),
(24, 1, 5, 9, 'Maggi Vegetable Atta Noodles', 'maggi-atta-noodles', 'SKU-SNACKS-MAGGI-3', NULL, '72g', NULL, 28.00, 30.00, 100, 1, 10, '/images/maggi_atta_noodles.jpg', 'approved', 0, 1, '2026-08-26 11:54:10', '2026-08-26 12:13:48'),
(25, 1, 5, 10, 'Sunfeast Yippee Masala Noodles', 'yippee-masala-noodles', 'SKU-SNACKS-YIPPEE', NULL, '70g', NULL, 15.00, 15.00, 100, 1, 10, '/images/yippee_noodles.jpg', 'approved', 0, 1, '2026-08-26 11:54:10', '2026-08-26 12:13:48'),
(26, 1, 5, 11, 'Parle-G Gold Biscuits', 'parle-g-gold', 'SKU-SNACKS-PARLE-G', NULL, '110g', NULL, 10.00, 10.00, 100, 1, 10, '/images/parle_g_biscuits.jpg', 'approved', 0, 1, '2026-08-26 11:54:11', '2026-08-26 12:13:48'),
(27, 1, 5, 12, 'Britannia Good Day Cashew Cookies', 'good-day-cashew', 'SKU-SNACKS-GOOD-DAY', NULL, '100g', NULL, 20.00, 20.00, 100, 1, 10, '/images/good_day_cashew.jpg', 'approved', 0, 1, '2026-08-26 11:54:11', '2026-08-26 12:13:48'),
(28, 1, 5, 12, 'Britannia Bourbon Biscuits', 'britannia-bourbon', 'SKU-SNACKS-BOURBON', NULL, '150g', NULL, 25.00, 30.00, 100, 1, 10, '/images/bourbon_biscuits.jpg', 'approved', 0, 1, '2026-08-26 11:54:11', '2026-08-26 12:13:48'),
(29, 1, 5, 13, 'Oreo Original Chocolate Cream Biscuits', 'oreo-original', 'SKU-SNACKS-OREO', NULL, '120g', NULL, 30.00, 35.00, 100, 1, 10, '/images/oreo_cookies.jpg', 'approved', 0, 1, '2026-08-26 11:54:12', '2026-08-26 12:13:49'),
(30, 1, 5, 14, 'Haldiram\'s Aloo Bhujia Namkeen', 'haldirams-aloo-bhujia', 'SKU-SNACKS-ALOO-BHUJIA', NULL, '150g', NULL, 40.00, 40.00, 100, 1, 10, '/images/Allu_bhajia.jpg', 'approved', 0, 1, '2026-08-26 11:54:12', '2026-08-26 12:00:27'),
(31, 1, 5, 7, 'Doritos Cheese Nachos', 'doritos-cheese-nachos', 'SKU-SNACKS-DORITOS', NULL, '60g', NULL, 30.00, 35.00, 100, 1, 10, '/images/cheesenachos.jpg', 'approved', 0, 1, '2026-08-26 11:54:12', '2026-08-26 11:54:12'),
(32, 1, 4, 6, 'Sprite Lime Carbonated Drink', 'sprite-lime', 'SKU-SOFT-DRINKS-SPRITE', NULL, '750ml', NULL, 40.00, 40.00, 100, 1, 10, '/images/sprite.jpg', 'approved', 0, 1, '2026-08-26 11:54:13', '2026-08-26 12:00:27'),
(33, 1, 4, 15, 'Pepsi Cola Carbonated Drink', 'pepsi-cola', 'SKU-SOFT-DRINKS-PEPSI', NULL, '750ml', NULL, 40.00, 40.00, 100, 1, 10, '/images/pepsi.jpg', 'approved', 0, 1, '2026-08-26 11:54:13', '2026-08-26 12:00:27'),
(34, 1, 6, 16, 'Marlboro Gold Lights Cigarette Pack', 'marlboro-gold', 'SKU-SMOKE-MARLBORO', NULL, '20s Pack', NULL, 350.00, 350.00, 99, 1, 10, '/images/marlboro_gold.jpg', 'approved', 1, 1, '2026-08-26 12:30:44', '2026-08-27 06:29:32'),
(35, 1, 6, 17, 'Classic Milds Cigarette Pack', 'classic-milds', 'SKU-SMOKE-CLASSIC', NULL, '20s Pack', NULL, 340.00, 340.00, 100, 1, 10, '/images/classic_milds.jpg', 'approved', 0, 1, '2026-08-26 12:30:45', '2026-08-26 12:30:45'),
(36, 1, 6, 18, 'Gold Flake Kings Cigarette Pack', 'gold-flake-kings', 'SKU-SMOKE-GOLDFLAKE', NULL, '20s Pack', NULL, 330.00, 330.00, 100, 1, 10, '/uploads/image-1787802924083-381372839.png', 'approved', 0, 1, '2026-08-26 12:30:45', '2026-08-27 03:55:24'),
(37, 1, 6, 19, 'Raw Classic King Size Slim Rolling Papers', 'raw-rolling-papers', 'SKU-SMOKE-RAW', NULL, '32 Leaves', NULL, 120.00, 150.00, 100, 1, 10, '/images/raw_rolling_papers.jpg', 'approved', 0, 1, '2026-08-26 12:30:46', '2026-08-26 12:30:46'),
(38, 1, 6, 20, 'Bic Classic Pocket Lighter', 'bic-lighter', 'SKU-SMOKE-BIC', NULL, '1 Unit', NULL, 100.00, 100.00, 100, 1, 10, '/images/bic_lighter.jpg', 'approved', 0, 1, '2026-08-26 12:30:46', '2026-08-26 12:30:46'),
(39, 1, 1, 17, 'No 1 brandy', 'no-1-brandy-1787803178749', 'DRINK-GBZF55', 'this is 1st class wine', '650', 50.12, 240.00, 250.00, 33, 10, 10, '/uploads/image-1787803178280-312223391.png', 'approved', 1, 1, '2026-08-27 03:59:38', '2026-08-27 06:29:33');

-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `order_id` bigint UNSIGNED NOT NULL,
  `rating` tinyint UNSIGNED NOT NULL,
  `review_text` text,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'SUPER_ADMIN', 'Complete platform administrator', '2026-08-19 17:02:35'),
(2, 'VENDOR', 'Shop owner / beverage vendor', '2026-08-19 17:02:35'),
(3, 'CUSTOMER', 'Customer who purchases products', '2026-08-19 17:02:35'),
(4, 'DELIVERY_PARTNER', 'Delivery partner', '2026-08-19 17:02:35');

-- --------------------------------------------------------

--
-- Table structure for table `shops`
--

CREATE TABLE `shops` (
  `id` bigint UNSIGNED NOT NULL,
  `vendor_id` bigint UNSIGNED NOT NULL,
  `shop_name` varchar(200) NOT NULL,
  `description` text,
  `logo` varchar(255) DEFAULT NULL,
  `cover_image` varchar(255) DEFAULT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(20) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `opening_time` time DEFAULT NULL,
  `closing_time` time DEFAULT NULL,
  `status` enum('open','closed','inactive') DEFAULT 'open',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `shop_owners`
--

CREATE TABLE `shop_owners` (
  `shop_owner_id` int NOT NULL,
  `owner_name` varchar(100) NOT NULL,
  `shop_name` varchar(150) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(15) NOT NULL,
  `password` varchar(255) NOT NULL,
  `shop_address` text NOT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `shop_image` varchar(255) DEFAULT NULL,
  `license_number` varchar(100) DEFAULT NULL,
  `verification_document` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'inactive',
  `approval_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `shop_owners`
--

INSERT INTO `shop_owners` (`shop_owner_id`, `owner_name`, `shop_name`, `email`, `phone`, `password`, `shop_address`, `city`, `state`, `pincode`, `shop_image`, `license_number`, `verification_document`, `status`, `approval_status`, `created_at`, `updated_at`) VALUES
(1, 'Rajesh Patel', 'The Royal Vineyard', 'patel@royal.com', '9876543210', 'password', '12 Main Road, Pune', 'Pune', 'Maharashtra', '411001', '/img/shops/shop1.jpg', 'LIC12345', 'DOC123', 'active', 'approved', '2026-08-17 06:21:33', '2026-08-17 06:21:33'),
(2, 'Amol Deshmukh', 'Pune Wine Hub', 'deshmukh@pune.com', '9876543211', 'password', '45 Deccan Gymkhana, Pune', 'Pune', 'Maharashtra', '411004', '/img/shops/shop2.jpg', 'LIC12346', 'DOC124', 'active', 'approved', '2026-08-17 06:21:33', '2026-08-17 06:21:33'),
(3, 'Kiran Shah', 'Champagne Castle', 'shah@castle.com', '9876543212', 'password', '78 MG Road, Pune', 'Pune', 'Maharashtra', '411001', '/img/shops/shop3.jpg', 'LIC12347', 'DOC125', 'active', 'approved', '2026-08-17 06:21:34', '2026-08-17 06:21:34');

-- --------------------------------------------------------

--
-- Table structure for table `super_admins`
--

CREATE TABLE `super_admins` (
  `super_admin_id` int NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint UNSIGNED NOT NULL,
  `role_id` int UNSIGNED NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','suspended','pending') DEFAULT 'pending',
  `email_verified_at` datetime DEFAULT NULL,
  `mobile_verified_at` datetime DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `is_identity_verified` tinyint(1) DEFAULT '0',
  `identity_verified_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `role_id`, `first_name`, `last_name`, `email`, `mobile`, `password_hash`, `profile_image`, `status`, `email_verified_at`, `mobile_verified_at`, `date_of_birth`, `is_identity_verified`, `identity_verified_at`, `last_login_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'Rutwik', 'Ghule', 'rutwikghule07@gmail.com', '9876543210', '$2b$10$A3OfE7MXQ5shJ9ztSjNlCONQOU0yUXXmYLcSqmBbNXBAmzpguLUYu', NULL, 'active', NULL, NULL, '2005-11-20', 1, '2026-08-27 06:13:30', '2026-08-27 06:08:41', '2026-08-22 07:05:16', '2026-08-27 06:13:30'),
(2, 1, 'Sanjay', 'Ghule', 'rutwikghule66@gmail.com', '7020380306', '$2b$10$8jkWA1B9uJKa/jpw2pIdqet/mDg9gR.iSLqYyZC.I9VV.fQYyU93m', NULL, 'active', NULL, NULL, NULL, 0, NULL, '2026-08-23 19:29:59', '2026-08-23 19:29:39', '2026-08-23 19:29:59'),
(3, 1, 'Rutwik', 'Ghule', 'rutwikghule27@gmail.com', '7498424207', '$2b$10$juV7NS5EFD2D5dCcSEZaAO/OjjTTsYQ33qObNDM2.GsGAaYRtdjw.', NULL, 'active', NULL, NULL, NULL, 0, NULL, NULL, '2026-08-23 19:54:54', '2026-08-23 19:54:54'),
(4, 1, 'Purva', 'Kokate', 'purvakokate01@gmail.com', '9209227727', '$2b$10$Kdo8rwE0kA6gaADzUkqIK.hsOygocdKSpKN5.72yuRG/BrBE2RBb2', NULL, 'active', NULL, NULL, NULL, 0, NULL, '2026-08-25 06:06:27', '2026-08-24 04:33:45', '2026-08-25 06:06:27'),
(5, 1, 'Komal', 'khandave', 'komalkhandave8720@gmail.com', '9322200648', '$2b$10$g//AdWVek5noJN4xT2AMaeUfltJIemkL6w2Z92gjXxqZe4StWocYK', NULL, 'active', NULL, NULL, '1998-02-10', 1, '2026-08-27 06:17:57', '2026-08-27 06:37:45', '2026-08-24 09:43:27', '2026-08-27 06:37:45');

-- --------------------------------------------------------

--
-- Table structure for table `vendors`
--

CREATE TABLE `vendors` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `business_name` varchar(200) NOT NULL,
  `owner_name` varchar(150) NOT NULL,
  `business_email` varchar(150) DEFAULT NULL,
  `business_mobile` varchar(20) DEFAULT NULL,
  `license_number` varchar(150) DEFAULT NULL,
  `license_document` varchar(255) DEFAULT NULL,
  `verification_status` enum('pending','approved','rejected','suspended') DEFAULT 'pending',
  `rejection_reason` text,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `vendors`
--

INSERT INTO `vendors` (`id`, `user_id`, `business_name`, `owner_name`, `business_email`, `business_mobile`, `license_number`, `license_document`, `verification_status`, `rejection_reason`, `approved_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'Drinkit Shop', 'Test Vendor', 'shop@drinkit.com', '9876543210', NULL, NULL, 'approved', NULL, NULL, '2026-08-25 04:22:25', '2026-08-25 04:22:25');

-- --------------------------------------------------------

--
-- Table structure for table `wishlist`
--

CREATE TABLE `wishlist` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `addresses`
--
ALTER TABLE `addresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_addresses_user` (`user_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_user` (`user_id`),
  ADD KEY `idx_audit_action` (`action`),
  ADD KEY `idx_audit_created` (`created_at`);

--
-- Indexes for table `banners`
--
ALTER TABLE `banners`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `brands`
--
ALTER TABLE `brands`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `carts`
--
ALTER TABLE `carts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_cart_product` (`cart_id`,`product_id`),
  ADD KEY `fk_cart_items_product` (`product_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `commissions`
--
ALTER TABLE `commissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_commissions_vendor` (`vendor_id`),
  ADD KEY `idx_commissions_order` (`order_id`);

--
-- Indexes for table `coupons`
--
ALTER TABLE `coupons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `delivery_assignments`
--
ALTER TABLE `delivery_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_id` (`order_id`),
  ADD KEY `fk_delivery_assignment_partner` (`delivery_partner_id`);

--
-- Indexes for table `delivery_partners`
--
ALTER TABLE `delivery_partners`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user` (`user_id`),
  ADD KEY `idx_notifications_read` (`is_read`);

--
-- Indexes for table `offers`
--
ALTER TABLE `offers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_offers_vendor` (`vendor_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD KEY `fk_orders_address` (`address_id`),
  ADD KEY `idx_orders_customer` (`customer_id`),
  ADD KEY `idx_orders_status` (`order_status`),
  ADD KEY `idx_orders_payment_status` (`payment_status`),
  ADD KEY `idx_orders_created` (`created_at`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_order_items_product` (`product_id`),
  ADD KEY `idx_order_items_order` (`order_id`),
  ADD KEY `idx_order_items_vendor` (`vendor_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_id` (`order_id`),
  ADD KEY `idx_payments_transaction` (`transaction_id`);

--
-- Indexes for table `platform_settings`
--
ALTER TABLE `platform_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `idx_products_vendor` (`vendor_id`),
  ADD KEY `idx_products_category` (`category_id`),
  ADD KEY `idx_products_brand` (`brand_id`),
  ADD KEY `idx_products_status` (`status`),
  ADD KEY `idx_products_featured` (`is_featured`);

--
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_product_images_product` (`product_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_reviews_customer` (`customer_id`),
  ADD KEY `fk_reviews_order` (`order_id`),
  ADD KEY `idx_reviews_product` (`product_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `shops`
--
ALTER TABLE `shops`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `vendor_id` (`vendor_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `mobile` (`mobile`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_mobile` (`mobile`),
  ADD KEY `idx_users_role` (`role_id`),
  ADD KEY `idx_users_status` (`status`);

--
-- Indexes for table `vendors`
--
ALTER TABLE `vendors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_vendor_status` (`verification_status`);

--
-- Indexes for table `wishlist`
--
ALTER TABLE `wishlist`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_wishlist_product` (`user_id`,`product_id`),
  ADD KEY `fk_wishlist_product` (`product_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `addresses`
--
ALTER TABLE `addresses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `banners`
--
ALTER TABLE `banners`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `brands`
--
ALTER TABLE `brands`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `carts`
--
ALTER TABLE `carts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `cart_items`
--
ALTER TABLE `cart_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `commissions`
--
ALTER TABLE `commissions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `coupons`
--
ALTER TABLE `coupons`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `delivery_assignments`
--
ALTER TABLE `delivery_assignments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `delivery_partners`
--
ALTER TABLE `delivery_partners`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `offers`
--
ALTER TABLE `offers`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `platform_settings`
--
ALTER TABLE `platform_settings`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `shops`
--
ALTER TABLE `shops`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `vendors`
--
ALTER TABLE `vendors`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `wishlist`
--
ALTER TABLE `wishlist`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `addresses`
--
ALTER TABLE `addresses`
  ADD CONSTRAINT `fk_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `carts`
--
ALTER TABLE `carts`
  ADD CONSTRAINT `fk_carts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD CONSTRAINT `fk_cart_items_cart` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cart_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `commissions`
--
ALTER TABLE `commissions`
  ADD CONSTRAINT `fk_commissions_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_commissions_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `delivery_assignments`
--
ALTER TABLE `delivery_assignments`
  ADD CONSTRAINT `fk_delivery_assignment_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_delivery_assignment_partner` FOREIGN KEY (`delivery_partner_id`) REFERENCES `delivery_partners` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `delivery_partners`
--
ALTER TABLE `delivery_partners`
  ADD CONSTRAINT `fk_delivery_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `offers`
--
ALTER TABLE `offers`
  ADD CONSTRAINT `fk_offers_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_address` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_order_items_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_products_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_images`
--
ALTER TABLE `product_images`
  ADD CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_reviews_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_reviews_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `shops`
--
ALTER TABLE `shops`
  ADD CONSTRAINT `fk_shops_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `vendors`
--
ALTER TABLE `vendors`
  ADD CONSTRAINT `fk_vendors_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `wishlist`
--
ALTER TABLE `wishlist`
  ADD CONSTRAINT `fk_wishlist_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_wishlist_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
