<?php

if (! defined('ABSPATH')) {
	exit;
}

final class WPF_Folder_Service
{
	public function build_folder_tree()
	{
		$terms = get_terms(
			array(
				'taxonomy'   => WP_Folders_Plugin::TAXONOMY,
				'hide_empty' => false,
				'orderby'    => 'name',
				'order'      => 'ASC',
			)
		);

		if (is_wp_error($terms) || empty($terms)) {
			return array();
		}

		$counts  = $this->get_attachment_counts_by_term();
		$indexed = array();
		foreach ($terms as $term) {
			$indexed[$term->term_id] = array(
				'id'       => (int) $term->term_id,
				'name'     => $term->name,
				'parent'   => (int) $term->parent,
				'count'    => isset($counts[$term->term_id]) ? (int) $counts[$term->term_id] : 0,
				'children' => array(),
			);
		}

		$tree = array();
		foreach (array_keys($indexed) as $term_id) {
			if ($indexed[$term_id]['parent'] && isset($indexed[$indexed[$term_id]['parent']])) {
				$indexed[$indexed[$term_id]['parent']]['children'][] = &$indexed[$term_id];
				continue;
			}

			$tree[] = &$indexed[$term_id];
		}

		return array_values($tree);
	}

	public function get_attachment_counts_by_term()
	{
		global $wpdb;

		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT tt.term_id, COUNT(DISTINCT tr.object_id) AS total
				FROM {$wpdb->term_relationships} tr
				INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
				INNER JOIN {$wpdb->posts} p ON p.ID = tr.object_id
				WHERE tt.taxonomy = %s
					AND p.post_type = 'attachment'
					AND p.post_status = 'inherit'
				GROUP BY tt.term_id",
				WP_Folders_Plugin::TAXONOMY
			),
			ARRAY_A
		);

		$counts = array();
		foreach ($rows as $row) {
			$counts[(int) $row['term_id']] = (int) $row['total'];
		}

		return $counts;
	}

	public function get_folder_summary()
	{
		$all_query = new WP_Query(
			array(
				'post_type'              => 'attachment',
				'post_status'            => 'inherit',
				'posts_per_page'         => 1,
				'fields'                 => 'ids',
				'no_found_rows'          => false,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		$unassigned_query = new WP_Query(
			array(
				'post_type'              => 'attachment',
				'post_status'            => 'inherit',
				'posts_per_page'         => 1,
				'fields'                 => 'ids',
				'no_found_rows'          => false,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
				'tax_query'              => array(
					array(
						'taxonomy' => WP_Folders_Plugin::TAXONOMY,
						'operator' => 'NOT EXISTS',
					),
				),
			)
		);

		return array(
			'allMedia'   => (int) $all_query->found_posts,
			'unassigned' => (int) $unassigned_query->found_posts,
			'totalSize'  => $this->get_media_library_size(),
		);
	}

	public function get_media_library_size()
	{
		$cache_key   = 'wpf_media_library_size';
		$cached_size = get_transient($cache_key);

		if (false !== $cached_size) {
			return (string) $cached_size;
		}

		$query = new WP_Query(
			array(
				'post_type'              => 'attachment',
				'post_status'            => 'inherit',
				'posts_per_page'         => -1,
				'fields'                 => 'ids',
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		$total_bytes = 0;
		foreach ($query->posts as $attachment_id) {
			$file = get_attached_file($attachment_id);
			if ($file && file_exists($file)) {
				$total_bytes += (int) filesize($file);
			}
		}

		$formatted = size_format($total_bytes, 2);
		set_transient($cache_key, $formatted, 5 * MINUTE_IN_SECONDS);

		return $formatted;
	}
}
