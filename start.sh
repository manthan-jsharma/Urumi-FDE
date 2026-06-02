#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Aurelia — 3D Ring Configurator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Start Docker containers ───────────────────────────────────────────────
echo "▶ Starting WordPress + MySQL..."
docker compose -f aurelia/docker/docker-compose.yml up -d db wordpress

# ── 2. Wait for WordPress to be reachable ───────────────────────────────────
echo "⏳ Waiting for WordPress to initialize (may take 30–60s on first run)..."
until docker compose -f aurelia/docker/docker-compose.yml exec -T wordpress \
  curl -sf http://localhost/wp-login.php > /dev/null 2>&1; do
  printf "."
  sleep 4
done
echo ""
echo "✔ WordPress is up"

# ── 3. Run WooCommerce setup inside the wpcli container ─────────────────────
echo "▶ Running WooCommerce setup..."
SETUP_OUT=$(docker compose -f aurelia/docker/docker-compose.yml --profile tools run --rm \
  wpcli bash /setup/setup.sh http://localhost:8181 2>&1)
echo "$SETUP_OUT" | grep -v "^AURELIA_"

# ── 4. Extract credentials and write .env.local ──────────────────────────────
ENV_FILE="aurelia/apps/web/.env.local"

WC_URL=$(echo "$SETUP_OUT"    | grep "^AURELIA_WC_URL="    | cut -d= -f2-)
WC_KEY=$(echo "$SETUP_OUT"    | grep "^AURELIA_WC_KEY="    | cut -d= -f2-)
WC_SECRET=$(echo "$SETUP_OUT" | grep "^AURELIA_WC_SECRET=" | cut -d= -f2-)
PRODUCT_ID=$(echo "$SETUP_OUT"| grep "^AURELIA_PRODUCT_ID="| cut -d= -f2-)

if [ -n "$WC_KEY" ] && [ -n "$WC_SECRET" ]; then
  cat > "$ENV_FILE" << EOF
NEXT_PUBLIC_WC_URL=${WC_URL:-http://localhost:8181}
NEXT_PUBLIC_WC_KEY=$WC_KEY
NEXT_PUBLIC_WC_SECRET=$WC_SECRET
NEXT_PUBLIC_COMPOSITE_PRODUCT_ID=${PRODUCT_ID:-29}
EOF
  echo "✔ .env.local written"
elif [ -f "$ENV_FILE" ]; then
  echo "✔ .env.local already exists"
else
  echo "⚠ Could not extract API keys — set them manually in $ENV_FILE"
fi

# ── 5. Install frontend dependencies ─────────────────────────────────────────
echo "▶ Installing frontend dependencies..."
cd aurelia/apps/web
npm install --silent
cd -

# ── 6. Done ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Ready!"
echo ""
echo "  Frontend   → http://localhost:3000"
echo "  WP Admin   → http://localhost:8181/wp-admin"
echo "              (admin / admin123)"
echo ""
echo "  Start the dev server:"
echo "    cd aurelia/apps/web && npm run dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
