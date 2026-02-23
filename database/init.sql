CREATE DATABASE IF NOT EXISTS alumni_db;
USE alumni_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('alumni', 'admin') DEFAULT 'alumni',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracer_forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    course VARCHAR(100) NOT NULL,
    graduation_year YEAR NOT NULL,
    current_work TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO users (email, password, role) VALUES 
('admin@alumni.local', '$2y$10$PxkhNmYsSWZEX3hRZDMb..MGnB3OtzSJTYjITliJrgQNIyxyXfCcy', 'admin');
