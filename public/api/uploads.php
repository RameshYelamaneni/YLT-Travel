<?php
require __DIR__ . '/bootstrap.php';

$p = ylt_body();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$resource = (string)($_GET['resource'] ?? $p['resource'] ?? '');

if ($resource === 'onboard' && $method === 'POST') {
  ylt_ok(ylt_onboard_store_file($pdo, $p), 201);
}

$auth = ylt_require_staff($c, $pdo);

if ($method === 'GET') {
  ylt_ok(['ok' => true, 'files' => ylt_staff_list_images($auth, $p)]);
}

if ($method === 'POST') {
  ylt_ok(ylt_staff_store_image($auth, $p), 201);
}

ylt_fail(405, 'Method not allowed.');
