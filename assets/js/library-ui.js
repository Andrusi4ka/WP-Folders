(function ($, window) {
	'use strict';

	var app = window.WPFLibraryApp;

	if (!app || typeof wpfLibraryData === 'undefined') {
		return;
	}

	function state() {
		return app.state;
	}

	app.getPendingUploadItems = function () {
		return state().uploadProgressItems.filter(function (item) {
			return Number(item.loaded) < Number(item.size);
		});
	};

	app.showUploadProcessingState = function () {
		var elements = app.getUploadProgressElements();
		elements.$root.addClass('is-processing');
		elements.$title.text(wpfLibraryData.strings.filesTransferred || 'Files transferred.');
		elements.$status.text(wpfLibraryData.strings.serverProcessingUpload || 'Server is processing uploaded files...');
		elements.$percent.text('100%');
		elements.$bar.css('width', '100%');
		elements.$list.html(
			'<div class="wpf-upload-progress__processing">' +
				'<img class="wpf-upload-progress__processing-image" src="' + app.escapeHtml(wpfLibraryData.loadingImage || '') + '" alt="' + app.escapeHtml(wpfLibraryData.strings.loadingMedia || '') + '">' +
			'</div>'
		);
	};

	app.getUploadProgressElements = function () {
		return {
			$root: $('.wpf-upload-progress'),
			$title: $('.wpf-upload-progress__title'),
			$status: $('.wpf-upload-progress__status'),
			$percent: $('.wpf-upload-progress__percent'),
			$bar: $('.wpf-upload-progress__bar-fill'),
			$list: $('.wpf-upload-progress__list')
		};
	};

	app.setUploadUiBusy = function (isBusy) {
		state().isUploadingFiles = !!isBusy;
		$('.wpf-upload-select, .wpf-upload-trigger, .wpf-upload-input, .wpf-upload-panel-close').prop('disabled', state().isUploadingFiles);
		$('.wpf-upload-dropzone').toggleClass('is-disabled', state().isUploadingFiles).attr('aria-disabled', state().isUploadingFiles ? 'true' : 'false');
	};

	app.resetUploadProgress = function () {
		state().uploadRequestCompleted = false;
		state().uploadProgressItems = [];
		var elements = app.getUploadProgressElements();
		elements.$root.removeClass('is-processing');
		elements.$root.prop('hidden', true);
		elements.$title.text(wpfLibraryData.strings.transferringFiles || '');
		elements.$status.text(app.getUploadStatusText(0, 0));
		elements.$percent.text('0%');
		elements.$bar.css('width', '0%');
		elements.$list.empty();
		app.setUploadUiBusy(false);
	};

	app.renderUploadProgressList = function () {
		var elements = app.getUploadProgressElements();
		var html = '';
		var items = app.getPendingUploadItems();

		items.forEach(function (item) {
			var percent = item.size > 0 ? Math.min(100, Math.round((item.loaded / item.size) * 100)) : 100;
			html += '' +
				'<div class="wpf-upload-progress__item">' +
					'<div class="wpf-upload-progress__item-head">' +
						'<span class="wpf-upload-progress__item-name">' + app.escapeHtml(item.name || '') + '</span>' +
						'<span class="wpf-upload-progress__item-value">' + percent + '%</span>' +
					'</div>' +
					'<div class="wpf-upload-progress__item-bar" aria-hidden="true">' +
						'<span class="wpf-upload-progress__item-bar-fill" style="width:' + percent + '%"></span>' +
					'</div>' +
				'</div>';
		});

		elements.$list.html(html);
	};

	app.initializeUploadProgress = function (files) {
		state().uploadProgressItems = Array.prototype.map.call(files, function (file) {
			return {
				name: file && file.name ? file.name : '',
				size: Math.max(0, Number(file && file.size ? file.size : 0)),
				loaded: 0
			};
		});

		app.renderUploadProgressList();
		app.updateUploadProgress(0);
		app.getUploadProgressElements().$root.prop('hidden', false);
		app.setUploadUiBusy(true);
	};

	app.updateUploadProgress = function (loadedBytes) {
		var totalBytes = 0;
		var uploadedBytes = Math.max(0, Number(loadedBytes) || 0);
		var cumulative = 0;

		state().uploadProgressItems.forEach(function (item) {
			totalBytes += item.size;
		});

		state().uploadProgressItems.forEach(function (item) {
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
		var elements = app.getUploadProgressElements();
		elements.$title.text(wpfLibraryData.strings.transferringFiles || '');
		elements.$status.text(app.getUploadStatusText(uploadedBytes, totalBytes));
		elements.$percent.text(percent + '%');
		elements.$bar.css('width', percent + '%');

		app.renderUploadProgressList();

		if (!app.getPendingUploadItems().length && !state().uploadRequestCompleted) {
			app.showUploadProcessingState();
		}
	};

	app.completeUploadProgress = function () {
		var totalBytes = 0;

		state().uploadProgressItems.forEach(function (item) {
			totalBytes += item.size;
		});

		app.updateUploadProgress(totalBytes);
		app.setUploadUiBusy(false);
	};

	app.failUploadProgress = function (message) {
		state().uploadRequestCompleted = true;
		var elements = app.getUploadProgressElements();
		elements.$root.removeClass('is-processing');
		elements.$title.text(message || wpfLibraryData.strings.uploadFailed || wpfLibraryData.strings.unexpected);
		elements.$list.empty();
		app.setUploadUiBusy(false);
	};

	app.finalizeSuccessfulUpload = function () {
		state().uploadRequestCompleted = true;
		app.completeUploadProgress();
		$('.wpf-upload-dropzone').removeClass('is-dragover');
		app.resetUploadProgress();
		app.setUploadPanelState(!!wpfLibraryData.alwaysShowUploadPanel);
	};

	app.ensureDetailsModal = function () {
		var $modal = $('.wpf-file-modal');

		if ($modal.length) {
			return $modal;
		}

		$modal = $(
			'<div class="wpf-file-modal" hidden>' +
				'<div class="wpf-file-modal__backdrop"></div>' +
				'<div class="wpf-file-modal__dialog" role="dialog" aria-modal="true" aria-label="' + app.escapeHtml(wpfLibraryData.strings.fileDetails) + '">' +
					'<div class="wpf-file-modal__panel">' +
						'<div class="wpf-file-modal__header">' +
							'<h1 class="wpf-file-modal__heading">' + app.escapeHtml(wpfLibraryData.strings.attachmentDetails) + '</h1>' +
							'<div class="wpf-file-modal__header-actions">' +
								'<button type="button" class="wpf-file-modal__nav wpf-file-modal__nav--prev" aria-label="' + app.escapeHtml(wpfLibraryData.strings.previousLabel || 'Previous') + '">&#xf341;</button>' +
								'<button type="button" class="wpf-file-modal__nav wpf-file-modal__nav--next" aria-label="' + app.escapeHtml(wpfLibraryData.strings.nextLabel || 'Next') + '">&#xf345;</button>' +
								'<button type="button" class="wpf-file-modal__close" aria-label="' + app.escapeHtml(wpfLibraryData.strings.closeModal) + '">&#10005;</button>' +
							'</div>' +
						'</div>' +
						'<div class="wpf-file-modal__body"></div>' +
					'</div>' +
				'</div>' +
			'</div>'
		);

		$('body').append($modal);
		return $modal;
	};

	app.getVisibleAttachmentItems = function () {
		return $('.wpf-media-card').map(function () {
			return $(this).data('attachment');
		}).get().filter(function (item) {
			return !!item && !!item.id;
		});
	};

	app.getModalSiblingItem = function (direction) {
		var items = app.getVisibleAttachmentItems();
		var currentIndex = items.findIndex(function (item) {
			return Number(item.id) === Number(state().currentModalAttachmentId);
		});

		if (currentIndex === -1) {
			return null;
		}

		var nextIndex = currentIndex + direction;
		if (nextIndex < 0 || nextIndex >= items.length) {
			return null;
		}

		return items[nextIndex];
	};

	app.updateModalNavigation = function () {
		var $modal = $('.wpf-file-modal');
		if (!$modal.length) {
			return;
		}

		$modal.find('.wpf-file-modal__nav--prev').prop('disabled', !app.getModalSiblingItem(-1));
		$modal.find('.wpf-file-modal__nav--next').prop('disabled', !app.getModalSiblingItem(1));
	};

	app.closeDetailsModal = function () {
		var $modal = $('.wpf-file-modal');
		if (!$modal.length) {
			return;
		}

		state().currentModalAttachmentId = null;
		$modal.removeClass('is-visible').prop('hidden', true);
		$('body').removeClass('wpf-modal-open');
		app.scheduleSortingHint();
	};

	app.ensureSortingHint = function () {
		var $hint = $('.wpf-sorting-hint');

		if ($hint.length) {
			return $hint;
		}

		$hint = $('<div class="wpf-sorting-hint" hidden><img alt=""></div>');
		$hint.find('img').attr('src', wpfLibraryData.sortingImage || '');
		$('body').append($hint);

		return $hint;
	};

	app.hideSortingHint = function () {
		window.clearTimeout(state().sortingHintTimer);
		app.ensureSortingHint().prop('hidden', true).removeClass('is-visible');
	};

	app.positionSortingHint = function () {
		app.ensureSortingHint().css({
			left: (state().sortingHintPosition.x + 18) + 'px',
			top: (state().sortingHintPosition.y - 70) + 'px'
		});
	};

	app.canShowSortingHint = function () {
		return state().currentViewMode === 'grid' &&
			state().isCursorInsideGrid &&
			!state().isSelectionMode &&
			!state().draggedAttachmentId &&
			!$('.wpf-file-modal.is-visible').length &&
			$('.wpf-library-grid .wpf-media-card').length > 0;
	};

	app.scheduleSortingHint = function () {
		window.clearTimeout(state().sortingHintTimer);

		if (!app.canShowSortingHint()) {
			app.hideSortingHint();
			return;
		}

		state().sortingHintTimer = window.setTimeout(function () {
			if (!app.canShowSortingHint()) {
				return;
			}

			app.positionSortingHint();
			app.ensureSortingHint().prop('hidden', false).addClass('is-visible');
		}, 5000);
	};

	app.promptName = function (defaultValue) {
		var name = window.prompt(wpfLibraryData.strings.folderName, defaultValue || '');
		if (name === null) {
			return null;
		}

		name = name.trim();
		if (!name) {
			app.notify(wpfLibraryData.strings.emptyName, 'error');
			return null;
		}

		return name;
	};
}(jQuery, window));
