CREATE TABLE `order` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id`  INT,
  `order_no`     VARCHAR(255),
  `total_price`  INT,
  `status`       VARCHAR(255),
  `created_at`   TIMESTAMP NULL,
  `updated_at`   TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ordersDetail` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `order_no`    VARCHAR(255),
  `product_id`  INT,
  `unit_price`  INT,
  `qty`         INT,
  `created_at`  TIMESTAMP NULL,
  `updated_at`  TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `productname` VARCHAR(255),
  `price`       INT,
  `qty`         INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cart` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id`  INT,
  `product_id`   INT,
  `unit_price`   INT,
  `qty`          INT,
  `created_at`   TIMESTAMP NULL,
  `updated_at`   TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
