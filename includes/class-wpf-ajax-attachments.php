<?php

if (! defined('ABSPATH')) {
	exit;
}

final class WPF_Ajax_Attachments
{
	/**
	 * @var WP_Folders_Plugin
	 */
	private $plugin;

	public function __construct(WP_Folders_Plugin $plugin)
	{
		$this->plugin = $plugin;
	}

	public function ajax_get_attachments()
	{
		$this->plugin->authorize_ajax();

		$folder_id   = isset($_POST['folderId']) ? $this->plugin->sanitize_folder_id(wp_unslash($_POST['folderId'])) : null;
		$search      = isset($_POST['search']) ? sanitize_text_field(wp_unslash($_POST['search'])) : '';
		$page        = isset($_POST['page']) ? max(1, absint(wp_unslash($_POST['page']))) : 1;
		$per_page    = isset($_POST['perPage']) ? max(1, min(200, absint(wp_unslash($_POST['perPage'])))) : $this->plugin->get_media_per_page_setting();
		$media_type  = isset($_POST['mediaType']) ? sanitize_key(wp_unslash($_POST['mediaType'])) : '';
		$media_month = isset($_POST['mediaMonth']) ? sanitize_text_field(wp_unslash($_POST['mediaMonth'])) : '';
		$sort_by     = isset($_POST['sortBy']) ? $this->plugin->sanitize_attachment_sort_by(wp_unslash($_POST['sortBy'])) : '';
		$sort_order  = isset($_POST['sortOrder']) ? $this->plugin->sanitize_attachment_sort_order(wp_unslash($_POST['sortOrder'])) : '';

		$query = new WP_Query($this->plugin->get_attachment_query_args($folder_id, $search, $page, $per_page, $media_type, $media_month, $sort_by, $sort_order));
		$items = array();

		foreach ($query->posts as $attachment) {
			$items[] = $this->plugin->present_attachment($attachment);
		}

		wp_send_json_success(
			array(
				'attachments' => $items,
				'total'       => (int) $query->found_posts,
				'shown'       => min($page * $per_page, (int) $query->found_posts),
				'page'        => $page,
				'perPage'     => $per_page,
				'totalPages'  => (int) $query->max_num_pages,
				'hasMore'     => $page < (int) $query->max_num_pages,
				'filters'     => array(
					'months' => $this->plugin->get_attachment_month_options(),
				),
			)
		);
	}

	public function ajax_update_attachment_details()
	{
		$this->plugin->authorize_ajax();

		$attachment_id = isset($_POST['attachmentId']) ? absint(wp_unslash($_POST['attachmentId'])) : 0;
		if ($attachment_id <= 0 || 'attachment' !== get_post_type($attachment_id)) {
			wp_send_json_error(array('message' => $this->plugin->t('Unexpected server response.')), 400);
		}

		if (! current_user_can('edit_post', $attachment_id)) {
			wp_send_json_error(array('message' => $this->plugin->t('You do not have permission to manage folders.')), 403);
		}

		$fields          = isset($_POST['fields']) ? (array) wp_unslash($_POST['fields']) : array();
		$postarr         = array('ID' => $attachment_id);
		$has_post_update = false;

		if (array_key_exists('title', $fields)) {
			$postarr['post_title'] = sanitize_text_field($fields['title']);
			$has_post_update       = true;
		}

		if (array_key_exists('caption', $fields)) {
			$postarr['post_excerpt'] = sanitize_textarea_field($fields['caption']);
			$has_post_update         = true;
		}

		if (array_key_exists('description', $fields)) {
			$postarr['post_content'] = sanitize_textarea_field($fields['description']);
			$has_post_update         = true;
		}

		if ($has_post_update) {
			wp_update_post($postarr);
		}

		if (array_key_exists('alt', $fields)) {
			update_post_meta($attachment_id, '_wp_attachment_image_alt', sanitize_text_field($fields['alt']));
		}

		$attachment = get_post($attachment_id);
		if (! $attachment instanceof WP_Post) {
			wp_send_json_error(array('message' => $this->plugin->t('Unexpected server response.')), 404);
		}

		wp_send_json_success(
			array(
				'details' => array(
					'title'       => get_the_title($attachment_id),
					'alt'         => get_post_meta($attachment_id, '_wp_attachment_image_alt', true),
					'caption'     => $attachment->post_excerpt,
					'description' => $attachment->post_content,
				),
			)
		);
	}

	public function ajax_update_attachment_order()
	{
		$this->plugin->authorize_ajax();

		$ordered_ids = isset($_POST['orderedIds']) ? (array) wp_unslash($_POST['orderedIds']) : array();
		$ids         = array_values(array_filter(array_map('absint', $ordered_ids)));

		if (count($ids) < 2) {
			wp_send_json_error(array('message' => $this->plugin->t('Unexpected server response.')), 400);
		}

		foreach ($ids as $index => $attachment_id) {
			if ('attachment' !== get_post_type($attachment_id) || ! current_user_can('edit_post', $attachment_id)) {
				wp_send_json_error(array('message' => $this->plugin->t('You do not have permission to manage folders.')), 403);
			}

			wp_update_post(
				array(
					'ID'         => $attachment_id,
					'menu_order' => $index + 1,
				)
			);
		}

		wp_send_json_success();
	}

	public function ajax_upload_files()
	{
		$this->plugin->authorize_ajax();

		if (empty($_FILES['files']) || empty($_FILES['files']['name'])) {
			wp_send_json_error(array('message' => $this->plugin->t('Unexpected server response.')), 400);
		}

		$folder_id = isset($_POST['folderId']) ? $this->plugin->sanitize_folder_id(wp_unslash($_POST['folderId'])) : null;

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$uploaded = array();
		$files    = $this->plugin->normalize_uploads_array($_FILES['files']);

		foreach ($files as $file) {
			$_FILES['wpf_single_upload'] = $file;
			$attachment_id               = media_handle_upload('wpf_single_upload', 0);

			if (is_wp_error($attachment_id)) {
				wp_send_json_error(array('message' => $attachment_id->get_error_message()), 400);
			}

			if (null !== $folder_id && 0 !== $folder_id) {
				wp_set_object_terms($attachment_id, array($folder_id), WP_Folders_Plugin::TAXONOMY, false);
			}

			$uploaded[] = $attachment_id;
		}

		unset($_FILES['wpf_single_upload']);
		delete_transient('wpf_media_library_size');

		wp_send_json_success(
			array(
				'message'     => $this->plugin->t('Upload completed.'),
				'uploadedIds' => $uploaded,
			)
		);
	}

	public function ajax_assign_folder()
	{
		$this->plugin->authorize_ajax();

		$folder_id   = isset($_POST['folderId']) ? $this->plugin->sanitize_folder_id(wp_unslash($_POST['folderId'])) : null;
		$attachments = isset($_POST['attachmentIds']) ? (array) wp_unslash($_POST['attachmentIds']) : array();
		$ids         = array_values(array_filter(array_map('absint', $attachments)));

		if (empty($ids)) {
			wp_send_json_error(array('message' => $this->plugin->t('Select at least one file first.')), 400);
		}

		foreach ($ids as $attachment_id) {
			if (0 === $folder_id) {
				wp_delete_object_term_relationships($attachment_id, WP_Folders_Plugin::TAXONOMY);
				continue;
			}

			wp_set_object_terms($attachment_id, array($folder_id), WP_Folders_Plugin::TAXONOMY, false);
		}

		wp_send_json_success(
			array(
				'message' => $this->plugin->t('Attachments moved.'),
			)
		);
	}

	public function ajax_delete_attachments()
	{
		$this->plugin->authorize_ajax();

		$attachments = isset($_POST['attachmentIds']) ? (array) wp_unslash($_POST['attachmentIds']) : array();
		$ids         = array_values(array_filter(array_map('absint', $attachments)));

		if (empty($ids)) {
			wp_send_json_error(array('message' => $this->plugin->t('Select at least one file first.')), 400);
		}

		foreach ($ids as $attachment_id) {
			if (! current_user_can('delete_post', $attachment_id)) {
				wp_send_json_error(array('message' => $this->plugin->t('You do not have permission to manage folders.')), 403);
			}

			wp_delete_attachment($attachment_id, true);
		}

		delete_transient('wpf_media_library_size');

		wp_send_json_success(
			array(
				'message' => $this->plugin->t('Attachments deleted.'),
			)
		);
	}
}
