#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ $# -ne 1 ]]; then
  echo "Usage: restore-test.sh /srv/greffio/backups/<timestamp>" >&2
  exit 2
fi
BACKUP_ROOT="$(realpath "$1")"
[[ -f "$BACKUP_ROOT/postgres.dump" ]] || { echo "postgres.dump absent" >&2; exit 1; }
[[ -f "$BACKUP_ROOT/object-storage.tar.gz" ]] || { echo "object-storage.tar.gz absent" >&2; exit 1; }

cd "$BACKUP_ROOT"
sha256sum -c SHA256SUMS
pg_restore --list postgres.dump >/dev/null
tar -tzf object-storage.tar.gz >/dev/null

TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT
tar -xzf object-storage.tar.gz -C "$TEST_DIR"
node -e "const fs=require('fs'); const p=process.argv[1]; const m=JSON.parse(fs.readFileSync(p)); if(m.format!=='greffio-object-backup-v1'||!Array.isArray(m.objects)) process.exit(1); console.log(JSON.stringify({objects:m.objects.length}));" "$TEST_DIR/object-storage/manifest.json"

echo "Integrite de l'archive verifiee. Pour un test complet, restaurer dans une instance PostgreSQL et un bucket Garage temporaires."
