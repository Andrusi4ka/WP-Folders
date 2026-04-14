<?php

if (! defined('ABSPATH')) {
	exit;
}

final class WPF_Assets
{
	/**
	 * @var WP_Folders_Plugin
	 */
	private $plugin;

	public function __construct(WP_Folders_Plugin $plugin)
	{
		$this->plugin = $plugin;
	}

	public function enqueue_admin_assets($hook)
	{
		if (! in_array($hook, array('media_page_wp-folders', 'media_page_wp-folders-settings'), true)) {
			return;
		}

		wp_enqueue_style('wp-folders-admin', WPF_PLUGIN_URL . 'assets/css/admin.css', array(), WP_Folders_Plugin::VERSION);
		wp_enqueue_script('wp-folders-library-view-grid', WPF_PLUGIN_URL . 'assets/js/library-view-grid.js', array('jquery'), WP_Folders_Plugin::VERSION, true);
		wp_enqueue_script('wp-folders-library-view-list', WPF_PLUGIN_URL . 'assets/js/library-view-list.js', array('jquery'), WP_Folders_Plugin::VERSION, true);
		wp_enqueue_script('wp-folders-library-core', WPF_PLUGIN_URL . 'assets/js/library-core.js', array('jquery'), WP_Folders_Plugin::VERSION, true);
		wp_enqueue_script('wp-folders-library-ui', WPF_PLUGIN_URL . 'assets/js/library-ui.js', array('jquery', 'wp-folders-library-core'), WP_Folders_Plugin::VERSION, true);
		wp_enqueue_script('wp-folders-library-features', WPF_PLUGIN_URL . 'assets/js/library-features.js', array('jquery', 'wp-folders-library-ui', 'wp-folders-library-view-grid', 'wp-folders-library-view-list'), WP_Folders_Plugin::VERSION, true);
		wp_enqueue_script('wp-folders-library-render', WPF_PLUGIN_URL . 'assets/js/library-render.js', array('jquery', 'wp-folders-library-features'), WP_Folders_Plugin::VERSION, true);
		wp_enqueue_script('wp-folders-library-actions', WPF_PLUGIN_URL . 'assets/js/library-actions.js', array('jquery', 'wp-folders-library-render'), WP_Folders_Plugin::VERSION, true);
		wp_enqueue_script('wp-folders-library-events', WPF_PLUGIN_URL . 'assets/js/library-events.js', array('jquery', 'wp-folders-library-actions'), WP_Folders_Plugin::VERSION, true);
		wp_enqueue_script('wp-folders-library', WPF_PLUGIN_URL . 'assets/js/library.js', array('jquery', 'wp-folders-library-events'), WP_Folders_Plugin::VERSION, true);

		wp_localize_script(
			'wp-folders-library-core',
			'wpfLibraryData',
			array(
				'ajaxUrl'            => admin_url('admin-ajax.php'),
				'nonce'              => wp_create_nonce(WP_Folders_Plugin::NONCE),
				'currentFolder'      => $this->plugin->get_current_folder_id(),
				'loadingImage'       => WPF_PLUGIN_URL . 'assets/images/loading.gif',
				'sortingImage'       => WPF_PLUGIN_URL . 'assets/images/sorting.gif',
				'icons'              => array(
					'arrow'       => WPF_PLUGIN_URL . 'assets/images/arrow.svg',
					'folderOpen'  => WPF_PLUGIN_URL . 'assets/images/folder-open.svg',
					'folderClose' => WPF_PLUGIN_URL . 'assets/images/folder-close.svg',
					'folderNew'   => WPF_PLUGIN_URL . 'assets/images/folder-new.svg',
					'pen'         => WPF_PLUGIN_URL . 'assets/images/pen.svg',
					'delete'      => WPF_PLUGIN_URL . 'assets/images/delete.svg',
				),
				'strings'            => $this->get_js_strings(),
				'defaultPerPage'     => $this->plugin->get_media_per_page_setting(),
				'defaultGridColumns' => $this->plugin->get_grid_columns_setting(),
				'alwaysShowUploadPanel' => $this->plugin->should_always_show_upload_panel(),
			)
		);
	}

	public function get_js_strings()
	{
		return array(
			'folders'                => $this->plugin->t('Folders'),
			'allMedia'               => $this->plugin->t('All Media'),
			'createFolder'           => $this->plugin->t('Create Folder'),
			'createSubfolder'        => $this->plugin->t('Create Subfolder'),
			'rename'                 => $this->plugin->t('Rename'),
			'delete'                 => $this->plugin->t('Delete'),
			'selectMultiple'         => $this->plugin->t('Select multiple'),
			'cancel'                 => $this->plugin->t('Cancel'),
			'deletePermanently'      => $this->plugin->t('Delete permanently'),
			'confirmPermanentDelete' => $this->plugin->t('Confirm permanent delete'),
			'moveSelected'           => $this->plugin->t('Move selected here'),
			'uploadHint'             => $this->plugin->t('Drop files in the current folder to auto-assign them after upload.'),
			'folderName'             => $this->plugin->t('Folder name'),
			'confirmDelete'          => $this->plugin->t('Confirm delete'),
			'currentFolder'          => $this->plugin->t('Current folder'),
			'root'                   => $this->plugin->t('Root'),
			'folderCreated'          => $this->plugin->t('Folder created.'),
			'folderUpdated'          => $this->plugin->t('Folder updated.'),
			'folderDeleted'          => $this->plugin->t('Folder deleted.'),
			'attachmentsDeleted'     => $this->plugin->t('Attachments deleted.'),
			'attachmentsMoved'       => $this->plugin->t('Attachments moved.'),
			'selectFiles'            => $this->plugin->t('Select at least one file first.'),
			'emptyName'              => $this->plugin->t('Name cannot be empty.'),
			'unexpected'             => $this->plugin->t('Unexpected server response.'),
			'noFolders'              => $this->plugin->t('No folders yet.'),
			'addFirstFolder'         => $this->plugin->t('Add first folder'),
			'chooseTargetFolder'     => $this->plugin->t('Choose target folder'),
			'assignAfterUpload'      => $this->plugin->t('Assign to current folder after upload'),
			'addToFolder'            => $this->plugin->t('Add to folder'),
			'unassigned'             => $this->plugin->t('Unassigned'),
			'searchMedia'            => $this->plugin->t('Search media'),
			'searchFiles'            => $this->plugin->t('Search files'),
			'uploadFiles'            => $this->plugin->t('Upload files'),
			'transferringFiles'      => $this->plugin->t('Transferring files...'),
			'filesTransferred'       => $this->plugin->t('Files transferred.'),
			'serverProcessingUpload' => $this->plugin->t('Server is processing uploaded files...'),
			'uploadFailed'           => $this->plugin->t('Upload failed.'),
			'uploadTransferStatus'   => $this->plugin->t('Transferring %1$s of %2$s'),
			'chooseFiles'            => $this->plugin->t('Choose files'),
			'dragFilesHere'          => $this->plugin->t('Drag files here to upload'),
			'uploadToCurrentFolder'  => $this->plugin->t('Or'),
			'moveToFolder'           => $this->plugin->t('Move to folder'),
			'noFilesFound'           => $this->plugin->t('No files found in this folder.'),
			'selectedFiles'          => $this->plugin->t('Selected files:'),
			'loadingMedia'           => $this->plugin->t('Loading media...'),
			'uploadCompleted'        => $this->plugin->t('Upload completed.'),
			'mediaLibraryButton'     => $this->plugin->t('WP Folders Media Library'),
			'viewModeLabel'          => $this->plugin->t('View mode'),
			'previousLabel'          => $this->plugin->t('Previous'),
			'nextLabel'              => $this->plugin->t('Next'),
			'uploadDateLabel'        => $this->plugin->t('Upload date'),
			'uploadedByLabel'        => $this->plugin->t('Uploaded by'),
			'fileTypeLabel'          => $this->plugin->t('File type'),
			'fileSizeLabel'          => $this->plugin->t('File size'),
			'dimensionsLabel'        => $this->plugin->t('Dimensions'),
			'viewMediaFileLabel'     => $this->plugin->t('View media file'),
			'editMoreDetailsLabel'   => $this->plugin->t('Edit more details'),
			'fileUrl'                => $this->plugin->t('File URL'),
			'closeModal'             => $this->plugin->t('Close modal'),
			'editImage'              => $this->plugin->t('Edit image'),
			'attachmentDetails'      => $this->plugin->t('Attachment details'),
			'fileDetails'            => $this->plugin->t('File details'),
			'filenameLabel'          => $this->plugin->t('Filename'),
			'typeLabel'              => $this->plugin->t('Type'),
			'dateLabel'              => $this->plugin->t('Date'),
			'urlLabel'               => $this->plugin->t('URL'),
			'altTextLabel'           => $this->plugin->t('Alt text'),
			'titleFieldLabel'        => $this->plugin->t('Title'),
			'captionLabel'           => $this->plugin->t('Caption'),
			'descriptionFieldLabel'  => $this->plugin->t('Description'),
			'copyUrlButton'          => $this->plugin->t('Copy URL to clipboard'),
			'altTextHelpLink'        => $this->plugin->t('Learn how to describe the purpose of the image.'),
			'altTextHelpNote'        => $this->plugin->t('Leave empty if the image is purely decorative.'),
			'requiredFieldsNote'     => $this->plugin->t('Required fields are marked with *'),
			'allMediaFiles'          => $this->plugin->t('All media files'),
			'imagesFilter'           => $this->plugin->t('Images'),
			'audioFilter'            => $this->plugin->t('Audio'),
			'videoFilter'            => $this->plugin->t('Video'),
			'documentsFilter'        => $this->plugin->t('Documents'),
			'spreadsheetsFilter'     => $this->plugin->t('Spreadsheets'),
			'archivesFilter'         => $this->plugin->t('Archives'),
			'unattachedFilter'       => $this->plugin->t('Unattached'),
			'mineFilter'             => $this->plugin->t('Mine'),
			'allDates'               => $this->plugin->t('All dates'),
			'urlCopied'              => $this->plugin->t('URL copied'),
			'copyUrlFailed'          => $this->plugin->t('Failed to copy URL.'),
			'showingMediaItems'      => $this->plugin->t('Showing %1$s of %2$s media items'),
			'loadMore'               => $this->plugin->t('Load more'),
			'gridView'               => $this->plugin->t('Grid view'),
			'listView'               => $this->plugin->t('List view'),
			'fileColumn'             => $this->plugin->t('File'),
			'authorColumn'           => $this->plugin->t('Author'),
			'uploadedToColumn'       => $this->plugin->t('Uploaded to'),
			'commentsColumn'         => $this->plugin->t('Comments'),
			'viewLabel'              => $this->plugin->t('View'),
			'downloadFileLabel'      => $this->plugin->t('Download file'),
			'addToLabel'             => $this->plugin->t('Add to'),
			'detachedLabel'          => $this->plugin->t('Detached'),
			'editLabel'              => $this->plugin->t('Edit'),
			'bulkActionsLabel'       => $this->plugin->t('Bulk actions'),
			'applyLabel'             => $this->plugin->t('Apply'),
			'itemsLabel'             => $this->plugin->t('items'),
			'ofLabel'                => $this->plugin->t('of'),
			'uploadPanelLabel'       => $this->plugin->t('Upload panel'),
			'alwaysShowUploadPanel'  => $this->plugin->t('Always show upload panel'),
			'uploadPanelHelp'        => $this->plugin->t('Show the upload panel by default when opening the WP Folders media library. The Upload files button will still work as a toggle.'),
		);
	}
}
