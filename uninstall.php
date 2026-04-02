<?php
/**
 * Cleanup plugin data when the plugin is deleted from WordPress.
 *
 * Removes only WP Folders data:
 * - virtual folder taxonomy terms and relationships
 * - plugin options and transients
 *
 * Media attachments, files, and attachment metadata are preserved.
 */

if (! defined('WP_UNINSTALL_PLUGIN')) {
	exit;
}

$taxonomy = 'wpf_folder';

register_taxonomy(
	$taxonomy,
	'attachment',
	array(
		'hierarchical' => true,
		'public'       => false,
		'rewrite'      => false,
	)
);

$terms = get_terms(
	array(
		'taxonomy'   => $taxonomy,
		'hide_empty' => false,
		'fields'     => 'ids',
	)
);

if (! is_wp_error($terms) && ! empty($terms)) {
	foreach ($terms as $term_id) {
		wp_delete_term((int) $term_id, $taxonomy);
	}
}

delete_option('wpf_library_access_mode');
delete_option('wpf_media_per_page');
delete_option('wpf_grid_columns');
delete_transient('wpf_media_library_size');
