CREATE DATABASE IF NOT EXISTS `user_crud` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `user_crud`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `role` ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
  `balance` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_users_email` (`email`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `price_per_kg` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_categories_name` (`name`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `deposits` (
  `id` CHAR(36) NOT NULL,
  `user_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  `estimated_weight` DECIMAL(10,2) NOT NULL,
  `actual_weight` DECIMAL(10,2) DEFAULT NULL,
  `points_earned` INT NOT NULL DEFAULT 0,
  `status` ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_deposits_user_id` (`user_id`),
  KEY `idx_deposits_category_id` (`category_id`),
  KEY `idx_deposits_status` (`status`),
  CONSTRAINT `fk_deposits_users`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deposits_categories`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `categories` (`name`, `price_per_kg`) VALUES
  ('Plastic', 5000),
  ('Paper', 3000),
  ('Organic', 2500),
  ('Glass / Aluminum', 8500),
  ('Recyclable', 4500),
  ('Hazardous', 10000)
ON DUPLICATE KEY UPDATE
  `price_per_kg` = VALUES(`price_per_kg`);
