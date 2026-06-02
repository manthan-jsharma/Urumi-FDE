#!/bin/bash
set -e

COMPOSE="docker-compose -f docker/docker-compose.yml"
COMPOSE_TOOLS="docker-compose -f docker/docker-compose.yml --profile tools"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Aurelia — Full Stack Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start MySQL + WordPress
echo ""
echo "▶ Starting containers..."
$COMPOSE up -d db wordpress

# Wait for WordPress to initialize (apache + PHP)
echo "⏳ Waiting for WordPress to initialize (~30s)..."
sleep 30

# Run WordPress core install if not already done
echo "▶ Running WordPress core install..."
$COMPOSE_TOOLS run --rm wpcli wp core install \
  --url="http://localhost:8080" \
  --title="Aurelia" \
  --admin_user="admin" \
  --admin_password="aurelia_admin_2024" \
  --admin_email="admin@aurelia.local" \
  --skip-email \
  --allow-root 2>/dev/null || echo "   (already installed)"

# Run product seeding
echo ""
echo "▶ Running WooCommerce setup & product seeding..."
$COMPOSE_TOOLS run --rm wpcli sh /setup/setup.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done!"
echo ""
echo "  WordPress admin → http://localhost:8080/wp-admin"
echo "    user: admin  |  pass: aurelia_admin_2024"
echo ""
echo "  Next steps:"
echo "    1. Copy the WC_CONSUMER_KEY and WC_CONSUMER_SECRET"
echo "       printed above into apps/web/.env.local"
echo "    2. cd apps/web && npm install && npm run dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
