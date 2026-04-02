<?php

/**
 * Main plugin class.
 */

if (! defined('ABSPATH')) {
	exit;
}

final class WP_Folders_Plugin
{
	const VERSION  = '5.0.2';
	const NONCE    = 'wpf_nonce';
	const TAXONOMY = 'wpf_folder';
	const OPTION_LIBRARY_ACCESS_MODE = 'wpf_library_access_mode';
	const OPTION_MEDIA_PER_PAGE = 'wpf_media_per_page';
	const OPTION_GRID_COLUMNS = 'wpf_grid_columns';

	/**
	 * Singleton instance.
	 *
	 * @var self|null
	 */
	private static $instance = null;


	/**
	 * @var WPF_I18n
	 */
	private $i18n;

	/**
	 * @var WPF_Settings
	 */
	private $settings;

	/**
	 * @var WPF_Assets
	 */
	private $assets;

	/**
	 * @var WPF_Admin_Pages
	 */
	private $admin_pages;

	/**
	 * @var WPF_Ajax_Folders
	 */
	private $ajax_folders;

	/**
	 * @var WPF_Ajax_Attachments
	 */
	private $ajax_attachments;

	/**
	 * @var WPF_Attachment_Query
	 */
	private $attachment_query;

	/**
	 * @var WPF_Attachment_Presenter
	 */
	private $attachment_presenter;

	/**
	 * @var WPF_Folder_Service
	 */
	private $folder_service;

	/**
	 * Get plugin instance.
	 *
	 * @return self
	 */
	public static function instance()
	{
		if (null === self::$instance) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct()
	{
		$this->i18n        = new WPF_I18n();
		$this->settings    = new WPF_Settings($this);
		$this->assets      = new WPF_Assets($this);
		$this->admin_pages = new WPF_Admin_Pages($this);
		$this->ajax_folders = new WPF_Ajax_Folders($this);
		$this->ajax_attachments = new WPF_Ajax_Attachments($this);
		$this->attachment_query = new WPF_Attachment_Query();
		$this->attachment_presenter = new WPF_Attachment_Presenter($this);
		$this->folder_service = new WPF_Folder_Service();

		add_action('init', array($this->i18n, 'load_textdomain'), 5);
		add_action('init', array($this, 'register_taxonomy'));
		add_action('admin_menu', array($this->admin_pages, 'register_admin_menu'));
		add_action('admin_init', array($this->admin_pages, 'redirect_default_media_library'));
		add_action('admin_post_wpf_save_settings', array($this->settings, 'handle_settings_save'));
		add_action('admin_enqueue_scripts', array($this->assets, 'enqueue_admin_assets'));
		add_action('wp_ajax_wpf_get_folders', array($this->ajax_folders, 'ajax_get_folders'));
		add_action('wp_ajax_wpf_create_folder', array($this->ajax_folders, 'ajax_create_folder'));
		add_action('wp_ajax_wpf_rename_folder', array($this->ajax_folders, 'ajax_rename_folder'));
		add_action('wp_ajax_wpf_delete_folder', array($this->ajax_folders, 'ajax_delete_folder'));
		add_action('wp_ajax_wpf_assign_folder', array($this->ajax_attachments, 'ajax_assign_folder'));
		add_action('wp_ajax_wpf_get_attachments', array($this->ajax_attachments, 'ajax_get_attachments'));
		add_action('wp_ajax_wpf_update_attachment_details', array($this->ajax_attachments, 'ajax_update_attachment_details'));
		add_action('wp_ajax_wpf_update_attachment_order', array($this->ajax_attachments, 'ajax_update_attachment_order'));
		add_action('wp_ajax_wpf_upload_files', array($this->ajax_attachments, 'ajax_upload_files'));
		add_action('wp_ajax_wpf_delete_attachments', array($this->ajax_attachments, 'ajax_delete_attachments'));
	}

	/**
	 * Translate string depending on current locale.
	 *
	 * @param string $text Text to translate.
	 * @return string
	 */
	public function t($text)
	{
		return $this->i18n->translate($text);
	}

	/**
	 * Register virtual folder taxonomy for attachments.
	 *
	 * @return void
	 */
	public function register_taxonomy()
	{
		register_taxonomy(
			self::TAXONOMY,
			'attachment',
			array(
				'hierarchical'      => true,
				'public'            => false,
				'show_ui'           => false,
				'show_admin_column' => false,
				'show_in_nav_menus' => false,
				'show_tagcloud'     => false,
				'rewrite'           => false,
				'query_var'         => self::TAXONOMY,
				'labels'            => array(
					'name'          => $this->t('Folders'),
					'singular_name' => $this->t('Folder'),
				),
			)
		);
	}

	/**
	 * Register menu items.
	 *
	 * @return void
	 */
	public function register_admin_menu()
	{
		$this->admin_pages->register_admin_menu();
	}

	/**
	 * Redirect the default Media Library screen to the custom library page.
	 *
	 * @return void
	 */
	public function redirect_default_media_library()
	{
		$this->admin_pages->redirect_default_media_library();
	}

	/**
	 * Save plugin settings.
	 *
	 * @return void
	 */
	public function handle_settings_save()
	{
		$this->settings->handle_settings_save();
	}

	/**
	 * Render standalone media manager page.
	 *
	 * @return void
	 */
	public function render_overview_page()
	{
		$this->admin_pages->render_overview_page();
	}

	/**
	 * Render settings placeholder page.
	 *
	 * @return void
	 */
	public function render_settings_page()
	{
		$this->admin_pages->render_settings_page();
	}

	/**
	 * Enqueue plugin assets.
	 *
	 * @param string $hook Current admin page hook.
	 * @return void
	 */
	public function enqueue_admin_assets($hook)
	{
		$this->assets->enqueue_admin_assets($hook);
	}

	/**
	 * AJAX: return folder tree.
	 *
	 * @return void
	 */
	public function ajax_get_folders()
	{
		$this->ajax_folders->ajax_get_folders();
	}

	/**
	 * AJAX: return attachments for the standalone page.
	 *
	 * @return void
	 */
	public function ajax_get_attachments()
	{
		$this->ajax_attachments->ajax_get_attachments();
	}

	/**
	 * AJAX: update attachment details.
	 *
	 * @return void
	 */
	public function ajax_update_attachment_details()
	{
		$this->ajax_attachments->ajax_update_attachment_details();
	}

	/**
	 * AJAX: update attachment order.
	 *
	 * @return void
	 */
	public function ajax_update_attachment_order()
	{
		$this->ajax_attachments->ajax_update_attachment_order();
	}

	/**
	 * AJAX: upload files from the standalone page.
	 *
	 * @return void
	 */
	public function ajax_upload_files()
	{
		$this->ajax_attachments->ajax_upload_files();
	}

	/**
	 * AJAX: create folder.
	 *
	 * @return void
	 */
	public function ajax_create_folder()
	{
		$this->ajax_folders->ajax_create_folder();
	}

	/**
	 * AJAX: rename folder.
	 *
	 * @return void
	 */
	public function ajax_rename_folder()
	{
		$this->ajax_folders->ajax_rename_folder();
	}

	/**
	 * AJAX: delete folder.
	 *
	 * @return void
	 */
	public function ajax_delete_folder()
	{
		$this->ajax_folders->ajax_delete_folder();
	}

	/**
	 * AJAX: assign attachments to folder.
	 *
	 * @return void
	 */
	public function ajax_assign_folder()
	{
		$this->ajax_attachments->ajax_assign_folder();
	}

	/**
	 * AJAX: permanently delete attachments.
	 *
	 * @return void
	 */
	public function ajax_delete_attachments()
	{
		$this->ajax_attachments->ajax_delete_attachments();
	}

	/**
	 * Ensure current user can use AJAX endpoints.
	 *
	 * @return void
	 */
	public function authorize_ajax()
	{
		check_ajax_referer(self::NONCE, 'nonce');

		if (! current_user_can('upload_files')) {
			wp_send_json_error(array('message' => $this->t('You do not have permission to manage folders.')), 403);
		}
	}

	/**
	 * Build folder tree structure.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public function build_folder_tree()
	{
		return $this->folder_service->build_folder_tree();
	}

	/**
	 * Return direct attachment counts for each folder term.
	 *
	 * @return array<int, int>
	 */
	public function get_attachment_counts_by_term()
	{
		return $this->folder_service->get_attachment_counts_by_term();
	}

	/**
	 * Return counts for root pseudo-folders.
	 *
	 * @return array<string, int>
	 */
	public function get_folder_summary()
	{
		return $this->folder_service->get_folder_summary();
	}

	/**
	 * Return formatted total media library size.
	 *
	 * @return string
	 */
	public function get_media_library_size()
	{
		return $this->folder_service->get_media_library_size();
	}

	/**
	 * Get current selected folder.
	 *
	 * @return int|null
	 */
	public function get_current_folder_id()
	{
		if (! isset($_REQUEST['wpf_folder'])) {
			return null;
		}

		return $this->sanitize_folder_id(wp_unslash($_REQUEST['wpf_folder']));
	}

	/**
	 * Sanitize folder ID.
	 *
	 * @param mixed $value Raw value.
	 * @return int|null
	 */
	public function sanitize_folder_id($value)
	{
		if ('' === $value || null === $value) {
			return null;
		}

		return max(0, absint($value));
	}

	/**
	 * Return shared JS strings.
	 *
	 * @return array<string, string>
	 */
	public function get_js_strings()
	{
		return $this->assets->get_js_strings();
	}

	/**
	 * Build attachment query args for the standalone page.
	 *
	 * @param int|null $folder_id Selected folder ID.
	 * @param string   $search Search query.
	 * @return array<string, mixed>
	 */
	public function get_attachment_query_args($folder_id, $search = '', $page = 1, $per_page = 20, $media_type = '', $media_month = '', $sort_by = '', $sort_order = '')
	{
		return $this->attachment_query->get_attachment_query_args($folder_id, $search, $page, $per_page, $media_type, $media_month, $sort_by, $sort_order);
	}

	/**
	 * Return query args for list sorting.
	 *
	 * @param string $sort_by Sort field.
	 * @param string $sort_order Sort direction.
	 * @return array<string, mixed>
	 */
	public function get_attachment_sort_query_args($sort_by, $sort_order)
	{
		return $this->attachment_query->get_attachment_sort_query_args($sort_by, $sort_order);
	}

	/**
	 * Sanitize attachment sort field.
	 *
	 * @param mixed $value Raw sort field.
	 * @return string
	 */
	public function sanitize_attachment_sort_by($value)
	{
		return $this->attachment_query->sanitize_attachment_sort_by($value);
	}

	/**
	 * Sanitize attachment sort direction.
	 *
	 * @param mixed $value Raw sort direction.
	 * @return string
	 */
	public function sanitize_attachment_sort_order($value)
	{
		return $this->attachment_query->sanitize_attachment_sort_order($value);
	}

	/**
	 * Return mime filter for attachment type dropdown.
	 *
	 * @param string $media_type Selected media type.
	 * @return array<int, string>|string
	 */
	public function get_attachment_mime_filter($media_type)
	{
		return $this->attachment_query->get_attachment_mime_filter($media_type);
	}

	/**
	 * Return date query for selected month.
	 *
	 * @param string $media_month Month in YYYY-MM format.
	 * @return array<string, int>
	 */
	public function get_attachment_date_query($media_month)
	{
		return $this->attachment_query->get_attachment_date_query($media_month);
	}

	/**
	 * Return available months for attachment filter.
	 *
	 * @return array<int, array<string, string>>
	 */
	public function get_attachment_month_options()
	{
		return $this->attachment_query->get_attachment_month_options();
	}

	/**
	 * Normalize PHP upload structure.
	 *
	 * @param array<string, mixed> $files Raw files array.
	 * @return array<int, array<string, mixed>>
	 */
	public function normalize_uploads_array($files)
	{
		$normalized = array();
		$count      = isset($files['name']) && is_array($files['name']) ? count($files['name']) : 0;

		for ($index = 0; $index < $count; $index++) {
			$normalized[] = array(
				'name'     => $files['name'][$index],
				'type'     => $files['type'][$index],
				'tmp_name' => $files['tmp_name'][$index],
				'error'    => $files['error'][$index],
				'size'     => $files['size'][$index],
			);
		}

		return $normalized;
	}

	/**
	 * Return plugin version from the main plugin file header.
	 *
	 * @return string
	 */
	public function get_plugin_version()
	{
		$data = get_file_data(WPF_PLUGIN_FILE, array('Version' => 'Version'));
		return isset($data['Version']) ? (string) $data['Version'] : '';
	}

	/**
	 * Determine whether the Media Library redirect is enabled.
	 *
	 * @return bool
	 */
	public function get_library_access_mode()
	{
		return $this->settings->get_library_access_mode();
	}

	/**
	 * Sanitize the library access mode.
	 *
	 * @param mixed $value Raw option value.
	 * @return string
	 */
	private function sanitize_library_access_mode($value)
	{
		$value = sanitize_key((string) $value);

		if (! in_array($value, array('separate_menu', 'redirect_library'), true)) {
			return 'separate_menu';
		}

		return $value;
	}

	/**
	 * Return the configured media items per page value.
	 *
	 * @return int
	 */
	public function get_media_per_page_setting()
	{
		return $this->settings->get_media_per_page_setting();
	}

	/**
	 * Return the configured grid columns value.
	 *
	 * @return int
	 */
	public function get_grid_columns_setting()
	{
		return $this->settings->get_grid_columns_setting();
	}

	/**
	 * Sanitize the media per page setting.
	 *
	 * @param mixed $value Raw option value.
	 * @return int
	 */
	private function sanitize_media_per_page($value)
	{
		$value = absint($value);

		if (! in_array($value, array(20, 50, 100), true)) {
			return 20;
		}

		return $value;
	}

	/**
	 * Sanitize the grid columns setting.
	 *
	 * @param mixed $value Raw option value.
	 * @return int
	 */
	private function sanitize_grid_columns($value)
	{
		$value = absint($value);

		if ($value < 5 || $value > 10) {
			return 8;
		}

		return $value;
	}

	/**
	 * Return attachment author display name.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @return string
	 */
	public function get_attachment_author_name($attachment_id)
	{
		return $this->attachment_presenter->get_attachment_author_name($attachment_id);
	}

	/**
	 * Return attachment author profile URL.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @return string
	 */
	public function get_attachment_author_profile_url($attachment_id)
	{
		return $this->attachment_presenter->get_attachment_author_profile_url($attachment_id);
	}

	/**
	 * Return formatted attachment filesize.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @return string
	 */
	public function get_attachment_filesize($attachment_id)
	{
		return $this->attachment_presenter->get_attachment_filesize($attachment_id);
	}

	/**
	 * Return formatted image dimensions when available.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @return string
	 */
	public function get_attachment_dimensions($attachment_id)
	{
		return $this->attachment_presenter->get_attachment_dimensions($attachment_id);
	}

	/**
	 * Return attachment parent title.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @return string
	 */
	public function get_attachment_parent_label($attachment_id)
	{
		return $this->attachment_presenter->get_attachment_parent_label($attachment_id);
	}

	/**
	 * Return attachment parent edit URL.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @return string
	 */
	public function get_attachment_parent_edit_url($attachment_id)
	{
		return $this->attachment_presenter->get_attachment_parent_edit_url($attachment_id);
	}

	public function present_attachment(WP_Post $attachment)
	{
		return $this->attachment_presenter->present_attachment($attachment);
	}
}
