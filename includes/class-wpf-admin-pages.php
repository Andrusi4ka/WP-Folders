<?php

if (! defined('ABSPATH')) {
	exit;
}

final class WPF_Admin_Pages
{
	/**
	 * @var WP_Folders_Plugin
	 */
	private $plugin;

	public function __construct(WP_Folders_Plugin $plugin)
	{
		$this->plugin = $plugin;
	}

	public function register_admin_menu()
	{
		add_submenu_page('upload.php', $this->plugin->t('WP Folders'), $this->plugin->t('Media Folders'), 'upload_files', 'wp-folders', array($this, 'render_overview_page'));

		if ('redirect_library' === $this->plugin->get_library_access_mode()) {
			remove_submenu_page('upload.php', 'wp-folders');
		}

		add_submenu_page('upload.php', $this->plugin->t('WP Folders Settings'), $this->plugin->t('WP Folders'), 'upload_files', 'wp-folders-settings', array($this, 'render_settings_page'));
	}

	public function redirect_default_media_library()
	{
		global $pagenow;

		if (! is_admin() || 'upload.php' !== $pagenow) {
			return;
		}

		if (! current_user_can('upload_files')) {
			return;
		}

		if (wp_doing_ajax() || (defined('DOING_CRON') && DOING_CRON)) {
			return;
		}

		if (isset($_GET['page']) && in_array(sanitize_key(wp_unslash($_GET['page'])), array('wp-folders', 'wp-folders-settings'), true)) {
			return;
		}

		if ('redirect_library' !== $this->plugin->get_library_access_mode()) {
			return;
		}

		wp_safe_redirect(admin_url('upload.php?page=wp-folders'));
		exit;
	}

	public function render_overview_page()
	{
		if (! current_user_can('upload_files')) {
			wp_die(esc_html($this->plugin->t('You do not have permission to manage folders.')));
		}

		$show_library_size = $this->plugin->should_show_media_library_size();
		$always_show_upload_panel = $this->plugin->should_always_show_upload_panel();
?>
		<div class="wrap wpf-library-page" style="--wpf-grid-columns: <?php echo (int) $this->plugin->get_grid_columns_setting(); ?>;">
			<h1 class="wp-heading-inline"><?php echo esc_html($this->plugin->t('Media Library')); ?></h1>
			<button type="button" class="page-title-action wpf-upload-trigger" aria-expanded="false" aria-controls="wpf-upload-panel"><?php echo esc_html($this->plugin->t('Upload files')); ?></button>
			<input type="file" class="wpf-upload-input" multiple hidden />
			<hr class="wp-header-end">
			<div class="wpf-library-layout">
				<aside class="wpf-library-sidebar">
					<div class="wpf-sidebar-header">
						<h2><?php echo esc_html($this->plugin->t('Folders')); ?></h2>
						<button type="button" class="button button-secondary wpf-create-root"><?php echo esc_html($this->plugin->t('Create Folder')); ?></button>
					</div>
					<ul class="wpf-folder-tree"></ul>
					<?php if ($show_library_size) : ?>
						<div class="wpf-library-sidebar-summary">
							<span class="wpf-library-size-label"><?php echo esc_html($this->plugin->t('Media library size')); ?>:</span>
							<strong class="wpf-library-size-value">0 B</strong>
						</div>
					<?php endif; ?>
					<div class="wpf-library-sidebar-footer">
						<div class="wpf-library-sidebar-meta">
							<span class="wpf-library-plugin-version">v<?php echo esc_html($this->plugin->get_plugin_version()); ?></span>
							<a class="wpf-library-relevant-link" href="https://relevant.no/" target="_blank" rel="noopener noreferrer" aria-label="Relevant.no">
								<img src="<?php echo esc_url(WPF_PLUGIN_URL . 'assets/images/relevant.svg'); ?>" alt="Relevant.no" />
							</a>
						</div>
					</div>
				</aside>
				<section class="wpf-library-main">
					<div id="wpf-upload-panel" class="wpf-upload-panel"<?php echo $always_show_upload_panel ? '' : ' hidden'; ?>>
						<button type="button" class="wpf-upload-panel-close" aria-label="<?php echo esc_attr($this->plugin->t('Close')); ?>">&#10005;</button>
						<div class="wpf-upload-dropzone" tabindex="0">
							<p class="wpf-upload-panel-title"><?php echo esc_html($this->plugin->t('Drag files here to upload')); ?></p>
							<p class="wpf-upload-panel-text"><?php echo esc_html($this->plugin->t('Or')); ?></p>
							<button type="button" class="button wpf-upload-select"><?php echo esc_html($this->plugin->t('Choose files')); ?></button>
							<p class="wpf-upload-panel-note"><?php echo esc_html($this->plugin->t('Maximum upload file size: 512 MB.')); ?></p>
						</div>
						<div class="wpf-upload-progress" hidden aria-live="polite">
							<div class="wpf-upload-progress__summary">
								<div class="wpf-upload-progress__summary-head">
									<strong class="wpf-upload-progress__title"><?php echo esc_html($this->plugin->t('Transferring files...')); ?></strong>
									<span class="wpf-upload-progress__percent">0%</span>
								</div>
								<div class="wpf-upload-progress__status"><?php echo esc_html($this->plugin->t('Transferring 0 B of 0 B')); ?></div>
							</div>
							<div class="wpf-upload-progress__bar" aria-hidden="true"><span class="wpf-upload-progress__bar-fill" style="width:0%"></span></div>
							<div class="wpf-upload-progress__list"></div>
						</div>
					</div>
					<div class="wpf-library-controls">
						<div class="wpf-library-toolbar">
							<div class="wpf-library-toolbar-group">
								<div class="wpf-view-toggle" role="group" aria-label="<?php echo esc_attr($this->plugin->t('View mode')); ?>">
									<button type="button" class="button wpf-view-toggle-button is-active" data-view-mode="grid" aria-pressed="true" title="<?php echo esc_attr($this->plugin->t('Grid view')); ?>">&#xf509;</button>
									<button type="button" class="button wpf-view-toggle-button" data-view-mode="list" aria-pressed="false" title="<?php echo esc_attr($this->plugin->t('List view')); ?>">&#xf163;</button>
								</div>
								<select class="wpf-media-type-filter"><option value=""><?php echo esc_html($this->plugin->t('All media files')); ?></option></select>
								<select class="wpf-media-date-filter"><option value=""><?php echo esc_html($this->plugin->t('All dates')); ?></option></select>
								<button type="button" class="button button-primary wpf-delete-selected" hidden disabled><?php echo esc_html($this->plugin->t('Delete permanently')); ?></button>
								<button type="button" class="button button-secondary wpf-select-multiple-toggle" aria-pressed="false"><?php echo esc_html($this->plugin->t('Select multiple')); ?></button>
								<select class="wpf-target-folder-select"><option value=""><?php echo esc_html($this->plugin->t('Move to folder')); ?></option></select>
								<button type="button" class="button button-primary wpf-move-selected"><?php echo esc_html($this->plugin->t('Move to folder')); ?></button>
							</div>
							<div class="wpf-library-toolbar-group"><input type="search" class="regular-text wpf-media-search" placeholder="<?php echo esc_attr($this->plugin->t('Search media')); ?>" /></div>
						</div>
					</div>
					<div class="wpf-library-list-actions" hidden>
						<div class="wpf-library-list-actions__controls">
							<select class="wpf-list-bulk-action">
								<option value=""><?php echo esc_html($this->plugin->t('Bulk actions')); ?></option>
								<option value="delete"><?php echo esc_html($this->plugin->t('Delete permanently')); ?></option>
							</select>
							<button type="button" class="button button-secondary wpf-list-bulk-apply"><?php echo esc_html($this->plugin->t('Apply')); ?></button>
						</div>
						<div class="wpf-library-list-actions__pagination"></div>
					</div>
					<div class="wpf-library-browser">
						<div class="wpf-library-statusbar">
							<span><?php echo esc_html($this->plugin->t('Current folder')); ?>: <strong class="wpf-current-folder-name"><?php echo esc_html($this->plugin->t('All Media')); ?></strong></span>
							<span class="wpf-selected-count"><?php echo esc_html($this->plugin->t('Selected files:')); ?> <strong>0</strong></span>
						</div>
						<div class="wpf-library-loading"><div class="wpf-loading-state"><img src="<?php echo esc_url(WPF_PLUGIN_URL . 'assets/images/loading.gif'); ?>" alt="<?php echo esc_attr($this->plugin->t('Loading media...')); ?>" /></div></div>
						<div class="wpf-library-empty" hidden><div class="wpf-empty-state"><?php echo esc_html($this->plugin->t('No files found in this folder.')); ?></div></div>
						<div class="wpf-library-grid"></div>
						<div class="wpf-library-footer">
							<div class="wpf-library-results"></div>
							<button type="button" class="button button-primary wpf-load-more" hidden><?php echo esc_html($this->plugin->t('Load more')); ?></button>
						</div>
					</div>
				</section>
			</div>
		</div>
<?php
	}

	public function render_settings_page()
	{
		if (! current_user_can('upload_files')) {
			wp_die(esc_html($this->plugin->t('You do not have permission to manage folders.')));
		}

		$library_access_mode = $this->plugin->get_library_access_mode();
		$media_per_page      = $this->plugin->get_media_per_page_setting();
		$grid_columns        = $this->plugin->get_grid_columns_setting();
		$show_library_size   = $this->plugin->should_show_media_library_size();
		$always_show_upload_panel = $this->plugin->should_always_show_upload_panel();
		$image_compression_quality = $this->plugin->get_image_compression_quality_setting();
?>
		<div class="wrap wpf-settings-page">
			<h1><?php echo esc_html($this->plugin->t('WP Folders')); ?></h1>
			<p><a href="<?php echo esc_url(admin_url('upload.php?page=wp-folders')); ?>" class="button button-primary"><?php echo esc_html($this->plugin->t('WP Folders Media Library')); ?></a></p>
			<?php if (isset($_GET['settings-updated']) && 'true' === sanitize_key(wp_unslash($_GET['settings-updated']))) : ?>
				<div class="notice notice-success is-dismissible"><p><?php echo esc_html($this->plugin->t('Settings saved.')); ?></p></div>
			<?php endif; ?>
			<form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
				<input type="hidden" name="action" value="wpf_save_settings">
				<?php wp_nonce_field('wpf_save_settings'); ?>
				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row"><?php echo esc_html($this->plugin->t('Media Library access')); ?></th>
							<td>
								<fieldset>
									<label for="wpf-library-access-separate"><input type="radio" name="wpf_library_access_mode" id="wpf-library-access-separate" value="separate_menu" <?php checked($library_access_mode, 'separate_menu'); ?>><?php echo esc_html($this->plugin->t('Create separate menu item for the WP Folders media library')); ?></label>
									<p class="description"><?php echo esc_html($this->plugin->t('Keep the standard WordPress library and show WP Folders as a separate item under Media.')); ?></p>
									<label for="wpf-library-access-redirect"><input type="radio" name="wpf_library_access_mode" id="wpf-library-access-redirect" value="redirect_library" <?php checked($library_access_mode, 'redirect_library'); ?>><?php echo esc_html($this->plugin->t('Redirect the standard Media Library to WP Folders')); ?></label>
									<p class="description"><?php echo esc_html($this->plugin->t('Use WP Folders when clicking Media > Library and hide the separate WP Folders media library menu item.')); ?></p>
								</fieldset>
							</td>
						</tr>
						<tr>
							<th scope="row"><?php echo esc_html($this->plugin->t('Media library items per page')); ?></th>
							<td>
								<label for="wpf-media-per-page">
									<select name="wpf_media_per_page" id="wpf-media-per-page">
										<option value="20" <?php selected($media_per_page, 20); ?>>20</option>
										<option value="50" <?php selected($media_per_page, 50); ?>>50</option>
										<option value="100" <?php selected($media_per_page, 100); ?>>100</option>
									</select>
								</label>
								<p class="description"><?php echo esc_html($this->plugin->t('Choose how many media files should be shown per page in WP Folders.')); ?></p>
							</td>
						</tr>
						<tr>
							<th scope="row"><?php echo esc_html($this->plugin->t('Files per row in grid view')); ?></th>
							<td>
								<label for="wpf-grid-columns">
									<select name="wpf_grid_columns" id="wpf-grid-columns">
										<option value="5" <?php selected($grid_columns, 5); ?>>5</option>
										<option value="6" <?php selected($grid_columns, 6); ?>>6</option>
										<option value="7" <?php selected($grid_columns, 7); ?>>7</option>
										<option value="8" <?php selected($grid_columns, 8); ?>>8</option>
										<option value="9" <?php selected($grid_columns, 9); ?>>9</option>
										<option value="10" <?php selected($grid_columns, 10); ?>>10</option>
									</select>
								</label>
								<p class="description"><?php echo esc_html($this->plugin->t('Choose how many media files should be shown in one row when using grid view on large screens.')); ?></p>
							</td>
						</tr>
						<tr>
							<th scope="row"><?php echo esc_html($this->plugin->t('Media library size')); ?></th>
							<td>
								<label for="wpf-show-library-size">
									<input type="checkbox" name="wpf_show_library_size" id="wpf-show-library-size" value="1" <?php checked($show_library_size); ?>>
									<?php echo esc_html($this->plugin->t('Show media library size')); ?>
								</label>
								<p class="description"><?php echo esc_html($this->plugin->t('This can be slower on large media libraries because WordPress may need to count many files.')); ?></p>
							</td>
						</tr>
						<tr>
							<th scope="row"><?php echo esc_html($this->plugin->t('Upload panel')); ?></th>
							<td>
								<label for="wpf-always-show-upload-panel">
									<input type="checkbox" name="wpf_always_show_upload_panel" id="wpf-always-show-upload-panel" value="1" <?php checked($always_show_upload_panel); ?>>
									<?php echo esc_html($this->plugin->t('Always show upload panel')); ?>
								</label>
								<p class="description"><?php echo esc_html($this->plugin->t('Show the upload panel by default when opening the WP Folders media library. The Upload files button will still work as a toggle.')); ?></p>
							</td>
						</tr>
						<tr>
							<th scope="row"><?php echo esc_html($this->plugin->t('Compress images')); ?></th>
							<td>
								<div class="wpf-settings-help-row">
									<div class="wpf-settings-range-control">
										<input
											type="range"
											name="wpf_image_compression_quality"
											id="wpf-image-compression-quality"
											min="0"
											max="100"
											step="1"
											value="<?php echo (int) $image_compression_quality; ?>"
											oninput="document.getElementById('wpf-image-compression-quality-value').textContent = this.value + '%';"
										>
										<strong id="wpf-image-compression-quality-value" class="wpf-settings-range-value"><?php echo (int) $image_compression_quality; ?>%</strong>
									</div>
									<span class="wpf-settings-help">
										<button
											type="button"
											class="button-link wpf-settings-help__trigger"
											aria-label="<?php echo esc_attr($this->plugin->t('JPEG, PNG, and WebP originals are compressed during upload. GIF, SVG, AVIF, PDF, and other formats are skipped. If the value is 100%, compression is disabled.')); ?>"
										>
											<img src="<?php echo esc_url(WPF_PLUGIN_URL . 'assets/images/info.svg'); ?>" alt="" aria-hidden="true" />
										</button>
										<span class="wpf-settings-help__tooltip" role="tooltip">
											<?php echo esc_html($this->plugin->t('JPEG, PNG, and WebP originals are compressed during upload. GIF, SVG, AVIF, PDF, and other formats are skipped. If the value is 100%, compression is disabled.')); ?>
										</span>
									</span>
								</div>
								<p class="description"><?php echo esc_html($this->plugin->t('A lower percentage means stronger compression for supported image formats.')); ?></p>
							</td>
						</tr>
					</tbody>
				</table>
				<?php submit_button($this->plugin->t('Save settings')); ?>
			</form>
			<div class="wpf-settings-info">
				<h2><?php echo esc_html($this->plugin->t('About WP Folders')); ?></h2>
				<p><?php echo esc_html($this->plugin->t('WP Folders organizes media files into virtual folders without moving, copying, or changing the physical files inside the WordPress uploads directory.')); ?></p>
				<h3><?php echo esc_html($this->plugin->t('Files and URLs')); ?></h3>
				<p><?php echo esc_html($this->plugin->t('The plugin does not change file paths, file names, or URLs. All files remain in the standard WordPress uploads structure.')); ?></p>
				<p><?php echo esc_html($this->plugin->t('If the plugin is removed, all folders created by WP Folders and all folder relationships will be deleted. The media files themselves are not affected, and existing file URLs continue to work as before.')); ?></p>
				<p><?php echo esc_html($this->plugin->t('If you install the plugin again later, the folders must be created again.')); ?></p>
				<h3><?php echo esc_html($this->plugin->t('Database')); ?></h3>
				<p><?php echo esc_html($this->plugin->t('WP Folders does not create its own custom database tables. The plugin uses WordPress existing data structures, including attachments, taxonomy relationships, and regular options.')); ?></p>
				<h3><?php echo esc_html($this->plugin->t('Features')); ?></h3>
				<ul>
					<li><?php echo esc_html($this->plugin->t('Create folders and subfolders for media files.')); ?></li>
					<li><?php echo esc_html($this->plugin->t('Move files between folders without changing their physical location.')); ?></li>
					<li><?php echo esc_html($this->plugin->t('Use a dedicated media library with grid and table view.')); ?></li>
					<li><?php echo esc_html($this->plugin->t('Filter files by folder, file type, date, and search.')); ?></li>
					<li><?php echo esc_html($this->plugin->t('Edit metadata such as alt text, title, caption, and description.')); ?></li>
					<li><?php echo esc_html($this->plugin->t('Visually sort files in grid view.')); ?></li>
					<li><?php echo esc_html($this->plugin->t('Use bulk actions and pagination in table view.')); ?></li>
				</ul>
			</div>
		</div>
<?php
	}
}
