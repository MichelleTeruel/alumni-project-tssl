<?php

header('Access-Control-Allow-Origin: http://localhost:8000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, private');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/database.php';

$db = Database::connect();

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = rtrim($uri, '/');

$segments = explode('/', $uri);

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function getAuthUser() {
    $authHeader = null;
    
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } else {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
        }
    }
    
    if (!$authHeader) {
        return null;
    }
    
    $token = str_replace('Bearer ', '', $authHeader);
    return json_decode(base64_decode($token), true);
}

if ($method === 'POST' && $uri === '/api/auth/register') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['email']) || !isset($data['password'])) {
        jsonResponse(['error' => 'Email and password required'], 400);
    }

    $email = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
    if (!$email) {
        jsonResponse(['error' => 'Invalid email format'], 400);
    }

    $password = password_hash($data['password'], PASSWORD_DEFAULT);

    try {
        $stmt = $db->prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
        $stmt->execute([$email, $password, 'alumni']);
        jsonResponse(['message' => 'Registration successful', 'user_id' => $db->lastInsertId()], 201);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Email already exists'], 400);
    }
}

if ($method === 'POST' && ($uri === '/api/auth/login' || $uri === '/api/admin/login')) {
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['email']) || !isset($data['password'])) {
        jsonResponse(['error' => 'Email and password required'], 400);
    }

    $email = $data['email'];
    $password = $data['password'];
    $isAdmin = $uri === '/api/admin/login';

    if ($isAdmin) {
        $stmt = $db->prepare('SELECT * FROM users WHERE email = ? AND role = ?');
        $stmt->execute([$email, 'admin']);
    } else {
        $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
    }
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        jsonResponse(['error' => 'Invalid credentials'], 401);
    }

    $token = base64_encode(json_encode([
        'id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role']
    ]));

    jsonResponse([
        'message' => 'Login successful',
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ]
    ]);
}

if ($method === 'POST' && $uri === '/api/tracer/submit') {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'alumni') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['first_name', 'last_name', 'course', 'graduation_year'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            jsonResponse(['error' => "{$field} is required"], 400);
        }
    }

    try {
        $stmt = $db->prepare('INSERT INTO tracer_forms (user_id, first_name, last_name, course, graduation_year, current_work) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $user['id'],
            $data['first_name'],
            $data['last_name'],
            $data['course'],
            $data['graduation_year'],
            $data['current_work'] ?? ''
        ]);
        jsonResponse(['message' => 'Tracer form submitted successfully', 'id' => $db->lastInsertId()], 201);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to submit form'], 500);
    }
}

if ($method === 'GET' && $uri === '/api/tracer/my-submission') {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'alumni') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $stmt = $db->prepare('SELECT * FROM tracer_forms WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $form = $stmt->fetch();

    if (!$form) {
        jsonResponse(['error' => 'No submission found'], 404);
    }

    jsonResponse($form);
}

if ($method === 'GET' && $uri === '/api/admin/submissions') {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $stmt = $db->query('
        SELECT t.*, u.email 
        FROM tracer_forms t 
        JOIN users u ON t.user_id = u.id 
        ORDER BY t.created_at DESC
    ');
    $submissions = $stmt->fetchAll();
    jsonResponse($submissions);
}

if ($method === 'PUT' && preg_match('#/api/admin/submissions/(\d+)/(\w+)$#', $uri, $matches)) {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $id = $matches[1];
    $action = $matches[2];

    if (!in_array($action, ['approve', 'reject'])) {
        jsonResponse(['error' => 'Invalid action'], 400);
    }

    $status = $action === 'approve' ? 'approved' : 'rejected';

    $stmt = $db->prepare('UPDATE tracer_forms SET status = ? WHERE id = ?');
    $stmt->execute([$status, $id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Submission not found'], 404);
    }

    jsonResponse(['message' => "Submission {$status} successfully"]);
}

jsonResponse(['error' => 'Endpoint not found'], 404);
