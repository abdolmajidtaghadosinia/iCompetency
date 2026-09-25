#!/usr/bin/env bash
# Builds the upload-ready package for plain PHP + phpMyAdmin hosting:
#   icompetency-public_html.zip  ->  extract into public_html/
# It contains the BUILT frontend (dist/, not the .tsx sources: uploading those
# fails with "Expected a JavaScript-or-Wasm module script ... MIME type of ''")
# plus the backend/ folder without config.php, which stays on the host.
# Used by .github/workflows/deploy-package.yml; runnable locally too.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build

out=deploy/public_html
rm -rf deploy
mkdir -p "$out"
cp -R dist/. "$out/"
mkdir -p "$out/backend"
( cd backend && tar --exclude='./config.php' -cf - . ) | ( cd "$out/backend" && tar -xf - )

cat > "$out/README-DEPLOY-FA.txt" <<'TXT'
راهنمای آپلود آیکامپتنسی روی هاست

۱. کل محتوای همین پوشه را در public_html آپلود کنید (یا zip را در File Manager آپلود و Extract کنید).
   فایل مخفی .htaccess هم باید منتقل شود.
۲. backend/config.php را از روی backend/config.sample.php بسازید (اگر از قبل دارید، دست نزنید؛ این بسته آن را بازنویسی نمی‌کند).
۳. در phpMyAdmin فایل backend/schema.sql را Import کنید (اجرای دوباره بی‌خطر است).
۴. سایت را باز کنید. آدرس دامنه/backend/health باید {"ok":true...} برگرداند.

جزئیات بیشتر: backend/README_DEPLOY.md
TXT

( cd deploy/public_html && zip -qr ../icompetency-public_html.zip . )
echo "Built deploy/icompetency-public_html.zip"
