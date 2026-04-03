(function ($, window) {
	'use strict';

	var app = window.WPFLibraryApp;

	if (!app || typeof wpfLibraryData === 'undefined') {
		return;
	}

	function state() {
		return app.state;
	}

	app.openDetailsModal = function (item) {
		var $modal = app.ensureDetailsModal();
		app.hideSortingHint();
		var imageSrc = item.previewUrl || item.thumb || '';
		var filename = app.escapeHtml(item.filename || '');
		var mimeType = app.escapeHtml(item.mimeType || '');
		var hasTransparencyGrid = mimeType === 'image/svg+xml' || mimeType === 'image/png';
		var imageClass = hasTransparencyGrid ? ' class="wpf-file-modal__image has-transparency-grid"' : ' class="wpf-file-modal__image"';
		var image = imageSrc ? '<img' + imageClass + ' src="' + app.escapeHtml(imageSrc) + '" alt="">' : '';
		var date = app.escapeHtml(item.date || '');
		var fileUrl = app.escapeHtml(item.url || '');
		var attachmentPageUrl = app.escapeHtml(item.attachmentPageUrl || '');
		var deleteLabel = app.escapeHtml(wpfLibraryData.strings.deletePermanently || 'Delete permanently');
		var uploadedByName = app.escapeHtml(item.uploadedBy || '');
		var uploadedByUrl = app.escapeHtml(item.uploadedByUrl || '');
		var uploadedBy = uploadedByUrl
			? '<a class="wpf-file-modal__meta-link" href="' + uploadedByUrl + '">' + uploadedByName + '</a>'
			: uploadedByName;
		var filesize = app.escapeHtml(item.filesize || '');
		var dimensions = app.escapeHtml(item.dimensions || '');
		var alt = app.escapeHtml(item.alt || '');
		var titleValue = app.escapeHtml(item.title || '');
		var caption = app.escapeHtml(item.caption || '');
		var description = app.escapeHtml(item.description || '');
		var requiredFieldsNote = app.escapeHtml(wpfLibraryData.strings.requiredFieldsNote || '').replace('*', '<span class="wpf-file-modal__required-asterisk">*</span>');
		state().currentModalAttachmentId = Number(item.id);

		$modal.find('.wpf-file-modal__body').html(
			'<div class="wpf-file-modal__layout">' +
				'<div class="wpf-file-modal__preview-column">' +
					'<div class="wpf-file-modal__preview">' + image + '</div>' +
					'<button type="button" class="button wpf-file-modal__edit-image">' + app.escapeHtml(wpfLibraryData.strings.editImage) + '</button>' +
				'</div>' +
				'<div class="wpf-file-modal__content">' +
					'<section class="wpf-file-modal__section wpf-file-modal__section--meta">' +
						'<dl class="wpf-file-modal__meta">' +
							'<div><dt>' + app.escapeHtml(wpfLibraryData.strings.uploadDateLabel || 'Upload date') + '</dt><dd>' + date + '</dd></div>' +
							'<div><dt>' + app.escapeHtml(wpfLibraryData.strings.uploadedByLabel || 'Uploaded by') + '</dt><dd>' + uploadedBy + '</dd></div>' +
							'<div><dt>' + app.escapeHtml(wpfLibraryData.strings.filenameLabel || 'Filename') + '</dt><dd>' + filename + '</dd></div>' +
							'<div><dt>' + app.escapeHtml(wpfLibraryData.strings.fileTypeLabel || 'File type') + '</dt><dd>' + mimeType + '</dd></div>' +
							'<div><dt>' + app.escapeHtml(wpfLibraryData.strings.fileSizeLabel || 'File size') + '</dt><dd>' + filesize + '</dd></div>' +
							'<div><dt>' + app.escapeHtml(wpfLibraryData.strings.dimensionsLabel || 'Dimensions') + '</dt><dd>' + dimensions + '</dd></div>' +
						'</dl>' +
					'</section>' +
					'<section class="wpf-file-modal__section wpf-file-modal__section--middle">' +
						'<div class="wpf-file-modal__form-row">' +
							'<label class="wpf-file-modal__form-label" for="wpf-attachment-alt">' + app.escapeHtml(wpfLibraryData.strings.altTextLabel) + '</label>' +
							'<div class="wpf-file-modal__form-control">' +
								'<textarea id="wpf-attachment-alt" class="wpf-file-modal__field" data-field-name="alt" rows="3">' + alt + '</textarea>' +
								'<p class="wpf-file-modal__field-help"><a href="https://www.w3.org/WAI/tutorials/images/decision-tree/" target="_blank" rel="noopener noreferrer">' + app.escapeHtml(wpfLibraryData.strings.altTextHelpLink) + '</a> ' + app.escapeHtml(wpfLibraryData.strings.altTextHelpNote) + '</p>' +
							'</div>' +
						'</div>' +
						'<div class="wpf-file-modal__form-row">' +
							'<label class="wpf-file-modal__form-label" for="wpf-attachment-title">' + app.escapeHtml(wpfLibraryData.strings.titleFieldLabel) + '</label>' +
							'<div class="wpf-file-modal__form-control">' +
								'<input id="wpf-attachment-title" class="wpf-file-modal__field" data-field-name="title" type="text" value="' + titleValue + '">' +
							'</div>' +
						'</div>' +
						'<div class="wpf-file-modal__form-row">' +
							'<label class="wpf-file-modal__form-label" for="wpf-attachment-caption">' + app.escapeHtml(wpfLibraryData.strings.captionLabel) + '</label>' +
							'<div class="wpf-file-modal__form-control">' +
								'<textarea id="wpf-attachment-caption" class="wpf-file-modal__field" data-field-name="caption" rows="4">' + caption + '</textarea>' +
							'</div>' +
						'</div>' +
						'<div class="wpf-file-modal__form-row">' +
							'<label class="wpf-file-modal__form-label" for="wpf-attachment-description">' + app.escapeHtml(wpfLibraryData.strings.descriptionFieldLabel) + '</label>' +
							'<div class="wpf-file-modal__form-control">' +
								'<textarea id="wpf-attachment-description" class="wpf-file-modal__field" data-field-name="description" rows="4">' + description + '</textarea>' +
							'</div>' +
						'</div>' +
						'<div class="wpf-file-modal__form-row">' +
							'<label class="wpf-file-modal__form-label" for="wpf-attachment-url">' + app.escapeHtml(wpfLibraryData.strings.urlLabel) + '</label>' +
							'<div class="wpf-file-modal__form-control">' +
								'<input id="wpf-attachment-url" class="wpf-file-modal__field" type="text" value="' + fileUrl + '" readonly>' +
								'<button type="button" class="button wpf-file-modal__copy-url-button" data-url="' + fileUrl + '">' + app.escapeHtml(wpfLibraryData.strings.copyUrlButton) + '</button>' +
							'</div>' +
						'</div>' +
						'<p class="wpf-file-modal__required-note">' + requiredFieldsNote + '</p>' +
					'</section>' +
					'<section class="wpf-file-modal__section wpf-file-modal__section--bottom">' +
						'<a class="wpf-file-modal__action-link" href="' + fileUrl + '" target="_blank" rel="noopener noreferrer">' + app.escapeHtml(wpfLibraryData.strings.viewMediaFileLabel || 'View media file') + '</a>' +
						'<span class="wpf-file-modal__action-separator">|</span>' +
						'<a class="wpf-file-modal__action-link" href="' + attachmentPageUrl + '" target="_blank" rel="noopener noreferrer">' + app.escapeHtml(wpfLibraryData.strings.editMoreDetailsLabel || 'Edit more details') + '</a>' +
						'<span class="wpf-file-modal__action-separator">|</span>' +
						'<a class="wpf-file-modal__action-link" href="' + fileUrl + '" download="' + filename + '">' + app.escapeHtml(wpfLibraryData.strings.downloadFileLabel || 'Download file') + '</a>' +
						'<span class="wpf-file-modal__action-separator">|</span>' +
						'<button type="button" class="wpf-file-modal__action-link wpf-file-modal__action-link--danger wpf-file-modal__delete-file" data-attachment-id="' + Number(item.id) + '">' + deleteLabel + '</button>' +
					'</section>' +
				'</div>' +
			'</div>'
		);

		$modal.prop('hidden', false);
		$('body').addClass('wpf-modal-open');
		app.updateModalNavigation();
		window.requestAnimationFrame(function () {
			$modal.addClass('is-visible');
		});
	};

	app.getFolderOptions = function (tree, depth, options) {
		options = options || [];
		depth = depth || 0;

		(tree || []).forEach(function (node) {
			options.push({
				id: Number(node.id),
				label: new Array(depth + 1).join('\u2014 ') + node.name
			});

			if (node.children && node.children.length) {
				app.getFolderOptions(node.children, depth + 1, options);
			}
		});

		return options;
	};

	app.findFolderName = function (folderId, tree) {
		var result = '';

		(tree || []).some(function (node) {
			if (Number(node.id) === Number(folderId)) {
				result = node.name;
				return true;
			}

			if (node.children && node.children.length) {
				result = app.findFolderName(folderId, node.children);
				return !!result;
			}

			return false;
		});

		return result;
	};

	app.updateCurrentFolderLabel = function () {
		var label = state().currentFolder === null
			? wpfLibraryData.strings.allMedia
			: Number(state().currentFolder) === 0
				? wpfLibraryData.strings.unassigned
				: app.findFolderName(state().currentFolder, state().folderTree) || wpfLibraryData.strings.currentFolder;

		$('.wpf-current-folder-name').text(label);
	};

	app.updateSelectedCount = function () {
		$('.wpf-selected-count strong').text(state().selectedIds.length);
		$('.wpf-delete-selected').prop('hidden', !state().isSelectionMode).prop('disabled', !state().selectedIds.length);
		$('.wpf-move-selected').prop('disabled', !state().selectedIds.length);
		$('.wpf-list-bulk-apply').prop('disabled', !state().selectedIds.length || $('.wpf-list-bulk-action').val() !== 'delete');
		$('.wpf-library-list-actions').prop('hidden', state().currentViewMode !== 'list');
	};

	app.getCurrentViewRenderer = function () {
		if (!window.WPFLibraryViews) {
			return null;
		}

		return state().currentViewMode === 'list' ? window.WPFLibraryViews.list : window.WPFLibraryViews.grid;
	};

	app.updateViewModeUi = function () {
		$('.wpf-view-toggle-button')
			.removeClass('is-active')
			.attr('aria-pressed', 'false')
			.filter('[data-view-mode="' + state().currentViewMode + '"]')
			.addClass('is-active')
			.attr('aria-pressed', 'true');

		$('.wpf-library-page').toggleClass('is-list-view', state().currentViewMode === 'list');
		$('.wpf-library-page').toggleClass('is-grid-view', state().currentViewMode !== 'list');
		$('.wpf-library-list-actions').prop('hidden', state().currentViewMode !== 'list');
		$('.wpf-load-more').prop('hidden', state().currentViewMode === 'list' || !state().attachmentState.hasMore);
	};

	app.setViewMode = function (mode) {
		state().currentViewMode = mode === 'list' ? 'list' : 'grid';

		if (window.localStorage) {
			window.localStorage.setItem('wpfLibraryViewMode', state().currentViewMode);
		}

		app.clearSelection();
		app.resetAttachmentState();
		app.updateViewModeUi();
		app.fetchAttachments();
	};

	app.setSelectionMode = function (isEnabled) {
		state().isSelectionMode = !!isEnabled;

		if (!state().isSelectionMode) {
			app.clearSelection();
		}

		$('.wpf-select-multiple-toggle')
			.attr('aria-pressed', state().isSelectionMode ? 'true' : 'false')
			.text(state().isSelectionMode ? wpfLibraryData.strings.cancel : wpfLibraryData.strings.selectMultiple);

		$('.wpf-library-grid').toggleClass('is-selection-mode', state().isSelectionMode);
		app.updateSelectedCount();
		app.scheduleSortingHint();
	};

	app.toggleSelectionMode = function () {
		app.setSelectionMode(!state().isSelectionMode);
	};
}(jQuery, window));
