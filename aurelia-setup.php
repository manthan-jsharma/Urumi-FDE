<?php
/**
 * Aurelia one-time setup script.
 * Place in WordPress root, visit /aurelia-setup.php, then DELETE IT.
 */

define('ABSPATH_CHECK', true);
require_once __DIR__ . '/wp-load.php';

if (!current_user_can('manage_options')) {
    wp_redirect(wp_login_url($_SERVER['REQUEST_URI']));
    exit;
}

echo '<pre style="font-family:monospace;padding:20px;background:#111;color:#0f0;font-size:13px;">';
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "  Aurelia — WooCommerce Setup\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// ── WooCommerce settings ──────────────────────────────────────────────────────
update_option('woocommerce_store_address',   '123 Jewelry Lane');
update_option('woocommerce_store_city',      'New York');
update_option('woocommerce_default_country', 'US:NY');
update_option('woocommerce_currency',        'USD');
update_option('woocommerce_currency_pos',    'left');
update_option('woocommerce_price_num_decimals', '0');
update_option('woocommerce_api_enabled',     'yes');
update_option('woocommerce_force_ssl_checkout', 'no');
echo "✔ WooCommerce settings configured\n";

// ── Permalinks ────────────────────────────────────────────────────────────────
global $wp_rewrite;
$wp_rewrite->set_permalink_structure('/%postname%/');
$wp_rewrite->flush_rules();
echo "✔ Permalinks set to /%postname%/\n";

// ── Helper: create a virtual product ─────────────────────────────────────────
function aurelia_create_product($title, $sku, $price) {
    $existing = wc_get_product_id_by_sku($sku);
    if ($existing) {
        echo "  ↩ Skipped (exists): $title (ID: $existing)\n";
        return $existing;
    }
    $product = new WC_Product_Simple();
    $product->set_name($title);
    $product->set_sku($sku);
    $product->set_price($price);
    $product->set_regular_price($price);
    $product->set_status('publish');
    $product->set_virtual(true);
    $product->set_stock_status('instock');
    $product->set_sold_individually(true);
    $id = $product->save();
    echo "  ✔ Created: $title (ID: $id, SKU: $sku, Price: $$price)\n";
    return $id;
}

// ── Check if already seeded ───────────────────────────────────────────────────
$existing_ring = wc_get_product_id_by_sku('aurelia-twist-ring');
if ($existing_ring) {
    echo "\n⚠ Products already seeded. Skipping product creation.\n";
    $ring_id = $existing_ring;
} else {
    // ── Metal sub-products ────────────────────────────────────────────────────
    echo "\n🪙 Creating metal products...\n";
    $wg14  = aurelia_create_product('14K White Gold Band',  'metal-14k-white',  0);
    $yg14  = aurelia_create_product('14K Yellow Gold Band', 'metal-14k-yellow', 0);
    $rg14  = aurelia_create_product('14K Rose Gold Band',   'metal-14k-rose',   0);
    $wg18  = aurelia_create_product('18K White Gold Band',  'metal-18k-white',  200);
    $yg18  = aurelia_create_product('18K Yellow Gold Band', 'metal-18k-yellow', 200);
    $rg18  = aurelia_create_product('18K Rose Gold Band',   'metal-18k-rose',   200);
    $plat  = aurelia_create_product('Platinum Band',        'metal-platinum',   500);
    $pall  = aurelia_create_product('Palladium Band',       'metal-palladium',  350);

    // ── Stone sub-products ────────────────────────────────────────────────────
    echo "\n💎 Creating stone products...\n";
    $round    = aurelia_create_product('Round Diamond',    'stone-round',    0);
    $oval     = aurelia_create_product('Oval Diamond',     'stone-oval',     50);
    $princess = aurelia_create_product('Princess Diamond', 'stone-princess', 0);
    $cushion  = aurelia_create_product('Cushion Diamond',  'stone-cushion',  75);
    $marquise = aurelia_create_product('Marquise Diamond', 'stone-marquise', 100);
    $pear     = aurelia_create_product('Pear Diamond',     'stone-pear',     80);
    $emerald  = aurelia_create_product('Emerald Diamond',  'stone-emerald',  120);
    $radiant  = aurelia_create_product('Radiant Diamond',  'stone-radiant',  90);
    $asscher  = aurelia_create_product('Asscher Diamond',  'stone-asscher',  150);
    $heart    = aurelia_create_product('Heart Diamond',    'stone-heart',    200);

    // ── Main ring product ─────────────────────────────────────────────────────
    echo "\n💍 Creating main Aurelia Twist Ring...\n";
    $ring = new WC_Product_Simple();
    $ring->set_name('Aurelia Twist Ring');
    $ring->set_slug('aurelia-twist-ring');
    $ring->set_sku('aurelia-twist-ring');
    $ring->set_price(980);
    $ring->set_regular_price(980);
    $ring->set_status('publish');
    $ring->set_virtual(true);
    $ring->set_stock_status('instock');
    $ring->set_sold_individually(true);
    $ring->set_description('Two intertwined bands — one pavé diamonds, one plain metal — with a center stone in four claw prongs. Handcrafted to order.');
    $ring_id = $ring->save();

    // Store sub-product IDs as meta
    update_post_meta($ring_id, 'metal_product_14k_white',  $wg14);
    update_post_meta($ring_id, 'metal_product_14k_yellow', $yg14);
    update_post_meta($ring_id, 'metal_product_14k_rose',   $rg14);
    update_post_meta($ring_id, 'metal_product_18k_white',  $wg18);
    update_post_meta($ring_id, 'metal_product_18k_yellow', $yg18);
    update_post_meta($ring_id, 'metal_product_18k_rose',   $rg18);
    update_post_meta($ring_id, 'metal_product_platinum',   $plat);
    update_post_meta($ring_id, 'metal_product_palladium',  $pall);
    update_post_meta($ring_id, 'stone_product_round',    $round);
    update_post_meta($ring_id, 'stone_product_oval',     $oval);
    update_post_meta($ring_id, 'stone_product_princess', $princess);
    update_post_meta($ring_id, 'stone_product_cushion',  $cushion);
    update_post_meta($ring_id, 'stone_product_marquise', $marquise);
    update_post_meta($ring_id, 'stone_product_pear',     $pear);
    update_post_meta($ring_id, 'stone_product_emerald',  $emerald);
    update_post_meta($ring_id, 'stone_product_radiant',  $radiant);
    update_post_meta($ring_id, 'stone_product_asscher',  $asscher);
    update_post_meta($ring_id, 'stone_product_heart',    $heart);

    echo "✔ Main ring created (ID: $ring_id)\n";
}

// ── Generate API keys ─────────────────────────────────────────────────────────
echo "\n🔑 Generating WooCommerce API keys...\n";
global $wpdb;
$consumer_key    = 'ck_' . wc_rand_hash();
$consumer_secret = 'cs_' . wc_rand_hash();
$wpdb->insert(
    $wpdb->prefix . 'woocommerce_api_keys',
    [
        'user_id'         => 1,
        'description'     => 'Aurelia Frontend',
        'permissions'     => 'read_write',
        'consumer_key'    => wc_api_hash($consumer_key),
        'consumer_secret' => $consumer_secret,
        'truncated_key'   => substr($consumer_key, -7),
    ]
);

$site_url = get_option('siteurl');

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "  ✅ Setup complete!\n\n";
echo "  Copy these into your .env.local:\n\n";
echo "  NEXT_PUBLIC_WC_URL=$site_url\n";
echo "  NEXT_PUBLIC_WC_KEY=$consumer_key\n";
echo "  NEXT_PUBLIC_WC_SECRET=$consumer_secret\n";
echo "  NEXT_PUBLIC_COMPOSITE_PRODUCT_ID=$ring_id\n";
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "\n⚠️  DELETE this file now: aurelia-setup.php\n";
echo '</pre>';
