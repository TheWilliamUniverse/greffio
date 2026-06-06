#!/usr/bin/env bash

set -euo pipefail

APP_DIR="/opt/greffio"
ENV_FILE="$APP_DIR/.env"
BUCKET_NAME="greffio-production-documents"
AWS_REGION_VALUE="eu-west-3"
PM2_APP_NAME="greffio-api"

echo "== Greffio AWS S3 production setup =="

if [ "$(id -u)" -ne 0 ]; then
  echo "This script should be run as root or with sudo."
  exit 1
fi

echo ""
echo "== 1. Checking project directory =="

if [ ! -d "$APP_DIR" ]; then
  echo "Error: $APP_DIR does not exist."
  exit 1
fi

cd "$APP_DIR"

echo "Project directory found: $APP_DIR"

echo ""
echo "== 2. Installing AWS CLI v2 if missing =="

if command -v aws >/dev/null 2>&1; then
  echo "AWS CLI already installed:"
  aws --version
else
  echo "Installing dependencies..."
  apt update
  apt install -y unzip curl

  TMP_DIR="$(mktemp -d)"
  cd "$TMP_DIR"

  echo "Downloading AWS CLI v2..."
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

  echo "Unzipping AWS CLI..."
  unzip -q awscliv2.zip

  echo "Installing AWS CLI..."
  ./aws/install

  cd "$APP_DIR"
  rm -rf "$TMP_DIR"

  echo "AWS CLI installed:"
  aws --version
fi

echo ""
echo "== 3. Checking .env file =="

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE does not exist."
  echo "Create it before running this script."
  exit 1
fi

BACKUP_FILE="$ENV_FILE.backup.$(date +%Y%m%d-%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"
echo "Backup created: $BACKUP_FILE"

echo ""
echo "== 4. Reading AWS credentials securely =="

read -r -p "Enter AWS_ACCESS_KEY_ID: " AWS_ACCESS_KEY_ID_INPUT

read -r -s -p "Enter AWS_SECRET_ACCESS_KEY: " AWS_SECRET_ACCESS_KEY_INPUT
echo ""

if [ -z "$AWS_ACCESS_KEY_ID_INPUT" ]; then
  echo "Error: AWS_ACCESS_KEY_ID cannot be empty."
  exit 1
fi

if [ -z "$AWS_SECRET_ACCESS_KEY_INPUT" ]; then
  echo "Error: AWS_SECRET_ACCESS_KEY cannot be empty."
  exit 1
fi

echo ""
echo "== 5. Updating .env safely =="

set_env_var() {
  local key="$1"
  local value="$2"
  local file="$3"

  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

set_env_var "DOCUMENT_STORAGE_DRIVER" "s3" "$ENV_FILE"
set_env_var "AWS_REGION" "$AWS_REGION_VALUE" "$ENV_FILE"
set_env_var "AWS_ACCESS_KEY_ID" "$AWS_ACCESS_KEY_ID_INPUT" "$ENV_FILE"
set_env_var "AWS_SECRET_ACCESS_KEY" "$AWS_SECRET_ACCESS_KEY_INPUT" "$ENV_FILE"
set_env_var "AWS_S3_BUCKET" "$BUCKET_NAME" "$ENV_FILE"
set_env_var "AWS_S3_PRESIGNED_URL_TTL_SECONDS" "900" "$ENV_FILE"

# Normalize Windows CRLF if .env was edited from Windows tooling
sed -i 's/\r$//' "$ENV_FILE"

echo ".env updated."

echo ""
echo "Configured non-sensitive values:"
grep -E "DOCUMENT_STORAGE_DRIVER|AWS_REGION|AWS_S3_BUCKET|AWS_S3_PRESIGNED_URL_TTL_SECONDS" "$ENV_FILE"

echo ""
echo "Sensitive values presence:"
if grep -q "^AWS_ACCESS_KEY_ID=" "$ENV_FILE"; then
  echo "AWS_ACCESS_KEY_ID is present."
else
  echo "AWS_ACCESS_KEY_ID is missing."
  exit 1
fi

if grep -q "^AWS_SECRET_ACCESS_KEY=" "$ENV_FILE"; then
  echo "AWS_SECRET_ACCESS_KEY is present."
else
  echo "AWS_SECRET_ACCESS_KEY is missing."
  exit 1
fi

echo ""
echo "== 6. Exporting environment for AWS CLI test =="

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo ""
echo "== 7. Testing AWS identity =="

aws sts get-caller-identity --region "$AWS_REGION_VALUE"

echo ""
echo "== 8. Testing S3 bucket list access (optional) =="

if aws s3 ls "s3://${BUCKET_NAME}" --region "$AWS_REGION_VALUE" 2>/dev/null; then
  echo "S3 list OK."
else
  echo "Warning: cannot list S3 bucket (s3:ListBucket may be missing). Continuing with object-level tests."
fi

echo ""
echo "== 9. Testing S3 PutObject / GetObject / DeleteObject =="

TEST_FILE="/tmp/greffio-s3-test.txt"
TEST_KEY="test/greffio-s3-test-$(date +%s).txt"
TEST_S3_URI="s3://${BUCKET_NAME}/${TEST_KEY}"
TEST_READ_FILE="/tmp/greffio-s3-test-read.txt"

echo "test greffio s3 $(date)" > "$TEST_FILE"

echo "Uploading test file..."
aws s3 cp "$TEST_FILE" "$TEST_S3_URI" --region "$AWS_REGION_VALUE"

echo "Reading test file..."
aws s3 cp "$TEST_S3_URI" "$TEST_READ_FILE" --region "$AWS_REGION_VALUE"

echo "Downloaded file content:"
cat "$TEST_READ_FILE"

echo "Deleting test file..."
aws s3 rm "$TEST_S3_URI" --region "$AWS_REGION_VALUE"

rm -f "$TEST_FILE" "$TEST_READ_FILE"

echo "S3 read/write/delete test succeeded."

echo ""
echo "== 10. Installing Node dependencies =="

cd "$APP_DIR"

if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi

echo ""
echo "== 11. Running database migrations =="

npm run db:migrate

echo ""
echo "== 12. Restarting PM2 app with updated environment =="

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Error: pm2 is not installed or not in PATH."
  exit 1
fi

pm2 restart "$PM2_APP_NAME" --update-env
pm2 save

echo ""
echo "== 13. Showing PM2 status =="

pm2 status "$PM2_APP_NAME"

echo ""
echo "== 14. Checking API readiness endpoint =="

READY_RESPONSE="$(curl -fsS https://api.greffio.willentreprises.com/api/ready || true)"

if [ -z "$READY_RESPONSE" ]; then
  echo "Error: readiness endpoint did not return a response."
  echo "Check PM2 logs:"
  echo "pm2 logs $PM2_APP_NAME --lines 100"
  exit 1
fi

echo "$READY_RESPONSE"

if echo "$READY_RESPONSE" | grep -q '"storageDriver"[[:space:]]*:[[:space:]]*"s3"'; then
  echo ""
  echo "Success: Greffio API is using S3 storage."
else
  echo ""
  echo "Warning: readiness endpoint did not confirm storageDriver=s3."
  echo "Check logs:"
  echo "pm2 logs $PM2_APP_NAME --lines 200"
  exit 1
fi

echo ""
echo "== Setup complete =="
