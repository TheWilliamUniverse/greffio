<?php
/**
 * Proxy POST webhook Mollie (fallback si le dashboard pointe vers le frontend).
 * Préférer : https://api.greffio.willentreprises.com/api/webhooks/mollie
 */
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'METHOD_NOT_ALLOWED']);
  exit;
}

$target = getenv('GREFFIO_MOLLIE_WEBHOOK_PROXY_TARGET')
  ?: 'https://api.greffio.willentreprises.com/api/webhooks/mollie';
$body = file_get_contents('php://input');
$contentType = $_SERVER['CONTENT_TYPE'] ?? 'application/x-www-form-urlencoded';

$ch = curl_init($target);
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $body,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ['Content-Type: ' . $contentType],
  CURLOPT_TIMEOUT => 30,
]);

$response = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
  http_response_code(502);
  echo json_encode(['ok' => false, 'error' => 'MOLLIE_WEBHOOK_PROXY_FAILED', 'message' => $error]);
  exit;
}

http_response_code($code > 0 ? $code : 502);
echo $response;
