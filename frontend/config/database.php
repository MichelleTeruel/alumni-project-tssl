<?php

class Database {
    public static function connect() {
        $host = getenv('DB_HOST') ?: 'db';
        $db = getenv('DB_NAME') ?: 'alumni_db';
        $user = getenv('DB_USER') ?: 'alumni_user';
        $pass = getenv('DB_PASSWORD') ?: 'alumni_pass';
        $charset = 'utf8mb4';
        
        $dsn = "mysql:host={$host};port=3306;dbname={$db};charset={$charset}";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        try {
            return new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed']);
            exit;
        }
    }
}
