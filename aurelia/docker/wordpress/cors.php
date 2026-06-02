<?php
/**
 * Must-Use plugin: CORS headers + local HTTPS spoof for WooCommerce REST API auth
 */

// Explicitly manage HTTPS flag: on only for REST API, off everywhere else.
if (str_contains($_SERVER["REQUEST_URI"] ?? "", "/wp-json/")) {
    $_SERVER["HTTPS"] = "on";
    $_SERVER["SERVER_PORT"] = 443;
} else {
    unset($_SERVER["HTTPS"]);
    $_SERVER["SERVER_PORT"] = 80;
}

// Disable WooCommerce forced HTTPS redirect on checkout for local dev
add_filter("woocommerce_force_ssl_checkout", "__return_false");

// Force canonical redirects to use http:// (WordPress is_ssl() can misbehave in Docker)
add_filter("redirect_canonical", function($redirect_url) {
    return str_replace("https://", "http://", $redirect_url);
}, 1);

add_action("rest_api_init", function () {
    remove_filter("rest_pre_serve_request", "rest_send_cors_headers");
    add_filter("rest_pre_serve_request", function ($value) {
        $origin = $_SERVER["HTTP_ORIGIN"] ?? "*";
        header("Access-Control-Allow-Origin: " . $origin);
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Headers: Authorization, Content-Type, X-WC-Store-API-Nonce");
        return $value;
    });
}, 15);

add_action("init", function () {
    if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
        $origin = $_SERVER["HTTP_ORIGIN"] ?? "*";
        header("Access-Control-Allow-Origin: " . $origin);
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Headers: Authorization, Content-Type, X-WC-Store-API-Nonce");
        header("HTTP/1.1 200 OK");
        exit();
    }
});
