<?php

if (! defined('ABSPATH')) {
	exit;
}

final class WPF_Attachment_Presenter
{
	/**
	 * @var WP_Folders_Plugin
	 */
	private $plugin;

	public function __construct(WP_Folders_Plugin $plugin)
	{
		$this->plugin = $plugin;
	}

	public function present_attachment(WP_Post $attachment)
	{
		$thumb   = wp_get_attachment_image_url($attachment->ID, 'medium');
		$preview = wp_get_attachment_image_url($attachment->ID, 'full');

		if (! $thumb) {
			$thumb = wp_mime_type_icon($attachment->ID);
		}

		if (! $preview) {
			$preview = $thumb;
		}

		return array(
			'id'                => (int) $attachment->ID,
			'title'             => get_the_title($attachment->ID),
			'alt'               => get_post_meta($attachment->ID, '_wp_attachment_image_alt', true),
			'caption'           => $attachment->post_excerpt,
			'description'       => $attachment->post_content,
			'filename'          => wp_basename(get_attached_file($attachment->ID)),
			'url'               => wp_get_attachment_url($attachment->ID),
			'attachmentPageUrl' => get_attachment_link($attachment->ID),
			'editUrl'           => get_edit_post_link($attachment->ID, ''),
			'thumb'             => $thumb,
			'previewUrl'        => $preview,
			'mimeType'          => get_post_mime_type($attachment->ID),
			'date'              => get_the_date('', $attachment->ID),
			'dateShort'         => get_the_date('d.m.y', $attachment->ID),
			'uploadedBy'        => $this->get_attachment_author_name($attachment->ID),
			'uploadedByUrl'     => $this->get_attachment_author_profile_url($attachment->ID),
			'uploadedTo'        => $this->get_attachment_parent_label($attachment->ID),
			'uploadedToUrl'     => $this->get_attachment_parent_edit_url($attachment->ID),
			'commentCount'      => (int) get_comments_number($attachment->ID),
			'filesize'          => $this->get_attachment_filesize($attachment->ID),
			'dimensions'        => $this->get_attachment_dimensions($attachment->ID),
		);
	}

	public function get_attachment_author_name($attachment_id)
	{
		$author_id = (int) get_post_field('post_author', $attachment_id);
		if ($author_id <= 0) {
			return '';
		}

		$user = get_userdata($author_id);
		if (! $user) {
			return '';
		}

		return (string) $user->display_name;
	}

	public function get_attachment_author_profile_url($attachment_id)
	{
		$author_id = (int) get_post_field('post_author', $attachment_id);
		if ($author_id <= 0) {
			return '';
		}

		return (string) get_edit_user_link($author_id);
	}

	public function get_attachment_filesize($attachment_id)
	{
		$file = get_attached_file($attachment_id);
		if (! $file || ! file_exists($file)) {
			return '';
		}

		return size_format((int) filesize($file), 2);
	}

	public function get_attachment_dimensions($attachment_id)
	{
		$metadata = wp_get_attachment_metadata($attachment_id);
		if (! is_array($metadata) || empty($metadata['width']) || empty($metadata['height'])) {
			return '';
		}

		return sprintf('%1$d x %2$d px', (int) $metadata['width'], (int) $metadata['height']);
	}

	public function get_attachment_parent_label($attachment_id)
	{
		$parent_id = (int) wp_get_post_parent_id($attachment_id);
		if ($parent_id <= 0) {
			return $this->plugin->t('Detached');
		}

		return get_the_title($parent_id);
	}

	public function get_attachment_parent_edit_url($attachment_id)
	{
		$parent_id = (int) wp_get_post_parent_id($attachment_id);
		if ($parent_id <= 0) {
			return '';
		}

		return (string) get_edit_post_link($parent_id, '');
	}
}
