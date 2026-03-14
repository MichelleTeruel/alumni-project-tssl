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

// ==================== AUTH ====================

if ($method === 'POST' && $uri === '/api/auth/register') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['email', 'password', 'first_name', 'last_name'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            jsonResponse(['error' => "{$field} is required"], 400);
        }
    }

    $email = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
    if (!$email) {
        jsonResponse(['error' => 'Invalid email format'], 400);
    }

    $first_name = trim($data['first_name']);
    $middle_name = isset($data['middle_name']) && $data['middle_name'] !== '' ? trim($data['middle_name']) : null;
    $last_name = trim($data['last_name']);
    $school_id = isset($data['school_id']) && $data['school_id'] !== '' ? strtoupper(trim($data['school_id'])) : null;
    $password = password_hash($data['password'], PASSWORD_DEFAULT);

    try {
        $stmt = $db->prepare('INSERT INTO users (email, password, role, first_name, middle_name, last_name, school_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$email, $password, 'alumni', $first_name, $middle_name, $last_name, $school_id]);
        jsonResponse(['message' => 'Registration successful', 'user_id' => $db->lastInsertId()], 201);
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'email') !== false) {
            jsonResponse(['error' => 'Email already exists'], 400);
        } elseif (strpos($e->getMessage(), 'school_id') !== false) {
            jsonResponse(['error' => 'School ID already exists'], 400);
        } else {
            jsonResponse(['error' => 'Registration failed'], 400);
        }
    }
}

if ($method === 'POST' && ($uri === '/api/auth/login' || $uri === '/api/admin/login')) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['email']) || !isset($data['password'])) {
        jsonResponse(['error' => 'Email and password required'], 400);
    }

    $email = trim($data['email']);
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
        'school_id' => $user['school_id'],
        'first_name' => $user['first_name'],
        'middle_name' => $user['middle_name'],
        'last_name' => $user['last_name'],
        'role' => $user['role']
    ]));

    jsonResponse([
        'message' => 'Login successful',
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'school_id' => $user['school_id'],
            'first_name' => $user['first_name'],
            'middle_name' => $user['middle_name'],
            'last_name' => $user['last_name'],
            'role' => $user['role']
        ]
    ]);
}

// ==================== TRACER FORM ====================

if ($method === 'POST' && $uri === '/api/tracer/submit') {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'alumni') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['course', 'graduation_year'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            jsonResponse(['error' => "{$field} is required"], 400);
        }
    }

    $current_work = isset($data['current_work']) ? trim($data['current_work']) : '';
    $employment_status = ($current_work === '' || $current_work === null) ? 'unemployed' : 'employed';

    try {
        $stmt = $db->prepare('INSERT INTO tracer_forms (user_id, school_id, first_name, middle_name, last_name, course, graduation_year, current_work, employment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $user['id'],
            $user['school_id'] ?? '',
            $user['first_name'],
            $user['middle_name'] ?? '',
            $user['last_name'],
            $data['course'],
            $data['graduation_year'],
            $current_work,
            $employment_status
        ]);
        jsonResponse(['message' => 'Tracer form submitted successfully', 'id' => $db->lastInsertId()], 201);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to submit form: ' . $e->getMessage()], 500);
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

if ($method === 'PUT' && $uri === '/api/tracer/update-work') {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'alumni') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['current_work'])) {
        jsonResponse(['error' => 'current_work is required'], 400);
    }

    $current_work = trim($data['current_work']);
    $employment_status = ($current_work === '' || $current_work === null) ? 'unemployed' : 'employed';

    $stmt = $db->prepare('UPDATE tracer_forms SET current_work = ?, employment_status = ? WHERE user_id = ?');
    $stmt->execute([$current_work, $employment_status, $user['id']]);

    jsonResponse(['message' => 'Work updated successfully']);
}

if ($method === 'POST' && $uri === '/api/tracer/request-work-change') {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'alumni') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['new_work']) || trim($data['new_work']) === '') {
        jsonResponse(['error' => 'new_work is required'], 400);
    }

    $stmt = $db->prepare('SELECT id FROM tracer_forms WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $form = $stmt->fetch();

    if (!$form) {
        jsonResponse(['error' => 'No tracer form found. Please submit first.'], 404);
    }

    try {
        $stmt = $db->prepare('INSERT INTO work_change_requests (user_id, tracer_form_id, new_work, status) VALUES (?, ?, ?, ?)');
        $stmt->execute([$user['id'], $form['id'], trim($data['new_work']), 'pending']);
        jsonResponse(['message' => 'Work change request submitted', 'id' => $db->lastInsertId()], 201);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to submit request'], 500);
    }
}

// ==================== ANNOUNCEMENTS ====================

if ($method === 'GET' && $uri === '/api/announcements') {
    $stmt = $db->query('SELECT * FROM announcements ORDER BY created_at DESC');
    $announcements = $stmt->fetchAll();
    jsonResponse($announcements);
}

if ($method === 'POST' && $uri === '/api/announcements') {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['title']) || !isset($data['message'])) {
        jsonResponse(['error' => 'Title and message are required'], 400);
    }

    try {
        $stmt = $db->prepare('INSERT INTO announcements (title, message) VALUES (?, ?)');
        $stmt->execute([trim($data['title']), trim($data['message'])]);
        jsonResponse(['message' => 'Announcement created', 'id' => $db->lastInsertId()], 201);
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Failed to create announcement'], 500);
    }
}

if ($method === 'PUT' && preg_match('#/api/announcements/(\d+)$#', $uri, $matches)) {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['title']) || !isset($data['message'])) {
        jsonResponse(['error' => 'Title and message are required'], 400);
    }

    $stmt = $db->prepare('UPDATE announcements SET title = ?, message = ? WHERE id = ?');
    $stmt->execute([trim($data['title']), trim($data['message']), $matches[1]]);

    jsonResponse(['message' => 'Announcement updated']);
}

if ($method === 'DELETE' && preg_match('#/api/announcements/(\d+)$#', $uri, $matches)) {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $stmt = $db->prepare('DELETE FROM announcements WHERE id = ?');
    $stmt->execute([$matches[1]]);

    jsonResponse(['message' => 'Announcement deleted']);
}

// ==================== ADMIN SUBMISSIONS ====================

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

if ($method === 'PUT' && preg_match('#/api/admin/alumni/(\d+)$#', $uri, $matches)) {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $db->prepare('UPDATE tracer_forms SET first_name = ?, middle_name = ?, last_name = ?, course = ?, graduation_year = ?, current_work = ?, employment_status = ? WHERE id = ?');
    $stmt->execute([
        $data['first_name'],
        $data['middle_name'] ?? '',
        $data['last_name'],
        $data['course'],
        $data['graduation_year'],
        $data['current_work'] ?? '',
        $data['employment_status'] ?? 'unemployed',
        $matches[1]
    ]);

    jsonResponse(['message' => 'Alumni updated successfully']);
}

if ($method === 'DELETE' && preg_match('#/api/admin/alumni/(\d+)$#', $uri, $matches)) {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $stmt = $db->prepare('DELETE FROM tracer_forms WHERE id = ?');
    $stmt->execute([$matches[1]]);

    jsonResponse(['message' => 'Alumni deleted successfully']);
}

// ==================== ADMIN WORK CHANGE REQUESTS ====================

if ($method === 'GET' && $uri === '/api/admin/work-change-requests') {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $stmt = $db->query('
        SELECT w.*, t.first_name, t.last_name, t.current_work as current_work_old
        FROM work_change_requests w
        JOIN tracer_forms t ON w.tracer_form_id = t.id
        ORDER BY w.requested_at DESC
    ');
    $requests = $stmt->fetchAll();
    jsonResponse($requests);
}

if ($method === 'PUT' && preg_match('#/api/admin/work-change-requests/(\d+)/(\w+)$#', $uri, $matches)) {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $id = $matches[1];
    $action = $matches[2];

    if (!in_array($action, ['approve', 'reject'])) {
        jsonResponse(['error' => 'Invalid action'], 400);
    }

    $stmt = $db->prepare('SELECT * FROM work_change_requests WHERE id = ?');
    $stmt->execute([$id]);
    $request = $stmt->fetch();

    if (!$request) {
        jsonResponse(['error' => 'Request not found'], 404);
    }

    if ($action === 'approve') {
        $employment_status = ($request['new_work'] === '' || $request['new_work'] === null) ? 'unemployed' : 'employed';
        
        $stmt = $db->prepare('UPDATE tracer_forms SET current_work = ?, employment_status = ? WHERE id = ?');
        $stmt->execute([$request['new_work'], $employment_status, $request['tracer_form_id']]);
    }

    $stmt = $db->prepare('UPDATE work_change_requests SET status = ? WHERE id = ?');
    $stmt->execute([$action === 'approve' ? 'approved' : 'rejected', $id]);

    jsonResponse(['message' => "Request {$action}d successfully"]);
}

// ==================== ANALYTICS ====================

if ($method === 'GET' && $uri === '/api/admin/analytics') {
    $user = getAuthUser();
    if (!$user || $user['role'] !== 'admin') {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $totalGraduates = $db->query('SELECT COUNT(*) as count FROM tracer_forms WHERE status = "approved"')->fetch();
    
    $employed = $db->query('SELECT COUNT(*) as count FROM tracer_forms WHERE status = "approved" AND employment_status = "employed"')->fetch();
    $unemployed = $db->query('SELECT COUNT(*) as count FROM tracer_forms WHERE status = "approved" AND employment_status = "unemployed"')->fetch();

    $byCourse = $db->query('
        SELECT course, COUNT(*) as count 
        FROM tracer_forms 
        WHERE status = "approved" 
        GROUP BY course
    ')->fetchAll();

    $byYear = $db->query('
        SELECT graduation_year, COUNT(*) as count 
        FROM tracer_forms 
        WHERE status = "approved" 
        GROUP BY graduation_year
        ORDER BY graduation_year
    ')->fetchAll();

    $pendingApprovals = $db->query('SELECT COUNT(*) as count FROM tracer_forms WHERE status = "pending"')->fetch();
    $pendingWorkChanges = $db->query('SELECT COUNT(*) as count FROM work_change_requests WHERE status = "pending"')->fetch();

    jsonResponse([
        'total_graduates' => $totalGraduates['count'],
        'employed' => $employed['count'],
        'unemployed' => $unemployed['count'],
        'by_course' => $byCourse,
        'by_year' => $byYear,
        'pending_approvals' => $pendingApprovals['count'],
        'pending_work_changes' => $pendingWorkChanges['count']
    ]);
}

// ==================== APPROVED ALUMNI LIST ====================

if ($method === 'GET' && $uri === '/api/alumni/approved') {
    $stmt = $db->query('
        SELECT school_id, first_name, middle_name, last_name, course, graduation_year, current_work, employment_status, created_at
        FROM tracer_forms 
        WHERE status = "approved"
        ORDER BY created_at DESC
    ');
    $alumni = $stmt->fetchAll();
    jsonResponse($alumni);
}

jsonResponse(['error' => 'Endpoint not found'], 404);
