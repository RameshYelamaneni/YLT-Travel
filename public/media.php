<?php
$path = (string)($_GET['path'] ?? '');
$path = str_replace('\\', '/', $path);
$path = preg_replace('#\.\.+#', '', $path);
$path = ltrim($path, '/');
if ($path === '' || !preg_match('#^[a-zA-Z0-9_./-]+$#', $path) || preg_match('#(?:^|/)careers/#i', $path)) {
  http_response_code(404);
  exit;
}
if (!preg_match('#\.(jpe?g|png|webp)$#i', $path)) {
  http_response_code(404);
  exit;
}
$root = __DIR__ . DIRECTORY_SEPARATOR . 'uploads';
$full = realpath($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $path));
$realRoot = realpath($root);
if (!$full || !$realRoot || strpos($full, $realRoot) !== 0 || !is_file($full)) {
  http_response_code(404);
  exit;
}
$ext = strtolower(pathinfo($full, PATHINFO_EXTENSION));
$types = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
header('Cache-Control: public, max-age=86400');
header('X-Content-Type-Options: nosniff');
readfile($full);
