<?php

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($uri === '/') {
    require __DIR__ . '/index.html';
    return true;
}

if (strpos($uri, '/api/') === 0) {
    require __DIR__ . '/index.php';
    return false;
}

if (!preg_match('/\.(css|js|html?|php)$/', $uri)) {
    require __DIR__ . '/index.php';
    return false;
}

return false;
