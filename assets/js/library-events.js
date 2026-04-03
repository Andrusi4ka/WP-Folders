(function ($, window) {
	'use strict';

	var app = window.WPFLibraryApp;

	if (!app || typeof wpfLibraryData === 'undefined') {
		return;
	}

	function state() {
		return app.state;
	}

	function suppressCardClick() {
		state().suppressCardClickUntil = Date.now() + 250;
	}

	function handleFolderDelete($button, event) {
		app.ajax('wpf_delete_folder', { termId: Number($button.attr('data-term-id')) }).done(function (response) {
			if (response && response.success) {
				if (String(state().currentFolder) === String($(event.currentTarget).attr('data-term-id'))) {
					state().currentFolder = null;
				}
				app.renderTree(response.data.folders || [], state().folderSummary);
				app.fetchAttachments();
				app.notify(response.data.message, 'success');
			}
		}).fail(function (xhr) {
			app.notify(app.readError(xhr), 'error');
		});
	}

	app.bindEvents = function () {
		$(document).on('click', '.wpf-folder-link', function () {
			var value = $(this).attr('data-folder-id');
			state().currentFolder = value === '' ? null : Number(value);
			app.clearSelection();
			app.resetAttachmentState();
			app.fetchFolders(app.fetchAttachments);
		});

		$(document).on('click', '.wpf-media-card', function (event) {
			if (state().currentViewMode === 'list') {
				return;
			}

			if (state().suppressCardClickUntil > Date.now()) {
				event.preventDefault();
				return;
			}

			if (!state().isSelectionMode) {
				var item = $(this).data('attachment');
				if (item) {
					app.openDetailsModal(item);
				}
				return;
			}

			app.handleCardSelection($(this).attr('data-id'), event);
		});

		$(document).on('dragstart', '.wpf-media-card', function (event) {
			suppressCardClick();
			state().draggedAttachmentId = Number($(this).attr('data-id'));
			state().draggedAttachmentIds = app.getDraggedIds(state().draggedAttachmentId);

			if (!state().draggedAttachmentId || !state().draggedAttachmentIds.length) {
				event.preventDefault();
				app.clearDragState();
				return;
			}

			$('.wpf-media-card').removeClass('is-dragging');
			state().draggedAttachmentIds.forEach(function (id) {
				$('.wpf-media-card[data-id="' + id + '"]').addClass('is-dragging');
			});

			if (state().currentViewMode === 'grid' && !state().isSelectionMode && state().draggedAttachmentIds.length === 1) {
				app.hideSortingHint();
				app.ensureDragPlaceholder($(this)).insertAfter($(this));
			}

			if (event.originalEvent && event.originalEvent.dataTransfer) {
				event.originalEvent.dataTransfer.effectAllowed = 'move';
				event.originalEvent.dataTransfer.setData('text/plain', String(state().draggedAttachmentId));
			}
		});

		$(document).on('dragover', '.wpf-media-card', function (event) {
			if (state().currentViewMode !== 'grid' || state().isSelectionMode || !state().draggedAttachmentId || state().draggedAttachmentIds.length !== 1) {
				return;
			}

			var targetId = Number($(this).attr('data-id'));
			if (!targetId || targetId === state().draggedAttachmentId) {
				return;
			}

			event.preventDefault();
			$('.wpf-media-card').removeClass('is-drop-target');
			$(this).addClass('is-drop-target');

			var rect = this.getBoundingClientRect();
			var insertBefore = event.originalEvent.clientX < (rect.left + rect.width / 2);
			app.placeDragPlaceholder($(this), insertBefore);
		});

		$(document).on('dragover', '.wpf-media-card--placeholder', function (event) {
			if (state().currentViewMode !== 'grid' || state().isSelectionMode || !state().draggedAttachmentId || state().draggedAttachmentIds.length !== 1) {
				return;
			}

			event.preventDefault();
		});

		$(document).on('drop', '.wpf-media-card, .wpf-media-card--placeholder', function (event) {
			if (state().currentViewMode !== 'grid' || state().isSelectionMode || !state().draggedAttachmentId || state().draggedAttachmentIds.length !== 1) {
				return;
			}

			event.preventDefault();
			suppressCardClick();
			var $dragged = $('.wpf-media-card[data-id="' + state().draggedAttachmentId + '"]');
			if (state().$dragPlaceholder.length) {
				$dragged.insertBefore(state().$dragPlaceholder);
				app.saveAttachmentOrder();
			}
			app.clearDragState();
		});

		$(document).on('dragend', '.wpf-media-card', function () {
			suppressCardClick();
			app.clearDragState();
		});

		$(document).on('dragover', '.wpf-folder-link', function (event) {
			if (!state().draggedAttachmentIds.length) {
				return;
			}

			var folderId = $(this).attr('data-folder-id');
			if (folderId === '') {
				return;
			}

			event.preventDefault();
			$('.wpf-folder-link').removeClass('is-drop-target');
			$(this).addClass('is-drop-target');
		});

		$(document).on('dragleave', '.wpf-folder-link', function (event) {
			var related = event.originalEvent ? event.originalEvent.relatedTarget : null;
			if (related && $.contains(this, related)) {
				return;
			}

			$(this).removeClass('is-drop-target');
		});

		$(document).on('drop', '.wpf-folder-link', function (event) {
			if (!state().draggedAttachmentIds.length) {
				return;
			}

			var folderId = $(this).attr('data-folder-id');
			if (folderId === '') {
				return;
			}

			event.preventDefault();
			suppressCardClick();
			app.moveAttachmentsToFolder(state().draggedAttachmentIds.slice(), folderId);
			app.clearDragState();
		});

		$(document).on('mousemove mouseenter', '.wpf-library-grid', function (event) {
			state().isCursorInsideGrid = true;
			state().sortingHintPosition.x = event.clientX;
			state().sortingHintPosition.y = event.clientY;
			if (event.type === 'mousemove') {
				app.hideSortingHint();
			}
			app.scheduleSortingHint();
		});

		$(document).on('mouseleave', '.wpf-library-grid', function () {
			state().isCursorInsideGrid = false;
			app.hideSortingHint();
		});

		$(document).on('click', '.wpf-media-thumb', function (event) {
			if (state().currentViewMode !== 'grid') {
				return;
			}

			var item = $(this).closest('.wpf-media-card').data('attachment');

			if (state().isSelectionMode || !item) {
				return;
			}

			event.stopPropagation();
			app.openDetailsModal(item);
		});

		$(document).on('click', '.wpf-media-meta a, .wpf-copy-url', function (event) {
			if (state().currentViewMode === 'grid' && state().isSelectionMode) {
				event.preventDefault();
				app.handleCardSelection($(this).closest('.wpf-media-card').attr('data-id'), event);
				return;
			}

			event.stopPropagation();
		});

		$(document).on('click', '.wpf-copy-url, .wpf-file-modal__copy-url-button', function (event) {
			if ($(this).hasClass('wpf-copy-url') && state().currentViewMode === 'grid' && state().isSelectionMode) {
				return;
			}

			var url = $(this).attr('data-url');
			event.preventDefault();

			if (!url) {
				app.showToast(wpfLibraryData.strings.copyUrlFailed, 'error');
				return;
			}

			app.copyText(url).then(function () {
				app.showToast(wpfLibraryData.strings.urlCopied);
			}).catch(function () {
				app.showToast(wpfLibraryData.strings.copyUrlFailed, 'error');
			});
		});

		$(document).on('focus', '.wpf-file-modal__field[data-field-name]', function () {
			$(this).attr('data-last-value', String($(this).val()));
		});

		$(document).on('blur', '.wpf-file-modal__field[data-field-name]', function () {
			app.saveAttachmentField($(this));
		});

		$(document).on('click', '.wpf-file-modal__backdrop, .wpf-file-modal__close', function () {
			app.closeDetailsModal();
		});

		$(document).on('click', '.wpf-file-modal__delete-file', function () {
			var attachmentId = Number($(this).attr('data-attachment-id'));
			if (!attachmentId || !window.confirm(wpfLibraryData.strings.confirmPermanentDelete)) {
				return;
			}

			app.ajax('wpf_delete_attachments', {
				attachmentIds: [attachmentId]
			}).done(function (response) {
				if (response && response.success) {
					app.closeDetailsModal();
					state().selectedIds = state().selectedIds.filter(function (id) {
						return Number(id) !== attachmentId;
					});
					app.updateSelectedCount();
					app.fetchFolders(app.fetchAttachments);
					app.notify(response.data.message || wpfLibraryData.strings.attachmentsDeleted, 'success');
					return;
				}

				app.notify(wpfLibraryData.strings.unexpected, 'error');
			}).fail(function (xhr) {
				app.notify(app.readError(xhr), 'error');
			});
		});

		$(document).on('click', '.wpf-file-modal__nav--prev', function () {
			var item = app.getModalSiblingItem(-1);
			if (item) {
				app.openDetailsModal(item);
			}
		});

		$(document).on('click', '.wpf-file-modal__nav--next', function () {
			var item = app.getModalSiblingItem(1);
			if (item) {
				app.openDetailsModal(item);
			}
		});

		$(document).on('keydown', function (event) {
			if (!$('.wpf-file-modal.is-visible').length) {
				return;
			}

			if (event.key === 'Escape') {
				app.closeDetailsModal();
				return;
			}

			if (event.key === 'ArrowLeft') {
				var prevItem = app.getModalSiblingItem(-1);
				if (prevItem) {
					app.openDetailsModal(prevItem);
				}
				return;
			}

			if (event.key === 'ArrowRight') {
				var nextItem = app.getModalSiblingItem(1);
				if (nextItem) {
					app.openDetailsModal(nextItem);
				}
			}
		});

		$(document).on('click', '.wpf-create-root', function () {
			var name = app.promptName('');
			if (!name) {
				return;
			}

			app.ajax('wpf_create_folder', { name: name, parent: 0 }).done(function (response) {
				if (response && response.success) {
					app.renderTree(response.data.folders || [], state().folderSummary);
				}
			}).fail(function (xhr) {
				app.notify(app.readError(xhr), 'error');
			});
		});

		$(document).on('click', '.wpf-subfolder', function (event) {
			event.stopPropagation();
			var name = app.promptName('');
			if (!name) {
				return;
			}

			app.ajax('wpf_create_folder', { name: name, parent: Number($(this).attr('data-term-id')) }).done(function (response) {
				if (response && response.success) {
					app.renderTree(response.data.folders || [], state().folderSummary);
				}
			}).fail(function (xhr) {
				app.notify(app.readError(xhr), 'error');
			});
		});

		$(document).on('click', '.wpf-rename', function (event) {
			event.stopPropagation();
			var name = app.promptName($(this).attr('data-name'));
			if (!name) {
				return;
			}

			app.ajax('wpf_rename_folder', { termId: Number($(this).attr('data-term-id')), name: name }).done(function (response) {
				if (response && response.success) {
					app.renderTree(response.data.folders || [], state().folderSummary);
					app.notify(response.data.message, 'success');
				}
			}).fail(function (xhr) {
				app.notify(app.readError(xhr), 'error');
			});
		});

		$(document).on('click', '.wpf-delete', function (event) {
			event.stopPropagation();

			if (!window.confirm(wpfLibraryData.strings.confirmDelete)) {
				return;
			}

			handleFolderDelete($(this), event);
		});

		$(document).on('click', '.wpf-move-selected', app.moveSelected);
		$(document).on('click', '.wpf-select-multiple-toggle', app.toggleSelectionMode);
		$(document).on('click', '.wpf-view-toggle-button', function () {
			app.setViewMode($(this).attr('data-view-mode') || 'grid');
		});

		$(document).on('click', '.wpf-sortable-column', function () {
			var sortBy = $(this).attr('data-sort-by') || '';
			if (!sortBy) {
				return;
			}

			if (state().currentSortBy === sortBy) {
				state().currentSortOrder = state().currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
			} else {
				state().currentSortBy = sortBy;
				state().currentSortOrder = app.getDefaultSortOrder(sortBy);
			}

			app.clearSelection();
			app.resetAttachmentState();
			app.fetchAttachments();
		});

		$(document).on('change', '.wpf-media-row-checkbox', function (event) {
			var targetId = Number($(this).val());
			if (!targetId) {
				return;
			}

			if ($(this).is(':checked')) {
				if (state().selectedIds.indexOf(targetId) === -1) {
					state().selectedIds.push(targetId);
				}
			} else {
				state().selectedIds = state().selectedIds.filter(function (id) {
					return Number(id) !== targetId;
				});
			}

			state().lastSelectedId = targetId;
			app.updateSelectedCount();
			event.stopPropagation();
		});

		$(document).on('change', '.wpf-media-list-select-all', function () {
			state().selectedIds = $(this).is(':checked')
				? state().currentAttachments.map(function (item) { return Number(item.id); })
				: [];

			app.updateSelectedCount();
		});

		$(document).on('change', '.wpf-list-bulk-action', app.updateSelectedCount);

		$(document).on('click', '.wpf-list-bulk-apply', function () {
			var action = $('.wpf-list-bulk-action').val();
			if (action !== 'delete' || !state().selectedIds.length) {
				return;
			}

			app.deleteSelected();
		});

		$(document).on('click', '.wpf-list-pagination__button', function () {
			if (!$(this).prop('disabled')) {
				app.goToPage($(this).attr('data-page-target'));
			}
		});

		$(document).on('keydown change', '.wpf-list-pagination__input', function (event) {
			if (event.type === 'keydown' && event.key !== 'Enter') {
				return;
			}

			if (event.type === 'keydown') {
				event.preventDefault();
			}
			app.goToPage($(this).val());
		});

		$(document).on('click', '.wpf-delete-selected', app.deleteSelected);

		$(document).on('click', '.wpf-media-row-open', function (event) {
			var item = $(this).closest('.wpf-media-card').data('attachment');
			event.preventDefault();
			if (item) {
				app.openDetailsModal(item);
			}
		});

		$(document).on('click', '.wpf-media-row-delete', function (event) {
			var attachmentId = Number($(this).attr('data-attachment-id'));
			event.preventDefault();
			if (!attachmentId || !window.confirm(wpfLibraryData.strings.confirmPermanentDelete)) {
				return;
			}

			app.ajax('wpf_delete_attachments', {
				attachmentIds: [attachmentId]
			}).done(function (response) {
				if (response && response.success) {
					state().selectedIds = state().selectedIds.filter(function (id) {
						return Number(id) !== attachmentId;
					});
					app.updateSelectedCount();
					app.fetchFolders(app.fetchAttachments);
					app.notify(response.data.message || wpfLibraryData.strings.attachmentsDeleted, 'success');
					return;
				}

				app.notify(wpfLibraryData.strings.unexpected, 'error');
			}).fail(function (xhr) {
				app.notify(app.readError(xhr), 'error');
			});
		});

		$(document).on('input', '.wpf-media-search', function () {
			window.clearTimeout(state().searchTimer);
			state().searchTimer = window.setTimeout(function () {
				app.resetAttachmentState();
				app.fetchAttachments();
			}, 250);
		});

		$(document).on('change', '.wpf-media-type-filter', function () {
			state().currentMediaType = $(this).val() || '';
			app.resetAttachmentState();
			app.fetchAttachments();
		});

		$(document).on('change', '.wpf-media-date-filter', function () {
			state().currentMediaMonth = $(this).val() || '';
			app.resetAttachmentState();
			app.fetchAttachments();
		});

		$(document).on('click', '.wpf-load-more', function () {
			app.fetchAttachments({ append: true });
		});

		$(document).on('click', '.wpf-upload-trigger', app.toggleUploadPanel);
		$(document).on('click', '.wpf-upload-panel-close', function () {
			app.setUploadPanelState(false);
		});

		$(document).on('click', '.wpf-upload-select', function () {
			if (!state().isUploadingFiles) {
				$('.wpf-upload-input').trigger('click');
			}
		});

		$(document).on('change', '.wpf-upload-input', function () {
			app.uploadFiles(this.files);
			$(this).val('');
		});

		$(document).on('dragenter dragover', '.wpf-upload-dropzone', function (event) {
			if (state().isUploadingFiles) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			$(this).addClass('is-dragover');
		});

		$(document).on('dragleave dragend', '.wpf-upload-dropzone', function (event) {
			if (state().isUploadingFiles) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();

			if (event.target === this) {
				$(this).removeClass('is-dragover');
			}
		});

		$(document).on('drop', '.wpf-upload-dropzone', function (event) {
			if (state().isUploadingFiles) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			$(this).removeClass('is-dragover');

			var dataTransfer = event.originalEvent && event.originalEvent.dataTransfer;
			if (dataTransfer && dataTransfer.files && dataTransfer.files.length) {
				app.uploadFiles(dataTransfer.files);
			}
		});

		$(document).on('keydown', '.wpf-upload-dropzone', function (event) {
			if (state().isUploadingFiles) {
				return;
			}

			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				$('.wpf-upload-input').trigger('click');
			}
		});
	};

	app.init = function () {
		app.bindEvents();
		app.setSelectionMode(false);
		app.updateViewModeUi();
		app.updateSelectedCount();
		app.updateResultsUi();
		app.renderMediaTypeFilter();
		app.renderMediaDateFilter([]);
		app.fetchFolders(app.fetchAttachments);
	};
}(jQuery, window));
