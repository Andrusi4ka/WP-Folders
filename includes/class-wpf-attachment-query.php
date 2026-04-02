<?php

if (! defined('ABSPATH')) {
	exit;
}

final class WPF_Attachment_Query
{
	public function get_attachment_query_args($folder_id, $search = '', $page = 1, $per_page = 20, $media_type = '', $media_month = '', $sort_by = '', $sort_order = '')
	{
		$args = array(
			'post_type'              => 'attachment',
			'post_status'            => 'inherit',
			'posts_per_page'         => $per_page,
			'paged'                  => $page,
			'orderby'                => array(
				'menu_order' => 'ASC',
				'date'       => 'DESC',
				'ID'         => 'DESC',
			),
			'no_found_rows'          => false,
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
		);

		$sort_args = $this->get_attachment_sort_query_args($sort_by, $sort_order);
		if (! empty($sort_args)) {
			$args = array_merge($args, $sort_args);
		}

		if ('' !== $search) {
			$args['s'] = $search;
		}

		$mime_filter = $this->get_attachment_mime_filter($media_type);
		if (! empty($mime_filter)) {
			$args['post_mime_type'] = $mime_filter;
		}

		if ('unattached' === $media_type) {
			$args['post_parent'] = 0;
		}

		if ('mine' === $media_type) {
			$args['author'] = get_current_user_id();
		}

		$date_query = $this->get_attachment_date_query($media_month);
		if (! empty($date_query)) {
			$args['date_query'] = array($date_query);
		}

		if (null === $folder_id) {
			return $args;
		}

		if (0 === $folder_id) {
			$args['tax_query'] = array(
				array(
					'taxonomy' => WP_Folders_Plugin::TAXONOMY,
					'operator' => 'NOT EXISTS',
				),
			);
			return $args;
		}

		$args['tax_query'] = array(
			array(
				'taxonomy'         => WP_Folders_Plugin::TAXONOMY,
				'field'            => 'term_id',
				'terms'            => array($folder_id),
				'include_children' => false,
			),
		);

		return $args;
	}

	public function get_attachment_sort_query_args($sort_by, $sort_order)
	{
		$sort_by    = $this->sanitize_attachment_sort_by($sort_by);
		$sort_order = $this->sanitize_attachment_sort_order($sort_order);

		if ('' === $sort_by || '' === $sort_order) {
			return array();
		}

		switch ($sort_by) {
			case 'file':
				return array('orderby' => array('title' => $sort_order, 'ID' => $sort_order));
			case 'author':
				return array('orderby' => array('author' => $sort_order, 'ID' => $sort_order));
			case 'uploadedTo':
				return array('orderby' => array('parent' => $sort_order, 'ID' => $sort_order));
			case 'comments':
				return array('orderby' => array('comment_count' => $sort_order, 'date' => 'DESC', 'ID' => 'DESC'));
			case 'date':
				return array('orderby' => array('date' => $sort_order, 'ID' => $sort_order));
		}

		return array();
	}

	public function sanitize_attachment_sort_by($value)
	{
		$value = sanitize_key((string) $value);
		if (! in_array($value, array('file', 'author', 'uploadedTo', 'comments', 'date'), true)) {
			return '';
		}

		return $value;
	}

	public function sanitize_attachment_sort_order($value)
	{
		$value = strtoupper(sanitize_key((string) $value));
		if (! in_array($value, array('ASC', 'DESC'), true)) {
			return '';
		}

		return $value;
	}

	public function get_attachment_mime_filter($media_type)
	{
		switch ($media_type) {
			case 'image':
				return 'image';
			case 'audio':
				return 'audio';
			case 'video':
				return 'video';
			case 'document':
				return array(
					'application/pdf',
					'text/plain',
					'application/rtf',
					'application/msword',
					'application/vnd.ms-powerpoint',
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					'application/vnd.openxmlformats-officedocument.presentationml.presentation',
					'application/vnd.oasis.opendocument.text',
				);
			case 'spreadsheet':
				return array(
					'text/csv',
					'application/vnd.ms-excel',
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
					'application/vnd.oasis.opendocument.spreadsheet',
				);
			case 'archive':
				return array(
					'application/zip',
					'application/x-zip-compressed',
					'application/x-rar-compressed',
					'application/vnd.rar',
					'application/x-7z-compressed',
					'application/gzip',
					'application/x-gzip',
					'application/x-tar',
				);
		}

		return '';
	}

	public function get_attachment_date_query($media_month)
	{
		if (! preg_match('/^\d{4}-\d{2}$/', $media_month)) {
			return array();
		}

		list($year, $month) = array_map('intval', explode('-', $media_month));
		if ($year < 1970 || $month < 1 || $month > 12) {
			return array();
		}

		return array(
			'year'     => $year,
			'monthnum' => $month,
		);
	}

	public function get_attachment_month_options()
	{
		global $wpdb;

		$rows = $wpdb->get_results(
			"SELECT DISTINCT YEAR(post_date) AS year_value, MONTH(post_date) AS month_value
			FROM {$wpdb->posts}
			WHERE post_type = 'attachment'
				AND post_status = 'inherit'
			ORDER BY year_value DESC, month_value DESC",
			ARRAY_A
		);

		$options = array();
		foreach ($rows as $row) {
			$year  = isset($row['year_value']) ? (int) $row['year_value'] : 0;
			$month = isset($row['month_value']) ? (int) $row['month_value'] : 0;
			if ($year <= 0 || $month <= 0) {
				continue;
			}

			$timestamp = strtotime(sprintf('%04d-%02d-01 00:00:00', $year, $month));
			if (! $timestamp) {
				continue;
			}

			$options[] = array(
				'value' => sprintf('%04d-%02d', $year, $month),
				'label' => wp_date('F Y', $timestamp),
			);
		}

		return $options;
	}
}
