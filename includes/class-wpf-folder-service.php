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
		$show_total_size = WP_Folders_Plugin::instance()->should_show_media_library_size();

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

		$summary = array(
			'allMedia'   => (int) $all_query->found_posts,
			'unassigned' => (int) $unassigned_query->found_posts,
		);

		if ($show_total_size) {
			$summary['totalSize'] = $this->get_media_library_size();
		}

		return $summary;
	}

	public function get_media_library_size()
	{
		$cache_key   = 'wpf_media_library_size';
		$cached_size = get_transient($cache_key);

		if (false !== $cached_size && ! $this->is_zero_size_string($cached_size)) {
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
			$total_bytes += $this->get_attachment_size_in_bytes((int) $attachment_id);
		}

		$formatted = size_format($total_bytes, 2);
		set_transient($cache_key, $formatted, 5 * MINUTE_IN_SECONDS);

		return $formatted;
	}

	/**
	 * Determine the original file size for an attachment as reliably as possible.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @return int
	 */
	private function get_attachment_size_in_bytes($attachment_id)
	{
		$metadata = wp_get_attachment_metadata($attachment_id);
		if (is_array($metadata) && ! empty($metadata['filesize'])) {
			return max(0, (int) $metadata['filesize']);
		}

		$file = get_attached_file($attachment_id);
		$size = $this->get_filesystem_size($file);
		if ($size > 0) {
			return $size;
		}

		$relative_path = get_post_meta($attachment_id, '_wp_attached_file', true);
		if (! is_string($relative_path) || '' === $relative_path) {
			return 0;
		}

		$upload_dir = wp_get_upload_dir();
		if (empty($upload_dir['basedir']) || ! is_string($upload_dir['basedir'])) {
			return 0;
		}

		$normalized_relative_path = ltrim(str_replace(array('/', '\\'), DIRECTORY_SEPARATOR, $relative_path), DIRECTORY_SEPARATOR);
		$absolute_path            = trailingslashit($upload_dir['basedir']) . $normalized_relative_path;

		return $this->get_filesystem_size($absolute_path);
	}

	/**
	 * Read a file size from disk.
	 *
	 * @param string|false $file_path Absolute path.
	 * @return int
	 */
	private function get_filesystem_size($file_path)
	{
		if (! is_string($file_path) || '' === $file_path || ! file_exists($file_path)) {
			return 0;
		}

		if (function_exists('wp_filesize')) {
			return max(0, (int) wp_filesize($file_path));
		}

		return max(0, (int) filesize($file_path));
	}

	/**
	 * Check whether a formatted size string represents zero.
	 *
	 * @param mixed $value Cached formatted size.
	 * @return bool
	 */
	private function is_zero_size_string($value)
	{
		if (! is_string($value)) {
			return false;
		}

		return 1 === preg_match('/^\s*0(?:[.,]0+)?(?:\s|$)/', trim($value));
	}

}
