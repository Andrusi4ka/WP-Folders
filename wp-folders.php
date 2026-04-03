<?php
/**
 * Plugin Name: WP Folders
 * Plugin URI: https://example.com/
 * Description: Adds virtual folders and subfolders to the WordPress Media Library without changing physical file paths.
 * Version: 6.0.1
 * Author: Relevant AS (Andrii Boiko)
 * Author URI: https://relevant.no
 * Text Domain: wp-folders
 * Requires at least: 6.2
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WPF_PLUGIN_FILE', __FILE__ );
define( 'WPF_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WPF_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once WPF_PLUGIN_DIR . 'includes/class-wp-folders-plugin.php';
require_once WPF_PLUGIN_DIR . 'includes/class-wpf-i18n.php';
require_once WPF_PLUGIN_DIR . 'includes/class-wpf-settings.php';
require_once WPF_PLUGIN_DIR . 'includes/class-wpf-assets.php';
require_once WPF_PLUGIN_DIR . 'includes/class-wpf-admin-pages.php';
require_once WPF_PLUGIN_DIR . 'includes/class-wpf-ajax-folders.php';
require_once WPF_PLUGIN_DIR . 'includes/class-wpf-ajax-attachments.php';
require_once WPF_PLUGIN_DIR . 'includes/class-wpf-attachment-query.php';
require_once WPF_PLUGIN_DIR . 'includes/class-wpf-attachment-presenter.php';
require_once WPF_PLUGIN_DIR . 'includes/class-wpf-folder-service.php';

WP_Folders_Plugin::instance();
