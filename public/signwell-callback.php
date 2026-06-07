<?php
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'METHOD_NOT_ALLOWED']);
  exit;
}

$target = getenv('GREFFIO_SIGNWELL_PROXY_TARGET') ?: 'https://api.greffio.willentreprises.com/callback';
$body = file_get_contents('php://input');
$headers = ['Content-Type: application/json'];

if (!empty($_SERVER['HTTP_X_SIGNWELL_SIGNATURE'])) {
  $headers[] = 'X-Signwell-Signature: ' . $_SERVER['HTTP_X_SIGNWELL_SIGNATURE'];
}

$ch = curl_init($target);
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $body,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => $headers,
  CURLOPT_TIMEOUT => 30,
]);

$response = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
  http_response_code(502);
  echo json_encode(['ok' => false, 'error' => 'SIGNWELL_PROXY_FAILED', 'message' => $error]);
  exit;
}

http_response_code($code > 0 ? $code : 502);
echo $response;
