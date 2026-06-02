#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Aurelia — WooCommerce Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

WP="wp --allow-root --path=/var/www/html"

# ── Wait for WordPress files to be present ──────────────────────────────────
echo "⏳ Waiting for WordPress files..."
until [ -f /var/www/html/wp-load.php ]; do
  echo "   WordPress files not ready yet, retrying in 5s..."
  sleep 5
done
echo "✔ WordPress files present"

# ── Install WordPress core if not already installed ──────────────────────────
if ! $WP core is-installed 2>/dev/null; then
  echo "🔧 Installing WordPress core..."
  $WP core install \
    --url="http://localhost:8181" \
    --title="Aurelia" \
    --admin_user="admin" \
    --admin_password="admin123" \
    --admin_email="admin@aurelia.com"
  echo "✔ WordPress core installed"
else
  echo "✔ WordPress already installed"
fi

# ── Fix wp-content permissions so plugins can be installed ──────────────────
chmod -R 777 /var/www/html/wp-content
mkdir -p /var/www/html/wp-content/upgrade
chmod 777 /var/www/html/wp-content/upgrade

# ── Set permalinks to Post Name (required for REST API) ─────────────────────
$WP rewrite structure '/%postname%/'
$WP rewrite flush
echo "✔ Permalinks configured"

# ── Install WooCommerce ──────────────────────────────────────────────────────
if ! $WP plugin is-active woocommerce 2>/dev/null; then
  echo "📦 Installing WooCommerce..."
  $WP plugin install woocommerce --activate
  echo "✔ WooCommerce installed and activated"
else
  echo "✔ WooCommerce already active"
fi

# ── Install CoCart (headless cart API) ──────────────────────────────────────
if ! $WP plugin is-active cart-rest-api-for-woocommerce 2>/dev/null; then
  echo "📦 Installing CoCart..."
  $WP plugin install cart-rest-api-for-woocommerce --activate
  echo "✔ CoCart installed and activated"
else
  echo "✔ CoCart already active"
fi

# ── WooCommerce initial setup ────────────────────────────────────────────────
echo "⚙️  Configuring WooCommerce..."
$WP option update woocommerce_store_address "123 Jewelry Lane"
$WP option update woocommerce_store_city "New York"
$WP option update woocommerce_default_country "US:NY"
$WP option update woocommerce_store_postcode "10001"
$WP option update woocommerce_currency "USD"
$WP option update woocommerce_currency_pos "left"
$WP option update woocommerce_price_num_decimals "0"
$WP option update woocommerce_enable_reviews "yes"

# Enable REST API
$WP option update woocommerce_api_enabled "yes"

# ── Check if products already seeded ────────────────────────────────────────
EXISTING=$($WP post list --post_type=product --name="aurelia-twist-ring" --format=count 2>/dev/null || echo "0")
if [ "$EXISTING" -gt "0" ]; then
  echo "✔ Products already seeded, skipping..."
else
  echo "🪙 Seeding products..."

  # ── Create metal sub-products ──────────────────────────────────────────────
  echo "   Creating metal products..."

  WG14_ID=$($WP post create --post_title="14K White Gold Band" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $WG14_ID _price "0"
  $WP post meta update $WG14_ID _regular_price "0"
  $WP post meta update $WG14_ID _sku "metal-14k-white"
  $WP post meta update $WG14_ID _stock_status "instock"
  $WP post meta update $WG14_ID _virtual "yes"
  $WP post term set $WG14_ID product_type simple

  YG14_ID=$($WP post create --post_title="14K Yellow Gold Band" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $YG14_ID _price "0"
  $WP post meta update $YG14_ID _regular_price "0"
  $WP post meta update $YG14_ID _sku "metal-14k-yellow"
  $WP post meta update $YG14_ID _stock_status "instock"
  $WP post meta update $YG14_ID _virtual "yes"
  $WP post term set $YG14_ID product_type simple

  RG14_ID=$($WP post create --post_title="14K Rose Gold Band" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $RG14_ID _price "0"
  $WP post meta update $RG14_ID _regular_price "0"
  $WP post meta update $RG14_ID _sku "metal-14k-rose"
  $WP post meta update $RG14_ID _stock_status "instock"
  $WP post meta update $RG14_ID _virtual "yes"
  $WP post term set $RG14_ID product_type simple

  WG18_ID=$($WP post create --post_title="18K White Gold Band" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $WG18_ID _price "200"
  $WP post meta update $WG18_ID _regular_price "200"
  $WP post meta update $WG18_ID _sku "metal-18k-white"
  $WP post meta update $WG18_ID _stock_status "instock"
  $WP post meta update $WG18_ID _virtual "yes"
  $WP post term set $WG18_ID product_type simple

  YG18_ID=$($WP post create --post_title="18K Yellow Gold Band" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $YG18_ID _price "200"
  $WP post meta update $YG18_ID _regular_price "200"
  $WP post meta update $YG18_ID _sku "metal-18k-yellow"
  $WP post meta update $YG18_ID _stock_status "instock"
  $WP post meta update $YG18_ID _virtual "yes"
  $WP post term set $YG18_ID product_type simple

  RG18_ID=$($WP post create --post_title="18K Rose Gold Band" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $RG18_ID _price "200"
  $WP post meta update $RG18_ID _regular_price "200"
  $WP post meta update $RG18_ID _sku "metal-18k-rose"
  $WP post meta update $RG18_ID _stock_status "instock"
  $WP post meta update $RG18_ID _virtual "yes"
  $WP post term set $RG18_ID product_type simple

  PLAT_ID=$($WP post create --post_title="Platinum Band" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $PLAT_ID _price "500"
  $WP post meta update $PLAT_ID _regular_price "500"
  $WP post meta update $PLAT_ID _sku "metal-platinum"
  $WP post meta update $PLAT_ID _stock_status "instock"
  $WP post meta update $PLAT_ID _virtual "yes"
  $WP post term set $PLAT_ID product_type simple

  PALL_ID=$($WP post create --post_title="Palladium Band" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $PALL_ID _price "350"
  $WP post meta update $PALL_ID _regular_price "350"
  $WP post meta update $PALL_ID _sku "metal-palladium"
  $WP post meta update $PALL_ID _stock_status "instock"
  $WP post meta update $PALL_ID _virtual "yes"
  $WP post term set $PALL_ID product_type simple

  # ── Create stone sub-products ────────────────────────────────────────────
  echo "   Creating stone products..."

  ROUND_ID=$($WP post create --post_title="Round Diamond" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $ROUND_ID _price "0"
  $WP post meta update $ROUND_ID _regular_price "0"
  $WP post meta update $ROUND_ID _sku "stone-round"
  $WP post meta update $ROUND_ID _stock_status "instock"
  $WP post meta update $ROUND_ID _virtual "yes"
  $WP post term set $ROUND_ID product_type simple

  OVAL_ID=$($WP post create --post_title="Oval Diamond" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $OVAL_ID _price "50"
  $WP post meta update $OVAL_ID _regular_price "50"
  $WP post meta update $OVAL_ID _sku "stone-oval"
  $WP post meta update $OVAL_ID _stock_status "instock"
  $WP post meta update $OVAL_ID _virtual "yes"
  $WP post term set $OVAL_ID product_type simple

  PRINCESS_ID=$($WP post create --post_title="Princess Diamond" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $PRINCESS_ID _price "0"
  $WP post meta update $PRINCESS_ID _regular_price "0"
  $WP post meta update $PRINCESS_ID _sku "stone-princess"
  $WP post meta update $PRINCESS_ID _stock_status "instock"
  $WP post meta update $PRINCESS_ID _virtual "yes"
  $WP post term set $PRINCESS_ID product_type simple

  CUSHION_ID=$($WP post create --post_title="Cushion Diamond" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $CUSHION_ID _price "75"
  $WP post meta update $CUSHION_ID _regular_price "75"
  $WP post meta update $CUSHION_ID _sku "stone-cushion"
  $WP post meta update $CUSHION_ID _stock_status "instock"
  $WP post meta update $CUSHION_ID _virtual "yes"
  $WP post term set $CUSHION_ID product_type simple

  MARQUISE_ID=$($WP post create --post_title="Marquise Diamond" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $MARQUISE_ID _price "100"
  $WP post meta update $MARQUISE_ID _regular_price "100"
  $WP post meta update $MARQUISE_ID _sku "stone-marquise"
  $WP post meta update $MARQUISE_ID _stock_status "instock"
  $WP post meta update $MARQUISE_ID _virtual "yes"
  $WP post term set $MARQUISE_ID product_type simple

  PEAR_ID=$($WP post create --post_title="Pear Diamond" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $PEAR_ID _price "80"
  $WP post meta update $PEAR_ID _regular_price "80"
  $WP post meta update $PEAR_ID _sku "stone-pear"
  $WP post meta update $PEAR_ID _stock_status "instock"
  $WP post meta update $PEAR_ID _virtual "yes"
  $WP post term set $PEAR_ID product_type simple

  EMERALD_ID=$($WP post create --post_title="Emerald Diamond" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $EMERALD_ID _price "120"
  $WP post meta update $EMERALD_ID _regular_price "120"
  $WP post meta update $EMERALD_ID _sku "stone-emerald"
  $WP post meta update $EMERALD_ID _stock_status "instock"
  $WP post meta update $EMERALD_ID _virtual "yes"
  $WP post term set $EMERALD_ID product_type simple

  RADIANT_ID=$($WP post create --post_title="Radiant Diamond" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $RADIANT_ID _price "90"
  $WP post meta update $RADIANT_ID _regular_price "90"
  $WP post meta update $RADIANT_ID _sku "stone-radiant"
  $WP post meta update $RADIANT_ID _stock_status "instock"
  $WP post meta update $RADIANT_ID _virtual "yes"
  $WP post term set $RADIANT_ID product_type simple

  ASSCHER_ID=$($WP post create --post_title="Asscher Diamond" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $ASSCHER_ID _price "150"
  $WP post meta update $ASSCHER_ID _regular_price "150"
  $WP post meta update $ASSCHER_ID _sku "stone-asscher"
  $WP post meta update $ASSCHER_ID _stock_status "instock"
  $WP post meta update $ASSCHER_ID _virtual "yes"
  $WP post term set $ASSCHER_ID product_type simple

  HEART_ID=$($WP post create --post_title="Heart Diamond" --post_type=product --post_status=publish --porcelain)
  $WP post meta update $HEART_ID _price "200"
  $WP post meta update $HEART_ID _regular_price "200"
  $WP post meta update $HEART_ID _sku "stone-heart"
  $WP post meta update $HEART_ID _stock_status "instock"
  $WP post meta update $HEART_ID _virtual "yes"
  $WP post term set $HEART_ID product_type simple

  # ── Create main Aurelia Twist Ring product ───────────────────────────────
  echo "   Creating main Aurelia Twist Ring product..."

  RING_ID=$($WP post create \
    --post_title="Aurelia Twist Ring" \
    --post_name="aurelia-twist-ring" \
    --post_type=product \
    --post_status=publish \
    --post_content="Two intertwined bands — one pavé diamonds, one plain metal — with a center stone in four claw prongs. Handcrafted to order." \
    --post_excerpt="The DoAmore Twist Ring. Configure your metal and stone below." \
    --porcelain)

  $WP post meta update $RING_ID _price "980"
  $WP post meta update $RING_ID _regular_price "980"
  $WP post meta update $RING_ID _sku "aurelia-twist-ring"
  $WP post meta update $RING_ID _stock_status "instock"
  $WP post meta update $RING_ID _virtual "yes"
  $WP post meta update $RING_ID _sold_individually "yes"
  $WP post term set $RING_ID product_type simple

  # Store metal product IDs as meta on the main product
  $WP post meta update $RING_ID metal_product_14k_white  $WG14_ID
  $WP post meta update $RING_ID metal_product_14k_yellow $YG14_ID
  $WP post meta update $RING_ID metal_product_14k_rose   $RG14_ID
  $WP post meta update $RING_ID metal_product_18k_white  $WG18_ID
  $WP post meta update $RING_ID metal_product_18k_yellow $YG18_ID
  $WP post meta update $RING_ID metal_product_18k_rose   $RG18_ID
  $WP post meta update $RING_ID metal_product_platinum   $PLAT_ID
  $WP post meta update $RING_ID metal_product_palladium  $PALL_ID

  # Store stone product IDs
  $WP post meta update $RING_ID stone_product_round    $ROUND_ID
  $WP post meta update $RING_ID stone_product_oval     $OVAL_ID
  $WP post meta update $RING_ID stone_product_princess $PRINCESS_ID
  $WP post meta update $RING_ID stone_product_cushion  $CUSHION_ID
  $WP post meta update $RING_ID stone_product_marquise $MARQUISE_ID
  $WP post meta update $RING_ID stone_product_pear     $PEAR_ID
  $WP post meta update $RING_ID stone_product_emerald  $EMERALD_ID
  $WP post meta update $RING_ID stone_product_radiant  $RADIANT_ID
  $WP post meta update $RING_ID stone_product_asscher  $ASSCHER_ID
  $WP post meta update $RING_ID stone_product_heart    $HEART_ID

  echo "✔ Products seeded. Main product ID: $RING_ID"

  # ── Generate API keys ────────────────────────────────────────────────────
  echo "🔑 Generating WooCommerce API keys..."

  $WP eval '
    $user_id = 1;
    $data = array(
      "user_id"     => $user_id,
      "description" => "Aurelia Frontend",
      "permissions" => "read_write",
    );
    $keys = WC_Auth::create_keys($data);
    echo "WC_CONSUMER_KEY=" . $keys["consumer_key"] . "\n";
    echo "WC_CONSUMER_SECRET=" . $keys["consumer_secret"] . "\n";
    echo "NEXT_PUBLIC_COMPOSITE_PRODUCT_ID=" . '"$RING_ID"' . "\n";
  ' 2>/dev/null || {
    # Fallback: generate via REST API key table directly
    $WP eval '
      global $wpdb;
      $consumer_key    = "ck_" . wc_rand_hash();
      $consumer_secret = "cs_" . wc_rand_hash();
      $wpdb->insert(
        $wpdb->prefix . "woocommerce_api_keys",
        array(
          "user_id"         => 1,
          "description"     => "Aurelia Frontend",
          "permissions"     => "read_write",
          "consumer_key"    => wc_api_hash($consumer_key),
          "consumer_secret" => $consumer_secret,
          "truncated_key"   => substr($consumer_key, -7),
        )
      );
      echo "WC_CONSUMER_KEY=" . $consumer_key . "\n";
      echo "WC_CONSUMER_SECRET=" . $consumer_secret . "\n";
      echo "NEXT_PUBLIC_COMPOSITE_PRODUCT_ID='"$RING_ID"'\n";
    '
  }
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup complete."
echo "  WordPress admin: http://localhost:8080/wp-admin"
echo "  REST API:        http://localhost:8080/wp-json/wc/v3"
echo "  CoCart API:      http://localhost:8080/wp-json/cocart/v2"
echo "  Copy the keys above into apps/web/.env.local"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
