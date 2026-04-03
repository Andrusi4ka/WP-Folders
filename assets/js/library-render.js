(function ($, window) {
	'use strict';

	var app = window.WPFLibraryApp;

	if (!app || typeof wpfLibraryData === 'undefined') {
		return;
	}

	function state() {
		return app.state;
	}

	app.getFolderIcon = function (isOpen) {
		return isOpen ? wpfLibraryData.icons.folderOpen : wpfLibraryData.icons.folderClose;
	};

	app.renderTargetFolderSelect = function () {
		var html = '<option value="">' + wpfLibraryData.strings.moveToFolder + '</option>' +
			'<option value="0">' + wpfLibraryData.strings.unassigned + '</option>';

		app.getFolderOptions(state().folderTree).forEach(function (option) {
			html += '<option value="' + option.id + '">' + app.escapeHtml(option.label) + '</option>';
		});

		$('.wpf-target-folder-select').html(html);
	};

	app.renderTree = function (tree, summary) {
		var $target = $('.wpf-folder-tree');
		var items = [
			{ id: null, name: wpfLibraryData.strings.allMedia, count: (summary || {}).allMedia || 0 },
			{ id: 0, name: wpfLibraryData.strings.unassigned, count: (summary || {}).unassigned || 0 }
		];

		state().folderTree = tree || [];
		state().folderSummary = {
			allMedia: (summary || {}).allMedia || 0,
			unassigned: (summary || {}).unassigned || 0
		};

		$target.empty();

		items.forEach(function (item) {
			var isCurrent = String(state().currentFolder) === String(item.id);
			var $li = $('<li class="wpf-folder-item wpf-folder-item--root"></li>');
			var $link = $('<button type="button" class="button-link wpf-folder-link"></button>');

			$link.attr('data-folder-id', item.id === null ? '' : item.id);
			$link.toggleClass('is-current', isCurrent);
			$link.append('<img class="wpf-folder-icon" src="' + app.getFolderIcon(isCurrent) + '" alt="">');
			$link.append('<span class="wpf-folder-label">' + app.escapeHtml(item.name + ' (' + item.count + ')') + '</span>');
			$li.append($('<div class="wpf-folder-row"></div>').append($link));
			$target.append($li);
		});

		if (!state().folderTree.length) {
			$target.append('<li class="wpf-empty">' + wpfLibraryData.strings.noFolders + '</li>');
			app.renderTargetFolderSelect();
			app.updateCurrentFolderLabel();
			return;
		}

		state().folderTree.forEach(function (node) {
			$target.append(app.renderNode(node));
		});

		app.renderTargetFolderSelect();
		app.updateCurrentFolderLabel();
		$('.wpf-library-size-value').text((summary || {}).totalSize || '0 B');
	};

	app.renderNode = function (node) {
		var isCurrent = Number(state().currentFolder) === Number(node.id);
		var $item = $('<li class="wpf-folder-item"></li>');
		var $row = $('<div class="wpf-folder-row"></div>');
		var $link = $('<button type="button" class="button-link wpf-folder-link"></button>');
		var $actions = $('<div class="wpf-folder-actions"></div>');

		$link.attr('data-folder-id', node.id);
		$link.toggleClass('is-current', isCurrent);
		$link.append('<img class="wpf-folder-icon" src="' + app.getFolderIcon(isCurrent) + '" alt="">');
		$link.append('<span class="wpf-folder-label">' + app.escapeHtml(node.name + ' (' + node.count + ')') + '</span>');

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
				$children.append(app.renderNode(child));
			});
			$item.append($children);
		}

		return $item;
	};

	app.renderAttachments = function (items) {
		var $grid = $('.wpf-library-grid');
		var renderer = app.getCurrentViewRenderer();
		$('.wpf-library-loading').prop('hidden', true).empty();
		$('.wpf-library-empty').prop('hidden', true);
		app.hideSortingHint();
		$grid.empty();

		if (!items.length) {
			$('.wpf-library-empty').prop('hidden', false);
			app.updateResultsUi();
			app.updateViewModeUi();
			return;
		}

		if (renderer && typeof renderer.render === 'function') {
			renderer.render($grid, items, {
				selectedIds: state().selectedIds.slice(),
				draggable: true,
				strings: wpfLibraryData.strings,
				sortBy: state().currentSortBy,
				sortOrder: state().currentSortOrder
			});
		}

		app.updateViewModeUi();
		app.updateResultsUi();
		app.updateSelectedCount();
		app.scheduleSortingHint();
	};

	app.clearDragState = function () {
		state().draggedAttachmentId = null;
		state().draggedAttachmentIds = [];
		$('.wpf-media-card').removeClass('is-dragging is-drop-target');
		$('.wpf-folder-link').removeClass('is-drop-target');
		if (state().$dragPlaceholder.length) {
			state().$dragPlaceholder.remove();
			state().$dragPlaceholder = $();
		}
		app.scheduleSortingHint();
	};

	app.ensureDragPlaceholder = function ($source) {
		if (state().$dragPlaceholder.length) {
			return state().$dragPlaceholder;
		}

		state().$dragPlaceholder = $('<div class="wpf-media-card wpf-media-card--placeholder" aria-hidden="true"></div>');
		if ($source && $source.length) {
			state().$dragPlaceholder.css('height', $source.outerHeight() + 'px');
		}

		return state().$dragPlaceholder;
	};

	app.renderLoadingState = function () {
		$('.wpf-library-empty').prop('hidden', true);
		app.hideSortingHint();
		app.clearDragState();
		$('.wpf-library-loading')
			.prop('hidden', false)
			.html('<div class="wpf-loading-state"><img src="' + app.escapeHtml(wpfLibraryData.loadingImage) + '" alt="' + app.escapeHtml(wpfLibraryData.strings.loadingMedia) + '"></div>');
	};

	app.renderMediaTypeFilter = function () {
		var html = '';
		[
			{ value: '', label: wpfLibraryData.strings.allMediaFiles },
			{ value: 'image', label: wpfLibraryData.strings.imagesFilter },
			{ value: 'audio', label: wpfLibraryData.strings.audioFilter },
			{ value: 'video', label: wpfLibraryData.strings.videoFilter },
			{ value: 'document', label: wpfLibraryData.strings.documentsFilter },
			{ value: 'spreadsheet', label: wpfLibraryData.strings.spreadsheetsFilter },
			{ value: 'archive', label: wpfLibraryData.strings.archivesFilter },
			{ value: 'unattached', label: wpfLibraryData.strings.unattachedFilter },
			{ value: 'mine', label: wpfLibraryData.strings.mineFilter }
		].forEach(function (option) {
			var selected = option.value === state().currentMediaType ? ' selected' : '';
			html += '<option value="' + app.escapeHtml(option.value) + '"' + selected + '>' + app.escapeHtml(option.label) + '</option>';
		});
		$('.wpf-media-type-filter').html(html);
	};

	app.renderMediaDateFilter = function (months) {
		var html = '<option value="">' + app.escapeHtml(wpfLibraryData.strings.allDates) + '</option>';

		(months || []).forEach(function (option) {
			var selected = option.value === state().currentMediaMonth ? ' selected' : '';
			html += '<option value="' + app.escapeHtml(option.value) + '"' + selected + '>' + app.escapeHtml(option.label) + '</option>';
		});

		$('.wpf-media-date-filter').html(html);
	};

	app.updateResultsUi = function () {
		var text = wpfLibraryData.strings.showingMediaItems
			.replace('%1$s', String(state().attachmentState.shown))
			.replace('%2$s', String(state().attachmentState.total));

		$('.wpf-library-results').text(text);
		$('.wpf-load-more')
			.text(wpfLibraryData.strings.loadMore)
			.prop('hidden', state().currentViewMode === 'list' || !state().attachmentState.hasMore);
		app.renderListPagination();
	};

	app.renderListPagination = function () {
		var $target = $('.wpf-library-list-actions__pagination');
		if (!$target.length) {
			return;
		}

		if (state().currentViewMode !== 'list') {
			$target.empty();
			return;
		}

		var isFirstPage = state().attachmentState.page <= 1;
		var isLastPage = state().attachmentState.page >= state().attachmentState.totalPages;
		var totalPages = Math.max(1, state().attachmentState.totalPages || 1);
		var html = '' +
			'<span class="wpf-list-pagination__count">' + app.escapeHtml(String(state().attachmentState.total) + ' ' + wpfLibraryData.strings.itemsLabel) + '</span>' +
			'<div class="wpf-list-pagination__controls">' +
				'<button type="button" class="button wpf-list-pagination__button" data-page-target="1"' + (isFirstPage ? ' disabled' : '') + '>&laquo;</button>' +
				'<button type="button" class="button wpf-list-pagination__button" data-page-target="' + String(Math.max(1, state().attachmentState.page - 1)) + '"' + (isFirstPage ? ' disabled' : '') + '>&lsaquo;</button>' +
				'<input type="number" class="wpf-list-pagination__input" min="1" max="' + String(totalPages) + '" value="' + String(state().attachmentState.page) + '">' +
				'<span class="wpf-list-pagination__total">' + app.escapeHtml(wpfLibraryData.strings.ofLabel + ' ' + totalPages) + '</span>' +
				'<button type="button" class="button wpf-list-pagination__button" data-page-target="' + String(Math.min(totalPages, state().attachmentState.page + 1)) + '"' + (isLastPage ? ' disabled' : '') + '>&rsaquo;</button>' +
				'<button type="button" class="button wpf-list-pagination__button" data-page-target="' + String(totalPages) + '"' + (isLastPage ? ' disabled' : '') + '>&raquo;</button>' +
			'</div>';

		$target.html(html);
	};
}(jQuery, window));
