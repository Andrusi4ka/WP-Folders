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
}
