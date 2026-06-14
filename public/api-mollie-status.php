<?php
/**
 * Proxy GET /api/mollie/status vers l'API VPS (fallback Apache statique).
 */
header('Content-Type: application/json; charset=UTF-8');

$target = getenv('GREFFIO_MOLLIE_STATUS_PROXY_TARGET')
  ?: 'https://api.greffio.willentreprises.com/api/mollie/status';

$ch = curl_init($target);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 15,
]);

$response = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
  http_response_code(502);
  echo json_encode(['ok' => false, 'error' => 'MOLLIE_STATUS_PROXY_FAILED', 'message' => $error]);
  exit;
}

http_response_code($code > 0 ? $code : 502);
echo $response;
