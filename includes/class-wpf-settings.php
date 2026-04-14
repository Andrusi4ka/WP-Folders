<?php

if (! defined('ABSPATH')) {
	exit;
}

final class WPF_Settings
{
	/**
	 * @var WP_Folders_Plugin
	 */
	private $plugin;

	public function __construct(WP_Folders_Plugin $plugin)
	{
		$this->plugin = $plugin;
	}

	public function handle_settings_save()
	{
		if (! current_user_can('upload_files')) {
			wp_die(esc_html($this->plugin->t('You do not have permission to manage folders.')));
		}

		check_admin_referer('wpf_save_settings');

		update_option(WP_Folders_Plugin::OPTION_LIBRARY_ACCESS_MODE, $this->sanitize_library_access_mode(isset($_POST['wpf_library_access_mode']) ? wp_unslash($_POST['wpf_library_access_mode']) : 'separate_menu'));
		update_option(WP_Folders_Plugin::OPTION_MEDIA_PER_PAGE, $this->sanitize_media_per_page(isset($_POST['wpf_media_per_page']) ? wp_unslash($_POST['wpf_media_per_page']) : 20));
		update_option(WP_Folders_Plugin::OPTION_GRID_COLUMNS, $this->sanitize_grid_columns(isset($_POST['wpf_grid_columns']) ? wp_unslash($_POST['wpf_grid_columns']) : 8));
		update_option(WP_Folders_Plugin::OPTION_SHOW_LIBRARY_SIZE, $this->sanitize_show_media_library_size(isset($_POST['wpf_show_library_size']) ? wp_unslash($_POST['wpf_show_library_size']) : '0'));
		update_option(WP_Folders_Plugin::OPTION_ALWAYS_SHOW_UPLOAD_PANEL, $this->sanitize_always_show_upload_panel(isset($_POST['wpf_always_show_upload_panel']) ? wp_unslash($_POST['wpf_always_show_upload_panel']) : '0'));
		update_option(WP_Folders_Plugin::OPTION_IMAGE_COMPRESSION_QUALITY, $this->sanitize_image_compression_quality(isset($_POST['wpf_image_compression_quality']) ? wp_unslash($_POST['wpf_image_compression_quality']) : 100));

		wp_safe_redirect(
			add_query_arg(
				array(
					'page'             => 'wp-folders-settings',
					'settings-updated' => 'true',
				),
				admin_url('upload.php')
			)
		);
		exit;
	}

	public function get_library_access_mode()
	{
		return $this->sanitize_library_access_mode(get_option(WP_Folders_Plugin::OPTION_LIBRARY_ACCESS_MODE, 'separate_menu'));
	}

	public function sanitize_library_access_mode($value)
	{
		$value = sanitize_key((string) $value);

		if (! in_array($value, array('separate_menu', 'redirect_library'), true)) {
			return 'separate_menu';
		}

		return $value;
	}

	public function get_media_per_page_setting()
	{
		return $this->sanitize_media_per_page(get_option(WP_Folders_Plugin::OPTION_MEDIA_PER_PAGE, 20));
	}

	public function get_grid_columns_setting()
	{
		return $this->sanitize_grid_columns(get_option(WP_Folders_Plugin::OPTION_GRID_COLUMNS, 8));
	}

	public function should_show_media_library_size()
	{
		return '1' === (string) get_option(WP_Folders_Plugin::OPTION_SHOW_LIBRARY_SIZE, '1');
	}

	public function should_always_show_upload_panel()
	{
		return '1' === (string) get_option(WP_Folders_Plugin::OPTION_ALWAYS_SHOW_UPLOAD_PANEL, '0');
	}

	public function get_image_compression_quality_setting()
	{
		return $this->sanitize_image_compression_quality(get_option(WP_Folders_Plugin::OPTION_IMAGE_COMPRESSION_QUALITY, 100));
	}

	public function sanitize_media_per_page($value)
	{
		$value = absint($value);

		if (! in_array($value, array(20, 50, 100), true)) {
			return 20;
		}

		return $value;
	}

	public function sanitize_grid_columns($value)
	{
		$value = absint($value);

		if ($value < 5 || $value > 10) {
			return 8;
		}

		return $value;
	}

	public function sanitize_show_media_library_size($value)
	{
		return '1' === (string) $value ? '1' : '0';
	}

	public function sanitize_always_show_upload_panel($value)
	{
		return '1' === (string) $value ? '1' : '0';
	}

	public function sanitize_image_compression_quality($value)
	{
		$value = absint($value);

		if ($value > 100) {
			return 100;
		}

		return $value;
	}
}
