<?php
/**
 * Proxy GET Mollie redirect URL depuis le domaine frontend vers l'API VPS.
 * Dashboard Mollie : https://greffio.willentreprises.com/api/mollie/callback
 */
$query = $_SERVER['QUERY_STRING'] ?? '';
$base = getenv('GREFFIO_MOLLIE_CALLBACK_PROXY_TARGET')
  ?: 'https://api.greffio.willentreprises.com/api/mollie/callback';
$target = $query !== '' ? $base . '?' . $query : $base;

header('Location: ' . $target, true, 302);
exit;
