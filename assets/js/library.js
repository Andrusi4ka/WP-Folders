(function ($) {
	'use strict';

	if (typeof wpfLibraryData === 'undefined') {
		return;
	}

	var currentFolder = wpfLibraryData.currentFolder;
	var folderTree = [];
	var folderSummary = {
		allMedia: 0,
		unassigned: 0
	};
	var currentMediaType = '';
	var currentMediaMonth = '';
	var currentSortBy = '';
	var currentSortOrder = '';
	var currentViewMode = window.localStorage && window.localStorage.getItem('wpfLibraryViewMode') === 'list' ? 'list' : 'grid';
	var currentAttachments = [];
	var selectedIds = [];
	var searchTimer = null;
	function normalizePerPage(value) {
		value = Number(value) || 20;

		if ([20, 50, 100].indexOf(value) === -1) {
			return 20;
		}

		return value;
	}

	var attachmentState = {
		page: 1,
		perPage: normalizePerPage(wpfLibraryData.defaultPerPage),
		total: 0,
		shown: 0,
		hasMore: false,
		totalPages: 0
	};
	var isUploadPanelOpen = false;
	var isSelectionMode = false;
	var lastSelectedId = null;
	var toastTimer = null;
	var isUploadingFiles = false;
	var uploadProgressItems = [];
	var uploadRequestCompleted = false;
	var currentModalAttachmentId = null;
	var draggedAttachmentId = null;
	var $dragPlaceholder = $();
	var sortingHintTimer = null;
	var sortingHintPosition = { x: 0, y: 0 };
	var isCursorInsideGrid = false;

	function ajax(action, data) {
		return $.post(wpfLibraryData.ajaxUrl, $.extend({
			action: action,
			nonce: wpfLibraryData.nonce
		}, data || {}));
	}

	function notify(message, type) {
		var cls = type === 'error' ? 'notice notice-error' : 'notice notice-success';
		var $notice = $('<div class="' + cls + ' is-dismissible"><p></p></div>');
		$notice.find('p').text(message);
		$('.wrap h1').first().after($notice);
		setTimeout(function () {
			$notice.fadeOut(200, function () {
				$notice.remove();
			});
		}, 3000);
	}

	function showToast(message, type) {
		var $toast = $('.wpf-copy-toast');

		if (!$toast.length) {
			$toast = $('<div class="wpf-copy-toast" hidden></div>');
			$('body').append($toast);
		}

		$toast
			.removeClass('is-error is-visible')
			.toggleClass('is-error', type === 'error')
			.text(message)
			.prop('hidden', false);

		window.clearTimeout(toastTimer);
		window.requestAnimationFrame(function () {
			$toast.addClass('is-visible');
		});

		toastTimer = window.setTimeout(function () {
			$toast.removeClass('is-visible');
			window.setTimeout(function () {
				$toast.prop('hidden', true);
			}, 180);
		}, 2200);
	}

	function fallbackCopyText(text) {
		var $input = $('<textarea class="wpf-copy-helper" readonly></textarea>');
		$input.val(text);
		$('body').append($input);
		$input.trigger('focus').trigger('select');

		var copied = false;
		try {
			copied = document.execCommand('copy');
		} catch (_error) {
			copied = false;
		}

		$input.remove();
		return copied;
	}

	function copyText(text) {
		if (navigator.clipboard && window.isSecureContext) {
			return navigator.clipboard.writeText(text);
		}

		return fallbackCopyText(text)
			? Promise.resolve()
			: Promise.reject(new Error('copy-failed'));
	}

	function formatBytes(bytes) {
		var value = Number(bytes) || 0;
		var units = ['B', 'KB', 'MB', 'GB', 'TB'];
		var unitIndex = 0;

		while (value >= 1024 && unitIndex < units.length - 1) {
			value = value / 1024;
			unitIndex += 1;
		}

		return (unitIndex === 0 ? Math.round(value) : value.toFixed(value >= 100 ? 0 : 1)) + ' ' + units[unitIndex];
	}

	function getUploadStatusText(loadedBytes, totalBytes) {
		return (wpfLibraryData.strings.uploadTransferStatus || 'Transferring %1$s of %2$s')
			.replace('%1$s', formatBytes(loadedBytes))
			.replace('%2$s', formatBytes(totalBytes));
	}

	function showUploadProcessingState() {
		var elements = getUploadProgressElements();
		elements.$title.text(wpfLibraryData.strings.filesTransferred || 'Files transferred.');
		elements.$status.text(wpfLibraryData.strings.serverProcessingUpload || 'Server is processing uploaded files...');
		elements.$percent.text('100%');
		elements.$bar.css('width', '100%');
	}

	function getUploadProgressElements() {
		return {
			$root: $('.wpf-upload-progress'),
			$title: $('.wpf-upload-progress__title'),
			$status: $('.wpf-upload-progress__status'),
			$percent: $('.wpf-upload-progress__percent'),
			$bar: $('.wpf-upload-progress__bar-fill'),
			$list: $('.wpf-upload-progress__list')
		};
	}

	function setUploadUiBusy(isBusy) {
		isUploadingFiles = !!isBusy;
		$('.wpf-upload-select, .wpf-upload-trigger, .wpf-upload-input, .wpf-upload-panel-close').prop('disabled', isUploadingFiles);
		$('.wpf-upload-dropzone').toggleClass('is-disabled', isUploadingFiles).attr('aria-disabled', isUploadingFiles ? 'true' : 'false');
	}

	function resetUploadProgress() {
		uploadRequestCompleted = false;
		uploadProgressItems = [];
		var elements = getUploadProgressElements();
		elements.$root.prop('hidden', true);
		elements.$title.text(wpfLibraryData.strings.transferringFiles || '');
		elements.$status.text(getUploadStatusText(0, 0));
		elements.$percent.text('0%');
		elements.$bar.css('width', '0%');
		elements.$list.empty();
		setUploadUiBusy(false);
	}

	function renderUploadProgressList() {
		var elements = getUploadProgressElements();
		var html = '';

		uploadProgressItems.forEach(function (item) {
			var percent = item.size > 0 ? Math.min(100, Math.round((item.loaded / item.size) * 100)) : 100;
			html += '' +
				'<div class="wpf-upload-progress__item">' +
					'<div class="wpf-upload-progress__item-head">' +
						'<span class="wpf-upload-progress__item-name">' + escapeHtml(item.name || '') + '</span>' +
						'<span class="wpf-upload-progress__item-value">' + percent + '%</span>' +
					'</div>' +
					'<div class="wpf-upload-progress__item-bar" aria-hidden="true">' +
						'<span class="wpf-upload-progress__item-bar-fill" style="width:' + percent + '%"></span>' +
					'</div>' +
				'</div>';
		});

		elements.$list.html(html);
	}

	function initializeUploadProgress(files) {
		uploadProgressItems = Array.prototype.map.call(files, function (file) {
			return {
				name: file && file.name ? file.name : '',
				size: Math.max(0, Number(file && file.size ? file.size : 0)),
				loaded: 0
			};
		});

		renderUploadProgressList();
		updateUploadProgress(0);
		getUploadProgressElements().$root.prop('hidden', false);
		setUploadUiBusy(true);
	}

	function updateUploadProgress(loadedBytes) {
		var totalBytes = 0;
		var uploadedBytes = Math.max(0, Number(loadedBytes) || 0);
		var cumulative = 0;

		uploadProgressItems.forEach(function (item) {
			totalBytes += item.size;
		});

		uploadProgressItems.forEach(function (item) {
			var nextCumulative = cumulative + item.size;
			if (uploadedBytes >= nextCumulative) {
				item.loaded = item.size;
			} else if (uploadedBytes <= cumulative) {
				item.loaded = 0;
			} else {
				item.loaded = uploadedBytes - cumulative;
			}

			cumulative = nextCumulative;
		});

		var percent = totalBytes > 0 ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 100;
		var elements = getUploadProgressElements();
		elements.$title.text(wpfLibraryData.strings.transferringFiles || '');
		elements.$status.text(getUploadStatusText(uploadedBytes, totalBytes));
		elements.$percent.text(percent + '%');
		elements.$bar.css('width', percent + '%');

		renderUploadProgressList();

		if (percent >= 100 && !uploadRequestCompleted) {
			showUploadProcessingState();
		}
	}

	function completeUploadProgress() {
		var totalBytes = 0;

		uploadProgressItems.forEach(function (item) {
			totalBytes += item.size;
		});

		updateUploadProgress(totalBytes);
		setUploadUiBusy(false);
	}

	function failUploadProgress(message) {
		uploadRequestCompleted = true;
		var elements = getUploadProgressElements();
		elements.$title.text(message || wpfLibraryData.strings.uploadFailed || wpfLibraryData.strings.unexpected);
		setUploadUiBusy(false);
	}

	function finalizeSuccessfulUpload() {
		uploadRequestCompleted = true;
		completeUploadProgress();
		$('.wpf-upload-dropzone').removeClass('is-dragover');
		resetUploadProgress();
		setUploadPanelState(false);
	}

	function ensureDetailsModal() {
		var $modal = $('.wpf-file-modal');

		if ($modal.length) {
			return $modal;
		}

		$modal = $(
			'<div class="wpf-file-modal" hidden>' +
				'<div class="wpf-file-modal__backdrop"></div>' +
				'<div class="wpf-file-modal__dialog" role="dialog" aria-modal="true" aria-label="' + escapeHtml(wpfLibraryData.strings.fileDetails) + '">' +
					'<div class="wpf-file-modal__panel">' +
						'<div class="wpf-file-modal__header">' +
							'<h1 class="wpf-file-modal__heading">' + escapeHtml(wpfLibraryData.strings.attachmentDetails) + '</h1>' +
							'<div class="wpf-file-modal__header-actions">' +
								'<button type="button" class="wpf-file-modal__nav wpf-file-modal__nav--prev" aria-label="' + escapeHtml(wpfLibraryData.strings.previousLabel || 'Previous') + '">&#xf341;</button>' +
								'<button type="button" class="wpf-file-modal__nav wpf-file-modal__nav--next" aria-label="' + escapeHtml(wpfLibraryData.strings.nextLabel || 'Next') + '">&#xf345;</button>' +
								'<button type="button" class="wpf-file-modal__close" aria-label="' + escapeHtml(wpfLibraryData.strings.closeModal) + '">&#10005;</button>' +
							'</div>' +
						'</div>' +
						'<div class="wpf-file-modal__body"></div>' +
					'</div>' +
				'</div>' +
			'</div>'
		);

		$('body').append($modal);
		return $modal;
	}

	function getVisibleAttachmentItems() {
		return $('.wpf-media-card').map(function () {
			return $(this).data('attachment');
		}).get().filter(function (item) {
			return !!item && !!item.id;
		});
	}

	function getModalSiblingItem(direction) {
		var items = getVisibleAttachmentItems();
		var currentIndex = items.findIndex(function (item) {
			return Number(item.id) === Number(currentModalAttachmentId);
		});

		if (currentIndex === -1) {
			return null;
		}

		var nextIndex = currentIndex + direction;
		if (nextIndex < 0 || nextIndex >= items.length) {
			return null;
		}

		return items[nextIndex];
	}

	function updateModalNavigation() {
		var $modal = $('.wpf-file-modal');
		if (!$modal.length) {
			return;
		}

		$modal.find('.wpf-file-modal__nav--prev').prop('disabled', !getModalSiblingItem(-1));
		$modal.find('.wpf-file-modal__nav--next').prop('disabled', !getModalSiblingItem(1));
	}

	function closeDetailsModal() {
		var $modal = $('.wpf-file-modal');
		if (!$modal.length) {
			return;
		}

		currentModalAttachmentId = null;
		$modal.removeClass('is-visible').prop('hidden', true);
		$('body').removeClass('wpf-modal-open');
		scheduleSortingHint();
	}

	function ensureSortingHint() {
		var $hint = $('.wpf-sorting-hint');

		if ($hint.length) {
			return $hint;
		}

		$hint = $('<div class="wpf-sorting-hint" hidden><img alt=""></div>');
		$hint.find('img').attr('src', wpfLibraryData.sortingImage || '');
		$('body').append($hint);

		return $hint;
	}

	function hideSortingHint() {
		window.clearTimeout(sortingHintTimer);
		ensureSortingHint().prop('hidden', true).removeClass('is-visible');
	}

	function positionSortingHint() {
		ensureSortingHint().css({
			left: (sortingHintPosition.x + 18) + 'px',
			top: (sortingHintPosition.y - 70) + 'px'
		});
	}

	function canShowSortingHint() {
		return currentViewMode === 'grid' &&
			isCursorInsideGrid &&
			!isSelectionMode &&
			!draggedAttachmentId &&
			!$('.wpf-file-modal.is-visible').length &&
			$('.wpf-library-grid .wpf-media-card').length > 0;
	}

	function scheduleSortingHint() {
		window.clearTimeout(sortingHintTimer);

		if (!canShowSortingHint()) {
			hideSortingHint();
			return;
		}

		sortingHintTimer = window.setTimeout(function () {
			if (!canShowSortingHint()) {
				return;
			}

			positionSortingHint();
			ensureSortingHint().prop('hidden', false).addClass('is-visible');
		}, 5000);
	}

	function openDetailsModal(item) {
		var $modal = ensureDetailsModal();
		hideSortingHint();
		var imageSrc = item.previewUrl || item.thumb || '';
		var filename = escapeHtml(item.filename || '');
		var mimeType = escapeHtml(item.mimeType || '');
		var hasTransparencyGrid = mimeType === 'image/svg+xml' || mimeType === 'image/png';
		var imageClass = hasTransparencyGrid ? ' class="wpf-file-modal__image has-transparency-grid"' : ' class="wpf-file-modal__image"';
		var image = imageSrc ? '<img' + imageClass + ' src="' + escapeHtml(imageSrc) + '" alt="">' : '';
		var date = escapeHtml(item.date || '');
		var fileUrl = escapeHtml(item.url || '');
		var attachmentPageUrl = escapeHtml(item.attachmentPageUrl || '');
		var deleteLabel = escapeHtml(wpfLibraryData.strings.deletePermanently || 'Slett permanent');
		var uploadedByName = escapeHtml(item.uploadedBy || '');
		var uploadedByUrl = escapeHtml(item.uploadedByUrl || '');
		var uploadedBy = uploadedByUrl
			? '<a class="wpf-file-modal__meta-link" href="' + uploadedByUrl + '">' + uploadedByName + '</a>'
			: uploadedByName;
		var filesize = escapeHtml(item.filesize || '');
		var dimensions = escapeHtml(item.dimensions || '');
		var alt = escapeHtml(item.alt || '');
		var titleValue = escapeHtml(item.title || '');
		var caption = escapeHtml(item.caption || '');
		var description = escapeHtml(item.description || '');
		var requiredFieldsNote = escapeHtml(wpfLibraryData.strings.requiredFieldsNote || '').replace('*', '<span class="wpf-file-modal__required-asterisk">*</span>');
		currentModalAttachmentId = Number(item.id);

		$modal.find('.wpf-file-modal__body').html(
			'<div class="wpf-file-modal__layout">' +
				'<div class="wpf-file-modal__preview-column">' +
					'<div class="wpf-file-modal__preview">' + image + '</div>' +
					'<button type="button" class="button wpf-file-modal__edit-image">' + escapeHtml(wpfLibraryData.strings.editImage) + '</button>' +
				'</div>' +
				'<div class="wpf-file-modal__content">' +
					'<section class="wpf-file-modal__section wpf-file-modal__section--meta">' +
						'<dl class="wpf-file-modal__meta">' +
							'<div><dt>' + escapeHtml(wpfLibraryData.strings.uploadDateLabel || 'Upload date') + '</dt><dd>' + date + '</dd></div>' +
							'<div><dt>' + escapeHtml(wpfLibraryData.strings.uploadedByLabel || 'Uploaded by') + '</dt><dd>' + uploadedBy + '</dd></div>' +
							'<div><dt>' + escapeHtml(wpfLibraryData.strings.filenameLabel || 'Filename') + '</dt><dd>' + filename + '</dd></div>' +
							'<div><dt>' + escapeHtml(wpfLibraryData.strings.fileTypeLabel || 'File type') + '</dt><dd>' + mimeType + '</dd></div>' +
							'<div><dt>' + escapeHtml(wpfLibraryData.strings.fileSizeLabel || 'File size') + '</dt><dd>' + filesize + '</dd></div>' +
							'<div><dt>' + escapeHtml(wpfLibraryData.strings.dimensionsLabel || 'Dimensions') + '</dt><dd>' + dimensions + '</dd></div>' +
						'</dl>' +
					'</section>' +
					'<section class="wpf-file-modal__section wpf-file-modal__section--middle">' +
						'<div class="wpf-file-modal__form-row">' +
							'<label class="wpf-file-modal__form-label" for="wpf-attachment-alt">' + escapeHtml(wpfLibraryData.strings.altTextLabel) + '</label>' +
							'<div class="wpf-file-modal__form-control">' +
								'<textarea id="wpf-attachment-alt" class="wpf-file-modal__field" data-field-name="alt" rows="3">' + alt + '</textarea>' +
								'<p class="wpf-file-modal__field-help"><a href="https://www.w3.org/WAI/tutorials/images/decision-tree/" target="_blank" rel="noopener noreferrer">' + escapeHtml(wpfLibraryData.strings.altTextHelpLink) + '</a> ' + escapeHtml(wpfLibraryData.strings.altTextHelpNote) + '</p>' +
							'</div>' +
						'</div>' +
						'<div class="wpf-file-modal__form-row">' +
							'<label class="wpf-file-modal__form-label" for="wpf-attachment-title">' + escapeHtml(wpfLibraryData.strings.titleFieldLabel) + '</label>' +
							'<div class="wpf-file-modal__form-control">' +
								'<input id="wpf-attachment-title" class="wpf-file-modal__field" data-field-name="title" type="text" value="' + titleValue + '">' +
							'</div>' +
						'</div>' +
						'<div class="wpf-file-modal__form-row">' +
							'<label class="wpf-file-modal__form-label" for="wpf-attachment-caption">' + escapeHtml(wpfLibraryData.strings.captionLabel) + '</label>' +
							'<div class="wpf-file-modal__form-control">' +
								'<textarea id="wpf-attachment-caption" class="wpf-file-modal__field" data-field-name="caption" rows="4">' + caption + '</textarea>' +
							'</div>' +
						'</div>' +
						'<div class="wpf-file-modal__form-row">' +
							'<label class="wpf-file-modal__form-label" for="wpf-attachment-description">' + escapeHtml(wpfLibraryData.strings.descriptionFieldLabel) + '</label>' +
							'<div class="wpf-file-modal__form-control">' +
								'<textarea id="wpf-attachment-description" class="wpf-file-modal__field" data-field-name="description" rows="4">' + description + '</textarea>' +
							'</div>' +
						'</div>' +
						'<div class="wpf-file-modal__form-row">' +
							'<label class="wpf-file-modal__form-label" for="wpf-attachment-url">' + escapeHtml(wpfLibraryData.strings.urlLabel) + '</label>' +
							'<div class="wpf-file-modal__form-control">' +
								'<input id="wpf-attachment-url" class="wpf-file-modal__field" type="text" value="' + fileUrl + '" readonly>' +
								'<button type="button" class="button wpf-file-modal__copy-url-button" data-url="' + fileUrl + '">' + escapeHtml(wpfLibraryData.strings.copyUrlButton) + '</button>' +
							'</div>' +
						'</div>' +
						'<p class="wpf-file-modal__required-note">' + requiredFieldsNote + '</p>' +
					'</section>' +
					'<section class="wpf-file-modal__section wpf-file-modal__section--bottom">' +
						'<a class="wpf-file-modal__action-link" href="' + fileUrl + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(wpfLibraryData.strings.viewMediaFileLabel || 'View media file') + '</a>' +
						'<span class="wpf-file-modal__action-separator">|</span>' +
						'<a class="wpf-file-modal__action-link" href="' + attachmentPageUrl + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(wpfLibraryData.strings.editMoreDetailsLabel || 'Edit more details') + '</a>' +
						'<span class="wpf-file-modal__action-separator">|</span>' +
						'<a class="wpf-file-modal__action-link" href="' + fileUrl + '" download="' + filename + '">' + escapeHtml(wpfLibraryData.strings.downloadFileLabel || 'Download file') + '</a>' +
						'<span class="wpf-file-modal__action-separator">|</span>' +
						'<button type="button" class="wpf-file-modal__action-link wpf-file-modal__action-link--danger wpf-file-modal__delete-file" data-attachment-id="' + Number(item.id) + '">' + deleteLabel + '</button>' +
					'</section>' +
				'</div>' +
			'</div>'
		);

		$modal.prop('hidden', false);
		$('body').addClass('wpf-modal-open');
		updateModalNavigation();
		window.requestAnimationFrame(function () {
			$modal.addClass('is-visible');
		});
	}

	function promptName(defaultValue) {
		var name = window.prompt(wpfLibraryData.strings.folderName, defaultValue || '');
		if (name === null) {
			return null;
		}

		name = name.trim();
		if (!name) {
			notify(wpfLibraryData.strings.emptyName, 'error');
			return null;
		}

		return name;
	}

	function getFolderOptions(tree, depth, options) {
		options = options || [];
		depth = depth || 0;

		(tree || []).forEach(function (node) {
			options.push({
				id: Number(node.id),
				label: new Array(depth + 1).join('\u2014 ') + node.name
			});

			if (node.children && node.children.length) {
				getFolderOptions(node.children, depth + 1, options);
			}
		});

		return options;
	}

	function findFolderName(folderId, tree) {
		var found = null;
		(tree || []).some(function walk(node) {
			if (Number(node.id) === Number(folderId)) {
				found = node.name;
				return true;
			}

			return (node.children || []).some(walk);
		});

		return found;
	}

	function updateCurrentFolderLabel() {
		var name = currentFolder === null || typeof currentFolder === 'undefined'
			? wpfLibraryData.strings.allMedia
			: Number(currentFolder) === 0
				? wpfLibraryData.strings.unassigned
				: findFolderName(currentFolder, folderTree) || wpfLibraryData.strings.currentFolder;

		$('.wpf-current-folder-name').text(name);
	}

	function updateSelectedCount() {
		$('.wpf-selected-count strong').text(selectedIds.length);
		$('.wpf-move-selected').prop('disabled', selectedIds.length === 0);
		$('.wpf-delete-selected').prop('disabled', selectedIds.length === 0);
		$('.wpf-list-bulk-apply').prop('disabled', selectedIds.length === 0 || !$('.wpf-list-bulk-action').val());
		$('.wpf-media-row-checkbox').each(function () {
			var id = Number($(this).val());
			$(this).prop('checked', selectedIds.indexOf(id) !== -1);
		});
		$('.wpf-media-card').each(function () {
			var id = Number($(this).attr('data-id'));
			$(this).toggleClass('is-selected', selectedIds.indexOf(id) !== -1);
		});
		$('.wpf-media-list-select-all').prop('checked', currentAttachments.length > 0 && currentAttachments.every(function (item) {
			return selectedIds.indexOf(Number(item.id)) !== -1;
		}));
	}

	function getCurrentViewRenderer() {
		if (!window.WPFLibraryViews || !window.WPFLibraryViews[currentViewMode]) {
			return null;
		}

		return window.WPFLibraryViews[currentViewMode];
	}

	function updateViewModeUi() {
		$('.wpf-library-page')
			.toggleClass('is-grid-view', currentViewMode === 'grid')
			.toggleClass('is-list-view', currentViewMode === 'list');

		$('.wpf-view-toggle-button').each(function () {
			var isActive = $(this).attr('data-view-mode') === currentViewMode;
			$(this)
				.toggleClass('is-active', isActive)
				.attr('aria-pressed', isActive ? 'true' : 'false');
		});

		$('.wpf-select-multiple-toggle').prop('hidden', currentViewMode === 'list');
		$('.wpf-delete-selected').prop('hidden', currentViewMode === 'list');
		$('.wpf-library-list-actions').prop('hidden', currentViewMode !== 'list');
		$('.wpf-move-selected').prop('disabled', selectedIds.length === 0);
	}

	function setViewMode(mode) {
		mode = mode === 'list' ? 'list' : 'grid';

		if (mode === currentViewMode) {
			return;
		}

		currentViewMode = mode;
		if (window.localStorage) {
			window.localStorage.setItem('wpfLibraryViewMode', currentViewMode);
		}

		window.location.reload();
	}

	function setSelectionMode(isEnabled) {
		if (currentViewMode === 'list') {
			isSelectionMode = false;
			updateViewModeUi();
			updateSelectedCount();
			return;
		}

		isSelectionMode = !!isEnabled;
		$('.wpf-library-page').toggleClass('is-selection-mode', isSelectionMode);
		$('.wpf-select-multiple-toggle')
			.toggleClass('is-active', isSelectionMode)
			.attr('aria-pressed', isSelectionMode ? 'true' : 'false')
			.text(isSelectionMode ? wpfLibraryData.strings.cancel : wpfLibraryData.strings.selectMultiple);

		if (!isSelectionMode) {
			clearSelection();
		}

		$('.wpf-media-card').attr('draggable', isSelectionMode ? 'false' : 'true');
		if (isSelectionMode) {
			hideSortingHint();
			return;
		}

		updateSelectedCount();
		scheduleSortingHint();
	}

	function toggleSelectionMode() {
		setSelectionMode(!isSelectionMode);
	}

	function getFolderIcon(isOpen) {
		return isOpen ? wpfLibraryData.icons.folderOpen : wpfLibraryData.icons.folderClose;
	}

	function renderTargetFolderSelect() {
		var options = getFolderOptions(folderTree);
		var html = '<option value="">' + wpfLibraryData.strings.moveToFolder + '</option>' +
			'<option value="0">' + wpfLibraryData.strings.unassigned + '</option>';

		options.forEach(function (option) {
			html += '<option value="' + option.id + '">' + option.label + '</option>';
		});

		$('.wpf-target-folder-select').html(html);
	}

	function renderTree(tree, summary) {
		folderTree = tree || [];
		folderSummary = $.extend({
			allMedia: 0,
			unassigned: 0,
			totalSize: '0 B'
		}, summary || {});
		var $target = $('.wpf-folder-tree');
		$target.empty();

		$('.wpf-library-size-value').text(folderSummary.totalSize || '0 B');

		var rootItems = [
			{ id: null, name: wpfLibraryData.strings.allMedia, count: folderSummary.allMedia },
			{ id: 0, name: wpfLibraryData.strings.unassigned, count: folderSummary.unassigned }
		];

		rootItems.forEach(function (item) {
			var $li = $('<li class="wpf-folder-item"></li>');
			var $link = $('<button type="button" class="button-link wpf-folder-link"></button>');
			var isCurrent = String(item.id) === String(currentFolder) || (item.id === null && (currentFolder === null || typeof currentFolder === 'undefined'));
			$link.attr('data-folder-id', item.id === null ? '' : item.id);
			$link.toggleClass('is-current', isCurrent);
			$link.append('<img class="wpf-folder-icon" src="' + getFolderIcon(isCurrent) + '" alt="">');
			$link.append('<span class="wpf-folder-label">' + escapeHtml(item.name + ' (' + item.count + ')') + '</span>');
			$li.append($('<div class="wpf-folder-row"></div>').append($link));
			$target.append($li);
		});

		if (!tree.length) {
			$target.append('<li class="wpf-empty">' + wpfLibraryData.strings.noFolders + '</li>');
			renderTargetFolderSelect();
			updateCurrentFolderLabel();
			return;
		}

		tree.forEach(function appendNode(node) {
			$target.append(renderNode(node));
		});

		renderTargetFolderSelect();
		updateCurrentFolderLabel();
	}

	function renderNode(node) {
		var isCurrent = Number(currentFolder) === Number(node.id);
		var $item = $('<li class="wpf-folder-item"></li>');
		var $row = $('<div class="wpf-folder-row"></div>');
		var $link = $('<button type="button" class="button-link wpf-folder-link"></button>');
		var $actions = $('<div class="wpf-folder-actions"></div>');

		$link.attr('data-folder-id', node.id);
		$link.toggleClass('is-current', isCurrent);
		$link.append('<img class="wpf-folder-icon" src="' + getFolderIcon(isCurrent) + '" alt="">');
		$link.append('<span class="wpf-folder-label">' + escapeHtml(node.name + ' (' + node.count + ')') + '</span>');

		$actions
			.append(
				$('<button type="button" class="button-link wpf-subfolder"></button>')
					.attr('data-term-id', node.id)
					.attr('title', wpfLibraryData.strings.createSubfolder)
					.attr('aria-label', wpfLibraryData.strings.createSubfolder)
					.html('<img class="wpf-action-icon" src="' + wpfLibraryData.icons.folderNew + '" alt="">')
			)
			.append(
				$('<button type="button" class="button-link wpf-rename"></button>')
					.attr('data-term-id', node.id)
					.attr('data-name', node.name)
					.attr('title', wpfLibraryData.strings.rename)
					.attr('aria-label', wpfLibraryData.strings.rename)
					.html('<img class="wpf-action-icon" src="' + wpfLibraryData.icons.pen + '" alt="">')
			)
			.append(
				$('<button type="button" class="button-link wpf-delete"></button>')
					.attr('data-term-id', node.id)
					.attr('title', wpfLibraryData.strings.delete)
					.attr('aria-label', wpfLibraryData.strings.delete)
					.html('<img class="wpf-action-icon" src="' + wpfLibraryData.icons.delete + '" alt="">')
			);

		$row.append($link).append($actions);
		$item.append($row);

		if (node.children && node.children.length) {
			var $children = $('<ul class="wpf-folder-children"></ul>');
			node.children.forEach(function (child) {
				$children.append(renderNode(child));
			});
			$item.append($children);
		}

		return $item;
	}

	function renderAttachments(items) {
		var $grid = $('.wpf-library-grid');
		var renderer = getCurrentViewRenderer();
		$('.wpf-library-loading').prop('hidden', true).empty();
		$('.wpf-library-empty').prop('hidden', true);
		hideSortingHint();
		$grid.empty();

		if (!items.length) {
			$('.wpf-library-empty').prop('hidden', false);
			updateResultsUi();
			updateViewModeUi();
			return;
		}

		if (renderer && typeof renderer.render === 'function') {
			renderer.render($grid, items, {
				selectedIds: selectedIds.slice(),
				draggable: currentViewMode === 'grid' && !isSelectionMode,
				strings: wpfLibraryData.strings,
				sortBy: currentSortBy,
				sortOrder: currentSortOrder
			});
		}

		updateViewModeUi();
		updateResultsUi();
		updateSelectedCount();
		scheduleSortingHint();
	}

	function clearDragState() {
		draggedAttachmentId = null;
		$('.wpf-media-card').removeClass('is-dragging is-drop-target');
		if ($dragPlaceholder.length) {
			$dragPlaceholder.remove();
			$dragPlaceholder = $();
		}
		scheduleSortingHint();
	}

	function ensureDragPlaceholder($source) {
		if ($dragPlaceholder.length) {
			return $dragPlaceholder;
		}

		$dragPlaceholder = $('<div class="wpf-media-card wpf-media-card--placeholder" aria-hidden="true"></div>');
		if ($source && $source.length) {
			$dragPlaceholder.css('height', $source.outerHeight() + 'px');
		}

		return $dragPlaceholder;
	}

	function renderLoadingState() {
		$('.wpf-library-empty').prop('hidden', true);
		hideSortingHint();
		clearDragState();
		$('.wpf-library-loading')
			.prop('hidden', false)
			.html('<div class="wpf-loading-state"><img src="' + escapeHtml(wpfLibraryData.loadingImage) + '" alt="' + escapeHtml(wpfLibraryData.strings.loadingMedia) + '"></div>');
	}

	function getMediaTypeOptions() {
		return [
			{ value: '', label: wpfLibraryData.strings.allMediaFiles },
			{ value: 'image', label: wpfLibraryData.strings.imagesFilter },
			{ value: 'audio', label: wpfLibraryData.strings.audioFilter },
			{ value: 'video', label: wpfLibraryData.strings.videoFilter },
			{ value: 'document', label: wpfLibraryData.strings.documentsFilter },
			{ value: 'spreadsheet', label: wpfLibraryData.strings.spreadsheetsFilter },
			{ value: 'archive', label: wpfLibraryData.strings.archivesFilter },
			{ value: 'unattached', label: wpfLibraryData.strings.unattachedFilter },
			{ value: 'mine', label: wpfLibraryData.strings.mineFilter }
		];
	}

	function renderMediaTypeFilter() {
		var html = '';
		getMediaTypeOptions().forEach(function (option) {
			var selected = option.value === currentMediaType ? ' selected' : '';
			html += '<option value="' + escapeHtml(option.value) + '"' + selected + '>' + escapeHtml(option.label) + '</option>';
		});
		$('.wpf-media-type-filter').html(html);
	}

	function renderMediaDateFilter(months) {
		var html = '<option value="">' + escapeHtml(wpfLibraryData.strings.allDates) + '</option>';

		(months || []).forEach(function (option) {
			var selected = option.value === currentMediaMonth ? ' selected' : '';
			html += '<option value="' + escapeHtml(option.value) + '"' + selected + '>' + escapeHtml(option.label) + '</option>';
		});

		$('.wpf-media-date-filter').html(html);
	}

	function updateResultsUi() {
		var text = wpfLibraryData.strings.showingMediaItems
			.replace('%1$s', String(attachmentState.shown))
			.replace('%2$s', String(attachmentState.total));

		$('.wpf-library-results').text(text);
		$('.wpf-load-more')
			.text(wpfLibraryData.strings.loadMore)
			.prop('hidden', currentViewMode === 'list' || !attachmentState.hasMore);
		renderListPagination();
	}

	function renderListPagination() {
		var $target = $('.wpf-library-list-actions__pagination');
		if (!$target.length) {
			return;
		}

		if (currentViewMode !== 'list') {
			$target.empty();
			return;
		}

		var isFirstPage = attachmentState.page <= 1;
		var isLastPage = attachmentState.page >= attachmentState.totalPages;
		var totalPages = Math.max(1, attachmentState.totalPages || 1);
		var html = '' +
			'<span class="wpf-list-pagination__count">' + escapeHtml(String(attachmentState.total) + ' ' + wpfLibraryData.strings.itemsLabel) + '</span>' +
			'<div class="wpf-list-pagination__controls">' +
				'<button type="button" class="button wpf-list-pagination__button" data-page-target="1"' + (isFirstPage ? ' disabled' : '') + '>&laquo;</button>' +
				'<button type="button" class="button wpf-list-pagination__button" data-page-target="' + String(Math.max(1, attachmentState.page - 1)) + '"' + (isFirstPage ? ' disabled' : '') + '>&lsaquo;</button>' +
				'<input type="number" class="wpf-list-pagination__input" min="1" max="' + String(totalPages) + '" value="' + String(attachmentState.page) + '">' +
				'<span class="wpf-list-pagination__total">' + escapeHtml(wpfLibraryData.strings.ofLabel + ' ' + totalPages) + '</span>' +
				'<button type="button" class="button wpf-list-pagination__button" data-page-target="' + String(Math.min(totalPages, attachmentState.page + 1)) + '"' + (isLastPage ? ' disabled' : '') + '>&rsaquo;</button>' +
				'<button type="button" class="button wpf-list-pagination__button" data-page-target="' + String(totalPages) + '"' + (isLastPage ? ' disabled' : '') + '>&raquo;</button>' +
			'</div>';

		$target.html(html);
	}

	function clampPageNumber(page) {
		page = Number(page) || 1;
		return Math.max(1, Math.min(attachmentState.totalPages || 1, page));
	}

	function goToPage(page) {
		page = clampPageNumber(page);

		if (page === attachmentState.page) {
			renderListPagination();
			return;
		}

		clearSelection();
		fetchAttachments({ page: page });
	}

	function escapeHtml(value) {
		return $('<div>').text(value || '').html();
	}

	function fetchFolders(callback) {
		ajax('wpf_get_folders').done(function (response) {
			if (response && response.success) {
				renderTree(response.data.folders || [], response.data.summary || {});
				if (callback) {
					callback();
				}
				return;
			}

			notify(wpfLibraryData.strings.unexpected, 'error');
		}).fail(function (xhr) {
			notify(readError(xhr), 'error');
		});
	}

	function fetchAttachments(options) {
		options = options || {};
		var append = !!options.append;
		var page = options.page ? clampPageNumber(options.page) : (append ? attachmentState.page + 1 : 1);

		if (!append) {
			$('.wpf-library-grid').empty();
			renderLoadingState();
		}

		ajax('wpf_get_attachments', {
			folderId: currentFolder,
			search: $('.wpf-media-search').val(),
			mediaType: currentMediaType,
			mediaMonth: currentMediaMonth,
			sortBy: currentViewMode === 'list' ? currentSortBy : '',
			sortOrder: currentViewMode === 'list' ? currentSortOrder : '',
			page: page,
			perPage: attachmentState.perPage
		}).done(function (response) {
			if (response && response.success) {
				var items = response.data.attachments || [];
				attachmentState.page = response.data.page || page;
				attachmentState.perPage = normalizePerPage(response.data.perPage || attachmentState.perPage);
				attachmentState.total = response.data.total || 0;
				attachmentState.shown = response.data.shown || 0;
				attachmentState.totalPages = response.data.totalPages || 0;
				attachmentState.hasMore = !!response.data.hasMore;
				currentAttachments = append ? currentAttachments.concat(items) : items.slice();
				renderMediaTypeFilter();
				renderMediaDateFilter(response.data.filters && response.data.filters.months ? response.data.filters.months : []);
				renderAttachments(currentAttachments);
				return;
			}

			notify(wpfLibraryData.strings.unexpected, 'error');
		}).fail(function (xhr) {
			notify(readError(xhr), 'error');
		});
	}

	function readError(xhr) {
		return xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message
			? xhr.responseJSON.data.message
			: wpfLibraryData.strings.unexpected;
	}

	function getDefaultSortOrder(sortBy) {
		return sortBy === 'date' || sortBy === 'comments' ? 'DESC' : 'ASC';
	}

	function toggleSelection(id) {
		id = Number(id);
		var index = selectedIds.indexOf(id);

		if (index === -1) {
			selectedIds.push(id);
		} else {
			selectedIds.splice(index, 1);
		}

		updateSelectedCount();
		$('.wpf-media-card[data-id="' + id + '"]').toggleClass('is-selected', index === -1);
		lastSelectedId = id;
	}

	function selectRange(targetId) {
		targetId = Number(targetId);

		if (!lastSelectedId) {
			toggleSelection(targetId);
			return;
		}

		var cardIds = $('.wpf-media-card').map(function () {
			return Number($(this).attr('data-id'));
		}).get();
		var startIndex = cardIds.indexOf(Number(lastSelectedId));
		var endIndex = cardIds.indexOf(targetId);

		if (startIndex === -1 || endIndex === -1) {
			toggleSelection(targetId);
			return;
		}

		var from = Math.min(startIndex, endIndex);
		var to = Math.max(startIndex, endIndex);

		for (var i = from; i <= to; i += 1) {
			if (selectedIds.indexOf(cardIds[i]) === -1) {
				selectedIds.push(cardIds[i]);
			}
		}

		updateSelectedCount();
		$('.wpf-media-card').removeClass('is-selected');
		selectedIds.forEach(function (id) {
			$('.wpf-media-card[data-id="' + id + '"]').addClass('is-selected');
		});
		lastSelectedId = targetId;
	}

	function clearSelection() {
		selectedIds = [];
		lastSelectedId = null;
		updateSelectedCount();
		$('.wpf-media-card').removeClass('is-selected');
	}

	function getCurrentCardOrder() {
		return $('.wpf-library-grid .wpf-media-card').map(function () {
			return Number($(this).attr('data-id'));
		}).get().filter(function (id) {
			return id > 0;
		});
	}

	function saveAttachmentOrder() {
		var orderedIds = getCurrentCardOrder();
		if (orderedIds.length < 2) {
			return;
		}

		ajax('wpf_update_attachment_order', {
			orderedIds: orderedIds
		}).fail(function (xhr) {
			notify(readError(xhr), 'error');
			fetchAttachments();
		});
	}

	function moveCardBefore($dragged, $target) {
		if (!$dragged.length || !$target.length || $dragged[0] === $target[0]) {
			return;
		}

		$dragged.insertBefore($target);
		saveAttachmentOrder();
	}

	function placeDragPlaceholder($target, insertBefore) {
		var $placeholder = ensureDragPlaceholder($('.wpf-media-card[data-id="' + draggedAttachmentId + '"]'));
		if (!$target.length || !$placeholder.length) {
			return;
		}

		if (insertBefore) {
			$placeholder.insertBefore($target);
		} else {
			$placeholder.insertAfter($target);
		}
	}

	function updateModalAttachmentData(details) {
		if (!currentModalAttachmentId || !details) {
			return;
		}

		var $card = $('.wpf-media-card[data-id="' + currentModalAttachmentId + '"]');
		var item = $card.data('attachment');
		if (!item) {
			return;
		}

		item.title = details.title || '';
		item.alt = details.alt || '';
		item.caption = details.caption || '';
		item.description = details.description || '';
		$card.data('attachment', item);
	}

	function saveAttachmentField($field) {
		var attachmentId = currentModalAttachmentId;
		var fieldName = $field.attr('data-field-name');
		var fieldValue = $field.val();
		var previousValue = $field.attr('data-last-value');

		if (!attachmentId || !fieldName || previousValue === String(fieldValue)) {
			return;
		}

		$field.attr('data-last-value', String(fieldValue));

		ajax('wpf_update_attachment_details', {
			attachmentId: attachmentId,
			fields: {
				[fieldName]: fieldValue
			}
		}).done(function (response) {
			if (response && response.success && response.data && response.data.details) {
				updateModalAttachmentData(response.data.details);
				return;
			}

			notify(wpfLibraryData.strings.unexpected, 'error');
		}).fail(function (xhr) {
			$field.attr('data-last-value', previousValue || '');
			notify(readError(xhr), 'error');
		});
	}

	function handleCardSelection(targetId, event) {
		if (event.shiftKey) {
			selectRange(targetId);
			return;
		}

		if (event.ctrlKey || event.metaKey) {
			toggleSelection(targetId);
			return;
		}

		toggleSelection(targetId);
	}

	function resetAttachmentState() {
		attachmentState.page = 1;
		attachmentState.total = 0;
		attachmentState.shown = 0;
		attachmentState.hasMore = false;
		attachmentState.totalPages = 0;
	}

	function setUploadPanelState(isOpen) {
		if (!isOpen && isUploadingFiles) {
			return;
		}

		isUploadPanelOpen = !!isOpen;
		$('.wpf-upload-panel').prop('hidden', !isUploadPanelOpen);
		$('.wpf-upload-trigger').attr('aria-expanded', isUploadPanelOpen ? 'true' : 'false');

		if (!isUploadPanelOpen) {
			$('.wpf-upload-dropzone').removeClass('is-dragover');
			resetUploadProgress();
		}
	}

	function toggleUploadPanel() {
		setUploadPanelState(!isUploadPanelOpen);
	}

	function moveSelected() {
		var targetFolder = $('.wpf-target-folder-select').val();

		if (targetFolder === '') {
			notify(wpfLibraryData.strings.chooseTargetFolder, 'error');
			return;
		}

		if (!selectedIds.length) {
			notify(wpfLibraryData.strings.selectFiles, 'error');
			return;
		}

		ajax('wpf_assign_folder', {
			folderId: Number(targetFolder),
			attachmentIds: selectedIds
		}).done(function (response) {
			if (response && response.success) {
				setSelectionMode(false);
				$('.wpf-target-folder-select').val('');
				fetchFolders(fetchAttachments);
				notify(response.data.message || wpfLibraryData.strings.attachmentsMoved, 'success');
				return;
			}

			notify(wpfLibraryData.strings.unexpected, 'error');
		}).fail(function (xhr) {
			notify(readError(xhr), 'error');
		});
	}

	function uploadFiles(files) {
		if (!files || !files.length || isUploadingFiles) {
			return;
		}

		initializeUploadProgress(files);
		uploadRequestCompleted = false;

		var formData = new window.FormData();
		formData.append('action', 'wpf_upload_files');
		formData.append('nonce', wpfLibraryData.nonce);
		formData.append('folderId', currentFolder === null || typeof currentFolder === 'undefined' ? '' : currentFolder);

		Array.prototype.forEach.call(files, function (file) {
			formData.append('files[]', file);
		});

		$.ajax({
			url: wpfLibraryData.ajaxUrl,
			type: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			xhr: function () {
				var xhr = $.ajaxSettings.xhr();

				if (xhr.upload) {
					xhr.upload.addEventListener('progress', function (event) {
						if (!event.lengthComputable) {
							return;
						}

						updateUploadProgress(event.loaded);
					});
				}

				return xhr;
			}
		}).done(function (response) {
			if (response && response.success) {
				finalizeSuccessfulUpload();
				notify(response.data.message || wpfLibraryData.strings.uploadCompleted, 'success');
				window.setTimeout(function () {
					window.location.reload();
				}, 300);
				return;
			}

			failUploadProgress(wpfLibraryData.strings.unexpected);
			notify(wpfLibraryData.strings.unexpected, 'error');
		}).fail(function (xhr) {
			failUploadProgress(readError(xhr));
			notify(readError(xhr), 'error');
		});
	}

	function deleteSelected() {
		if (!selectedIds.length) {
			return;
		}

		if (!window.confirm(wpfLibraryData.strings.confirmPermanentDelete)) {
			return;
		}

		ajax('wpf_delete_attachments', {
			attachmentIds: selectedIds
		}).done(function (response) {
			if (response && response.success) {
				setSelectionMode(false);
				fetchFolders(fetchAttachments);
				notify(response.data.message || wpfLibraryData.strings.attachmentsDeleted, 'success');
				return;
			}

			notify(wpfLibraryData.strings.unexpected, 'error');
		}).fail(function (xhr) {
			notify(readError(xhr), 'error');
		});
	}

	function bindEvents() {
		$(document).on('click', '.wpf-folder-link', function () {
			var value = $(this).attr('data-folder-id');
			currentFolder = value === '' ? null : Number(value);
			clearSelection();
			resetAttachmentState();
			fetchFolders(fetchAttachments);
		});

		$(document).on('click', '.wpf-media-card', function (event) {
			if (currentViewMode === 'list') {
				return;
			}

			if (!isSelectionMode) {
				var editUrl = $(this).attr('data-edit-url');
				if (editUrl) {
					window.location.href = editUrl;
				}
				return;
			}

			var targetId = $(this).attr('data-id');

			handleCardSelection(targetId, event);
		});

		$(document).on('dragstart', '.wpf-media-card', function (event) {
			if (currentViewMode !== 'grid' || isSelectionMode) {
				event.preventDefault();
				return;
			}

			hideSortingHint();
			draggedAttachmentId = Number($(this).attr('data-id'));
			$(this).addClass('is-dragging');
			ensureDragPlaceholder($(this)).insertAfter($(this));

			if (event.originalEvent && event.originalEvent.dataTransfer) {
				event.originalEvent.dataTransfer.effectAllowed = 'move';
				event.originalEvent.dataTransfer.setData('text/plain', String(draggedAttachmentId));
			}
		});

		$(document).on('dragover', '.wpf-media-card', function (event) {
			if (currentViewMode !== 'grid' || isSelectionMode || !draggedAttachmentId) {
				return;
			}

			var targetId = Number($(this).attr('data-id'));
			if (!targetId || targetId === draggedAttachmentId) {
				return;
			}

			event.preventDefault();
			$('.wpf-media-card').removeClass('is-drop-target');
			$(this).addClass('is-drop-target');

			var rect = this.getBoundingClientRect();
			var insertBefore = event.originalEvent.clientX < (rect.left + rect.width / 2);
			placeDragPlaceholder($(this), insertBefore);
		});

		$(document).on('drop', '.wpf-media-card', function (event) {
			if (currentViewMode !== 'grid' || isSelectionMode || !draggedAttachmentId) {
				return;
			}

			event.preventDefault();
			var $dragged = $('.wpf-media-card[data-id="' + draggedAttachmentId + '"]');
			if ($dragPlaceholder.length) {
				$dragged.insertBefore($dragPlaceholder);
				saveAttachmentOrder();
			}
			clearDragState();
		});

		$(document).on('dragover', '.wpf-media-card--placeholder', function (event) {
			if (currentViewMode !== 'grid' || isSelectionMode || !draggedAttachmentId) {
				return;
			}

			event.preventDefault();
		});

		$(document).on('drop', '.wpf-media-card--placeholder', function (event) {
			if (currentViewMode !== 'grid' || isSelectionMode || !draggedAttachmentId) {
				return;
			}

			event.preventDefault();
			var $dragged = $('.wpf-media-card[data-id="' + draggedAttachmentId + '"]');
			if ($dragPlaceholder.length) {
				$dragged.insertBefore($dragPlaceholder);
				saveAttachmentOrder();
			}
			clearDragState();
		});

		$(document).on('dragend', '.wpf-media-card', function () {
			clearDragState();
		});

		$(document).on('mousemove', '.wpf-library-grid', function (event) {
			isCursorInsideGrid = true;
			sortingHintPosition.x = event.clientX;
			sortingHintPosition.y = event.clientY;
			hideSortingHint();
			scheduleSortingHint();
		});

		$(document).on('mouseenter', '.wpf-library-grid', function (event) {
			isCursorInsideGrid = true;
			sortingHintPosition.x = event.clientX;
			sortingHintPosition.y = event.clientY;
			scheduleSortingHint();
		});

		$(document).on('mouseleave', '.wpf-library-grid', function () {
			isCursorInsideGrid = false;
			hideSortingHint();
		});

		$(document).on('click', '.wpf-media-thumb', function (event) {
			if (currentViewMode !== 'grid') {
				return;
			}

			var item = $(this).closest('.wpf-media-card').data('attachment');

			if (isSelectionMode || !item) {
				return;
			}

			event.stopPropagation();
			openDetailsModal(item);
		});

		$(document).on('click', '.wpf-media-meta a, .wpf-copy-url', function (event) {
			if (currentViewMode === 'grid' && isSelectionMode) {
				event.preventDefault();
				handleCardSelection($(this).closest('.wpf-media-card').attr('data-id'), event);
				return;
			}

			event.stopPropagation();
		});

		$(document).on('click', '.wpf-copy-url', function (event) {
			if (currentViewMode === 'grid' && isSelectionMode) {
				return;
			}

			var url = $(this).attr('data-url');
			event.preventDefault();

			if (!url) {
				showToast(wpfLibraryData.strings.copyUrlFailed, 'error');
				return;
			}

			copyText(url).then(function () {
				showToast(wpfLibraryData.strings.urlCopied);
			}).catch(function () {
				showToast(wpfLibraryData.strings.copyUrlFailed, 'error');
			});
		});

		$(document).on('click', '.wpf-file-modal__copy-url-button', function () {
			var url = $(this).attr('data-url');
			if (!url) {
				showToast(wpfLibraryData.strings.copyUrlFailed, 'error');
				return;
			}

			copyText(url).then(function () {
				showToast(wpfLibraryData.strings.urlCopied);
			}).catch(function () {
				showToast(wpfLibraryData.strings.copyUrlFailed, 'error');
			});
		});

		$(document).on('focus', '.wpf-file-modal__field[data-field-name]', function () {
			$(this).attr('data-last-value', String($(this).val()));
		});

		$(document).on('blur', '.wpf-file-modal__field[data-field-name]', function () {
			saveAttachmentField($(this));
		});

		$(document).on('click', '.wpf-file-modal__backdrop, .wpf-file-modal__close', function () {
			closeDetailsModal();
		});

		$(document).on('click', '.wpf-file-modal__delete-file', function () {
			var attachmentId = Number($(this).attr('data-attachment-id'));
			if (!attachmentId) {
				return;
			}

			if (!window.confirm(wpfLibraryData.strings.confirmPermanentDelete)) {
				return;
			}

			ajax('wpf_delete_attachments', {
				attachmentIds: [attachmentId]
			}).done(function (response) {
				if (response && response.success) {
					closeDetailsModal();
					selectedIds = selectedIds.filter(function (id) {
						return Number(id) !== attachmentId;
					});
					updateSelectedCount();
					fetchFolders(fetchAttachments);
					notify(response.data.message || wpfLibraryData.strings.attachmentsDeleted, 'success');
					return;
				}

				notify(wpfLibraryData.strings.unexpected, 'error');
			}).fail(function (xhr) {
				notify(readError(xhr), 'error');
			});
		});

		$(document).on('click', '.wpf-file-modal__nav--prev', function () {
			var item = getModalSiblingItem(-1);
			if (item) {
				openDetailsModal(item);
			}
		});

		$(document).on('click', '.wpf-file-modal__nav--next', function () {
			var item = getModalSiblingItem(1);
			if (item) {
				openDetailsModal(item);
			}
		});

		$(document).on('keydown', function (event) {
			if (!$('.wpf-file-modal.is-visible').length) {
				return;
			}

			if (event.key === 'Escape') {
				closeDetailsModal();
				return;
			}

			if (event.key === 'ArrowLeft') {
				var prevItem = getModalSiblingItem(-1);
				if (prevItem) {
					openDetailsModal(prevItem);
				}
				return;
			}

			if (event.key === 'ArrowRight') {
				var nextItem = getModalSiblingItem(1);
				if (nextItem) {
					openDetailsModal(nextItem);
				}
			}
		});

		$(document).on('click', '.wpf-create-root', function () {
			var name = promptName('');
			if (!name) {
				return;
			}

			ajax('wpf_create_folder', { name: name, parent: 0 }).done(function (response) {
				if (response && response.success) {
					renderTree(response.data.folders || [], folderSummary);
				}
			}).fail(function (xhr) {
				notify(readError(xhr), 'error');
			});
		});

		$(document).on('click', '.wpf-subfolder', function (event) {
			event.stopPropagation();
			var name = promptName('');
			if (!name) {
				return;
			}

			ajax('wpf_create_folder', { name: name, parent: Number($(this).attr('data-term-id')) }).done(function (response) {
				if (response && response.success) {
					renderTree(response.data.folders || [], folderSummary);
				}
			}).fail(function (xhr) {
				notify(readError(xhr), 'error');
			});
		});

		$(document).on('click', '.wpf-rename', function (event) {
			event.stopPropagation();
			var name = promptName($(this).attr('data-name'));
			if (!name) {
				return;
			}

			ajax('wpf_rename_folder', { termId: Number($(this).attr('data-term-id')), name: name }).done(function (response) {
				if (response && response.success) {
					renderTree(response.data.folders || [], folderSummary);
					notify(response.data.message, 'success');
				}
			}).fail(function (xhr) {
				notify(readError(xhr), 'error');
			});
		});

		$(document).on('click', '.wpf-delete', function (event) {
			event.stopPropagation();

			if (!window.confirm(wpfLibraryData.strings.confirmDelete)) {
				return;
			}

			ajax('wpf_delete_folder', { termId: Number($(this).attr('data-term-id')) }).done(function (response) {
				if (response && response.success) {
					if (String(currentFolder) === String($(event.currentTarget).attr('data-term-id'))) {
						currentFolder = null;
					}
					renderTree(response.data.folders || [], folderSummary);
					fetchAttachments();
					notify(response.data.message, 'success');
				}
			}).fail(function (xhr) {
				notify(readError(xhr), 'error');
			});
		});

		$(document).on('click', '.wpf-move-selected', moveSelected);

		$(document).on('click', '.wpf-select-multiple-toggle', function () {
			toggleSelectionMode();
		});

		$(document).on('click', '.wpf-view-toggle-button', function () {
			setViewMode($(this).attr('data-view-mode') || 'grid');
		});

		$(document).on('click', '.wpf-sortable-column', function () {
			var sortBy = $(this).attr('data-sort-by') || '';
			if (!sortBy) {
				return;
			}

			if (currentSortBy === sortBy) {
				currentSortOrder = currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
			} else {
				currentSortBy = sortBy;
				currentSortOrder = getDefaultSortOrder(sortBy);
			}

			clearSelection();
			resetAttachmentState();
			fetchAttachments();
		});

		$(document).on('change', '.wpf-media-row-checkbox', function (event) {
			var targetId = Number($(this).val());
			if (!targetId) {
				return;
			}

			if ($(this).is(':checked')) {
				if (selectedIds.indexOf(targetId) === -1) {
					selectedIds.push(targetId);
				}
			} else {
				selectedIds = selectedIds.filter(function (id) {
					return Number(id) !== targetId;
				});
			}

			lastSelectedId = targetId;
			updateSelectedCount();
			event.stopPropagation();
		});

		$(document).on('change', '.wpf-media-list-select-all', function () {
			if ($(this).is(':checked')) {
				selectedIds = currentAttachments.map(function (item) {
					return Number(item.id);
				});
			} else {
				selectedIds = [];
			}

			updateSelectedCount();
		});

		$(document).on('change', '.wpf-list-bulk-action', function () {
			updateSelectedCount();
		});

		$(document).on('click', '.wpf-list-bulk-apply', function () {
			var action = $('.wpf-list-bulk-action').val();
			if (action !== 'delete' || !selectedIds.length) {
				return;
			}

			deleteSelected();
		});

		$(document).on('click', '.wpf-list-pagination__button', function () {
			if ($(this).prop('disabled')) {
				return;
			}

			goToPage($(this).attr('data-page-target'));
		});

		$(document).on('keydown', '.wpf-list-pagination__input', function (event) {
			if (event.key !== 'Enter') {
				return;
			}

			event.preventDefault();
			goToPage($(this).val());
		});

		$(document).on('change', '.wpf-list-pagination__input', function () {
			goToPage($(this).val());
		});

		$(document).on('click', '.wpf-media-row-open', function (event) {
			var item = $(this).closest('.wpf-media-card').data('attachment');
			event.preventDefault();
			if (!item) {
				return;
			}

			openDetailsModal(item);
		});

		$(document).on('click', '.wpf-media-row-delete', function (event) {
			var attachmentId = Number($(this).attr('data-attachment-id'));
			event.preventDefault();
			if (!attachmentId || !window.confirm(wpfLibraryData.strings.confirmPermanentDelete)) {
				return;
			}

			ajax('wpf_delete_attachments', {
				attachmentIds: [attachmentId]
			}).done(function (response) {
				if (response && response.success) {
					selectedIds = selectedIds.filter(function (id) {
						return Number(id) !== attachmentId;
					});
					updateSelectedCount();
					fetchFolders(fetchAttachments);
					notify(response.data.message || wpfLibraryData.strings.attachmentsDeleted, 'success');
					return;
				}

				notify(wpfLibraryData.strings.unexpected, 'error');
			}).fail(function (xhr) {
				notify(readError(xhr), 'error');
			});
		});

		$(document).on('click', '.wpf-delete-selected', function () {
			deleteSelected();
		});

		$(document).on('input', '.wpf-media-search', function () {
			window.clearTimeout(searchTimer);
			searchTimer = window.setTimeout(function () {
				resetAttachmentState();
				fetchAttachments();
			}, 250);
		});

		$(document).on('change', '.wpf-media-type-filter', function () {
			currentMediaType = $(this).val() || '';
			resetAttachmentState();
			fetchAttachments();
		});

		$(document).on('change', '.wpf-media-date-filter', function () {
			currentMediaMonth = $(this).val() || '';
			resetAttachmentState();
			fetchAttachments();
		});

		$(document).on('click', '.wpf-load-more', function () {
			fetchAttachments({ append: true });
		});

		$(document).on('click', '.wpf-upload-trigger', function () {
			toggleUploadPanel();
		});

		$(document).on('click', '.wpf-upload-panel-close', function () {
			setUploadPanelState(false);
		});

		$(document).on('click', '.wpf-upload-select', function () {
			if (isUploadingFiles) {
				return;
			}

			$('.wpf-upload-input').trigger('click');
		});

		$(document).on('change', '.wpf-upload-input', function () {
			uploadFiles(this.files);
			$(this).val('');
		});

		$(document).on('dragenter dragover', '.wpf-upload-dropzone', function (event) {
			if (isUploadingFiles) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			$(this).addClass('is-dragover');
		});

		$(document).on('dragleave dragend', '.wpf-upload-dropzone', function (event) {
			if (isUploadingFiles) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();

			if (event.target === this) {
				$(this).removeClass('is-dragover');
			}
		});

		$(document).on('drop', '.wpf-upload-dropzone', function (event) {
			if (isUploadingFiles) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			$(this).removeClass('is-dragover');

			var dataTransfer = event.originalEvent && event.originalEvent.dataTransfer;
			if (!dataTransfer || !dataTransfer.files || !dataTransfer.files.length) {
				return;
			}

			uploadFiles(dataTransfer.files);
		});

		$(document).on('keydown', '.wpf-upload-dropzone', function (event) {
			if (isUploadingFiles) {
				return;
			}

			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				$('.wpf-upload-input').trigger('click');
			}
		});
	}

	$(function () {
		bindEvents();
		setSelectionMode(false);
		updateViewModeUi();
		updateSelectedCount();
		updateResultsUi();
		renderMediaTypeFilter();
		renderMediaDateFilter([]);
		fetchFolders(fetchAttachments);
	});
}(jQuery));
