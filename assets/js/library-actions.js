(function ($, window) {
	'use strict';

	var app = window.WPFLibraryApp;

	if (!app || typeof wpfLibraryData === 'undefined') {
		return;
	}

	function state() {
		return app.state;
	}

	app.clampPageNumber = function (page) {
		page = Number(page) || 1;
		return Math.max(1, Math.min(state().attachmentState.totalPages || 1, page));
	};

	app.goToPage = function (page) {
		page = app.clampPageNumber(page);

		if (page === state().attachmentState.page) {
			app.renderListPagination();
			return;
		}

		app.clearSelection();
		app.fetchAttachments({ page: page });
	};

	app.fetchFolders = function (callback) {
		app.ajax('wpf_get_folders').done(function (response) {
			if (response && response.success) {
				app.renderTree(response.data.folders || [], response.data.summary || {});
				if (callback) {
					callback();
				}
				return;
			}

			app.notify(wpfLibraryData.strings.unexpected, 'error');
		}).fail(function (xhr) {
			app.notify(app.readError(xhr), 'error');
		});
	};

	app.fetchAttachments = function (options) {
		options = options || {};
		var append = !!options.append;
		var page = options.page ? app.clampPageNumber(options.page) : (append ? state().attachmentState.page + 1 : 1);

		if (!append) {
			$('.wpf-library-grid').empty();
			app.renderLoadingState();
		}

		app.ajax('wpf_get_attachments', {
			folderId: state().currentFolder,
			search: $('.wpf-media-search').val(),
			mediaType: state().currentMediaType,
			mediaMonth: state().currentMediaMonth,
			sortBy: state().currentViewMode === 'list' ? state().currentSortBy : '',
			sortOrder: state().currentViewMode === 'list' ? state().currentSortOrder : '',
			page: page,
			perPage: state().attachmentState.perPage
		}).done(function (response) {
			if (response && response.success) {
				var items = response.data.attachments || [];
				state().attachmentState.page = response.data.page || page;
				state().attachmentState.perPage = app.normalizePerPage(response.data.perPage || state().attachmentState.perPage);
				state().attachmentState.total = response.data.total || 0;
				state().attachmentState.shown = response.data.shown || 0;
				state().attachmentState.totalPages = response.data.totalPages || 0;
				state().attachmentState.hasMore = !!response.data.hasMore;
				state().currentAttachments = append ? state().currentAttachments.concat(items) : items.slice();
				app.renderMediaTypeFilter();
				app.renderMediaDateFilter(response.data.filters && response.data.filters.months ? response.data.filters.months : []);
				app.renderAttachments(state().currentAttachments);
				return;
			}

			app.notify(wpfLibraryData.strings.unexpected, 'error');
		}).fail(function (xhr) {
			app.notify(app.readError(xhr), 'error');
		});
	};

	app.toggleSelection = function (id) {
		id = Number(id);
		var index = state().selectedIds.indexOf(id);

		if (index === -1) {
			state().selectedIds.push(id);
		} else {
			state().selectedIds.splice(index, 1);
		}

		app.updateSelectedCount();
		$('.wpf-media-card[data-id="' + id + '"]').toggleClass('is-selected', index === -1);
		state().lastSelectedId = id;
	};

	app.selectRange = function (targetId) {
		targetId = Number(targetId);

		if (!state().lastSelectedId) {
			app.toggleSelection(targetId);
			return;
		}

		var cardIds = $('.wpf-media-card').map(function () {
			return Number($(this).attr('data-id'));
		}).get();
		var startIndex = cardIds.indexOf(Number(state().lastSelectedId));
		var endIndex = cardIds.indexOf(targetId);

		if (startIndex === -1 || endIndex === -1) {
			app.toggleSelection(targetId);
			return;
		}

		var from = Math.min(startIndex, endIndex);
		var to = Math.max(startIndex, endIndex);

		for (var i = from; i <= to; i += 1) {
			if (state().selectedIds.indexOf(cardIds[i]) === -1) {
				state().selectedIds.push(cardIds[i]);
			}
		}

		app.updateSelectedCount();
		$('.wpf-media-card').removeClass('is-selected');
		state().selectedIds.forEach(function (id) {
			$('.wpf-media-card[data-id="' + id + '"]').addClass('is-selected');
		});
		state().lastSelectedId = targetId;
	};

	app.clearSelection = function () {
		state().selectedIds = [];
		state().lastSelectedId = null;
		app.updateSelectedCount();
		$('.wpf-media-card').removeClass('is-selected');
	};

	app.getDraggedIds = function (startId) {
		startId = Number(startId);
		if (!startId) {
			return [];
		}

		if (state().selectedIds.indexOf(startId) !== -1) {
			return state().selectedIds.slice();
		}

		return [startId];
	};

	app.moveAttachmentsToFolder = function (attachmentIds, targetFolder) {
		var ids = (attachmentIds || []).map(function (id) {
			return Number(id);
		}).filter(function (id) {
			return id > 0;
		});

		if (!ids.length) {
			app.notify(wpfLibraryData.strings.selectFiles, 'error');
			return;
		}

		app.ajax('wpf_assign_folder', {
			folderId: Number(targetFolder),
			attachmentIds: ids
		}).done(function (response) {
			if (response && response.success) {
				app.setSelectionMode(false);
				$('.wpf-target-folder-select').val('');
				app.fetchFolders(app.fetchAttachments);
				app.notify(response.data.message || wpfLibraryData.strings.attachmentsMoved, 'success');
				return;
			}

			app.notify(wpfLibraryData.strings.unexpected, 'error');
		}).fail(function (xhr) {
			app.notify(app.readError(xhr), 'error');
		});
	};

	app.getCurrentCardOrder = function () {
		return $('.wpf-library-grid .wpf-media-card').map(function () {
			return Number($(this).attr('data-id'));
		}).get().filter(function (id) {
			return id > 0;
		});
	};

	app.saveAttachmentOrder = function () {
		var orderedIds = app.getCurrentCardOrder();
		if (orderedIds.length < 2) {
			return;
		}

		app.ajax('wpf_update_attachment_order', {
			orderedIds: orderedIds
		}).fail(function (xhr) {
			app.notify(app.readError(xhr), 'error');
			app.fetchAttachments();
		});
	};

	app.placeDragPlaceholder = function ($target, insertBefore) {
		var $placeholder = app.ensureDragPlaceholder($('.wpf-media-card[data-id="' + state().draggedAttachmentId + '"]'));
		if (!$target.length || !$placeholder.length) {
			return;
		}

		if (insertBefore) {
			$placeholder.insertBefore($target);
		} else {
			$placeholder.insertAfter($target);
		}
	};

	app.updateModalAttachmentData = function (details) {
		if (!state().currentModalAttachmentId || !details) {
			return;
		}

		var $card = $('.wpf-media-card[data-id="' + state().currentModalAttachmentId + '"]');
		var item = $card.data('attachment');
		if (!item) {
			return;
		}

		item.title = details.title || '';
		item.alt = details.alt || '';
		item.caption = details.caption || '';
		item.description = details.description || '';
		$card.data('attachment', item);
	};

	app.saveAttachmentField = function ($field) {
		var attachmentId = state().currentModalAttachmentId;
		var fieldName = $field.attr('data-field-name');
		var fieldValue = $field.val();
		var previousValue = $field.attr('data-last-value');

		if (!attachmentId || !fieldName || previousValue === String(fieldValue)) {
			return;
		}

		$field.attr('data-last-value', String(fieldValue));

		app.ajax('wpf_update_attachment_details', {
			attachmentId: attachmentId,
			fields: {
				[fieldName]: fieldValue
			}
		}).done(function (response) {
			if (response && response.success && response.data && response.data.details) {
				app.updateModalAttachmentData(response.data.details);
				return;
			}

			app.notify(wpfLibraryData.strings.unexpected, 'error');
		}).fail(function (xhr) {
			$field.attr('data-last-value', previousValue || '');
			app.notify(app.readError(xhr), 'error');
		});
	};

	app.handleCardSelection = function (targetId, event) {
		if (event.shiftKey) {
			app.selectRange(targetId);
			return;
		}

		if (event.ctrlKey || event.metaKey) {
			app.toggleSelection(targetId);
			return;
		}

		app.toggleSelection(targetId);
	};

	app.resetAttachmentState = function () {
		state().attachmentState.page = 1;
		state().attachmentState.total = 0;
		state().attachmentState.shown = 0;
		state().attachmentState.hasMore = false;
		state().attachmentState.totalPages = 0;
	};

	app.setUploadPanelState = function (isOpen) {
		if (!isOpen && state().isUploadingFiles) {
			return;
		}

		state().isUploadPanelOpen = !!isOpen;
		$('.wpf-upload-panel').prop('hidden', !state().isUploadPanelOpen);
		$('.wpf-upload-trigger').attr('aria-expanded', state().isUploadPanelOpen ? 'true' : 'false');

		if (!state().isUploadPanelOpen) {
			$('.wpf-upload-dropzone').removeClass('is-dragover');
			app.resetUploadProgress();
		}
	};

	app.toggleUploadPanel = function () {
		app.setUploadPanelState(!state().isUploadPanelOpen);
	};

	app.moveSelected = function () {
		var targetFolder = $('.wpf-target-folder-select').val();

		if (targetFolder === '') {
			app.notify(wpfLibraryData.strings.chooseTargetFolder, 'error');
			return;
		}

		if (!state().selectedIds.length) {
			app.notify(wpfLibraryData.strings.selectFiles, 'error');
			return;
		}

		app.moveAttachmentsToFolder(state().selectedIds, targetFolder);
	};

	app.uploadFiles = function (files) {
		if (!files || !files.length || state().isUploadingFiles) {
			return;
		}

		app.initializeUploadProgress(files);
		state().uploadRequestCompleted = false;

		var formData = new window.FormData();
		formData.append('action', 'wpf_upload_files');
		formData.append('nonce', wpfLibraryData.nonce);
		formData.append('folderId', state().currentFolder === null || typeof state().currentFolder === 'undefined' ? '' : state().currentFolder);

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

						app.updateUploadProgress(event.loaded);
					});
				}

				return xhr;
			}
		}).done(function (response) {
			if (response && response.success) {
				app.finalizeSuccessfulUpload();
				app.notify(response.data.message || wpfLibraryData.strings.uploadCompleted, 'success');
				window.setTimeout(function () {
					window.location.reload();
				}, 300);
				return;
			}

			app.failUploadProgress(wpfLibraryData.strings.unexpected);
			app.notify(wpfLibraryData.strings.unexpected, 'error');
		}).fail(function (xhr) {
			app.failUploadProgress(app.readError(xhr));
			app.notify(app.readError(xhr), 'error');
		});
	};

	app.deleteSelected = function () {
		if (!state().selectedIds.length) {
			return;
		}

		if (!window.confirm(wpfLibraryData.strings.confirmPermanentDelete)) {
			return;
		}

		app.ajax('wpf_delete_attachments', {
			attachmentIds: state().selectedIds
		}).done(function (response) {
			if (response && response.success) {
				app.setSelectionMode(false);
				app.fetchFolders(app.fetchAttachments);
				app.notify(response.data.message || wpfLibraryData.strings.attachmentsDeleted, 'success');
				return;
			}

			app.notify(wpfLibraryData.strings.unexpected, 'error');
		}).fail(function (xhr) {
			app.notify(app.readError(xhr), 'error');
		});
	};
}(jQuery, window));
