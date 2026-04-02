<?php

if (! defined('ABSPATH')) {
	exit;
}

final class WPF_Ajax_Folders
{
	/**
	 * @var WP_Folders_Plugin
	 */
	private $plugin;

	public function __construct(WP_Folders_Plugin $plugin)
	{
		$this->plugin = $plugin;
	}

	public function ajax_get_folders()
	{
		$this->plugin->authorize_ajax();
		wp_send_json_success(
			array(
				'folders' => $this->plugin->build_folder_tree(),
				'summary' => $this->plugin->get_folder_summary(),
			)
		);
	}

	public function ajax_create_folder()
	{
		$this->plugin->authorize_ajax();

		$name   = isset($_POST['name']) ? sanitize_text_field(wp_unslash($_POST['name'])) : '';
		$parent = isset($_POST['parent']) ? $this->plugin->sanitize_folder_id(wp_unslash($_POST['parent'])) : null;

		if ('' === $name) {
			wp_send_json_error(array('message' => $this->plugin->t('Name cannot be empty.')), 400);
		}

		$result = wp_insert_term(
			$name,
			WP_Folders_Plugin::TAXONOMY,
			array(
				'parent' => max(0, (int) $parent),
			)
		);

		if (is_wp_error($result)) {
			wp_send_json_error(array('message' => $result->get_error_message()), 400);
		}

		wp_send_json_success(
			array(
				'message' => $this->plugin->t('Folder created.'),
				'folders' => $this->plugin->build_folder_tree(),
			)
		);
	}

	public function ajax_rename_folder()
	{
		$this->plugin->authorize_ajax();

		$term_id = isset($_POST['termId']) ? $this->plugin->sanitize_folder_id(wp_unslash($_POST['termId'])) : null;
		$name    = isset($_POST['name']) ? sanitize_text_field(wp_unslash($_POST['name'])) : '';

		if (! $term_id || '' === $name) {
			wp_send_json_error(array('message' => $this->plugin->t('Name cannot be empty.')), 400);
		}

		$result = wp_update_term(
			$term_id,
			WP_Folders_Plugin::TAXONOMY,
			array(
				'name' => $name,
			)
		);

		if (is_wp_error($result)) {
			wp_send_json_error(array('message' => $result->get_error_message()), 400);
		}

		wp_send_json_success(
			array(
				'message' => $this->plugin->t('Folder updated.'),
				'folders' => $this->plugin->build_folder_tree(),
			)
		);
	}

	public function ajax_delete_folder()
	{
		$this->plugin->authorize_ajax();

		$term_id = isset($_POST['termId']) ? $this->plugin->sanitize_folder_id(wp_unslash($_POST['termId'])) : null;

		if (! $term_id) {
			wp_send_json_error(array('message' => $this->plugin->t('Unexpected server response.')), 400);
		}

		$term = get_term($term_id, WP_Folders_Plugin::TAXONOMY);
		if (! $term || is_wp_error($term)) {
			wp_send_json_error(array('message' => $this->plugin->t('Unexpected server response.')), 404);
		}

		$parent_id = (int) $term->parent;
		$children  = get_terms(
			array(
				'taxonomy'   => WP_Folders_Plugin::TAXONOMY,
				'hide_empty' => false,
				'parent'     => $term_id,
			)
		);

		foreach ($children as $child) {
			wp_update_term(
				$child->term_id,
				WP_Folders_Plugin::TAXONOMY,
				array(
					'parent' => $parent_id,
				)
			);
		}

		$attachments = get_objects_in_term($term_id, WP_Folders_Plugin::TAXONOMY);
		foreach ($attachments as $attachment_id) {
			if ($parent_id > 0) {
				wp_set_object_terms((int) $attachment_id, array($parent_id), WP_Folders_Plugin::TAXONOMY, false);
			} else {
				wp_delete_object_term_relationships((int) $attachment_id, WP_Folders_Plugin::TAXONOMY);
			}
		}

		$result = wp_delete_term($term_id, WP_Folders_Plugin::TAXONOMY);
		if (is_wp_error($result) || false === $result) {
			wp_send_json_error(array('message' => $this->plugin->t('Unexpected server response.')), 400);
		}

		wp_send_json_success(
			array(
				'message' => $this->plugin->t('Folder deleted.'),
				'folders' => $this->plugin->build_folder_tree(),
			)
		);
	}
}
