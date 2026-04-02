(function ($, window) {
	'use strict';

	window.WPFLibraryViews = window.WPFLibraryViews || {};

	function escapeHtml(value) {
		return $('<div>').text(value || '').html();
	}

	function renderUploadedToCell(item, strings) {
		if (item.uploadedToUrl) {
			return '<a href="' + escapeHtml(item.uploadedToUrl) + '">' + escapeHtml(item.uploadedTo || '') + '</a>';
		}

		return '<span class="wpf-media-list-muted">' + escapeHtml(item.uploadedTo || strings.detachedLabel) + '</span>';
	}

	function renderCommentCount(item) {
		if (!item.commentCount) {
			return '&mdash;';
		}

		return String(item.commentCount);
	}

	function renderSortableHeader(label, sortBy, state, extraClass) {
		var isSorted = state.sortBy === sortBy;
		var sortOrder = isSorted ? state.sortOrder : '';
		var classes = 'manage-column ' + (extraClass || '') + ' wpf-sortable-header';

		if (isSorted) {
			classes += ' is-sorted is-' + String(sortOrder).toLowerCase();
		}

		return '' +
			'<th scope="col" class="' + classes + '">' +
				'<button type="button" class="wpf-sortable-column" data-sort-by="' + escapeHtml(sortBy) + '">' +
					'<span class="wpf-sortable-column__label">' + escapeHtml(label) + '</span>' +
					'<span class="wpf-sortable-column__indicators" aria-hidden="true">' +
						'<span class="wpf-sortable-column__indicator wpf-sortable-column__indicator--asc"></span>' +
						'<span class="wpf-sortable-column__indicator wpf-sortable-column__indicator--desc"></span>' +
					'</span>' +
				'</button>' +
			'</th>';
	}

	window.WPFLibraryViews.list = {
		render: function ($container, items, state) {
			var html = '' +
				'<table class="wp-list-table widefat fixed striped table-view-list wpf-media-table">' +
					'<thead>' +
						'<tr>' +
							'<td class="manage-column column-cb check-column wpf-col-checkbox"><input type="checkbox" class="wpf-media-list-select-all"></td>' +
							renderSortableHeader(state.strings.fileColumn, 'file', state, 'column-primary wpf-col-file') +
							renderSortableHeader(state.strings.authorColumn, 'author', state, 'wpf-col-author') +
							renderSortableHeader(state.strings.uploadedToColumn, 'uploadedTo', state, 'wpf-col-uploaded-to') +
							renderSortableHeader(state.strings.commentsColumn, 'comments', state, 'wpf-col-comments') +
							renderSortableHeader(state.strings.dateLabel, 'date', state, 'wpf-col-date') +
						'</tr>' +
					'</thead>' +
					'<tbody></tbody>' +
				'</table>';

			$container.empty().removeClass('is-grid-view').addClass('is-list-view').html(html);

			var $tbody = $container.find('tbody');
			(items || []).forEach(function (item) {
				var isSelected = state.selectedIds.indexOf(Number(item.id)) !== -1;
				var $row = $('<tr class="wpf-media-card wpf-media-row"></tr>');

				$row.attr('data-id', item.id);
				$row.attr('data-edit-url', item.editUrl || '');
				$row.attr('draggable', 'false');
				$row.data('attachment', item);
				$row.toggleClass('is-selected', isSelected);

				$row.append(
					'<th scope="row" class="check-column wpf-col-checkbox">' +
						'<input type="checkbox" class="wpf-media-row-checkbox" value="' + Number(item.id) + '"' + (isSelected ? ' checked' : '') + '>' +
					'</th>'
				);

				$row.append(
					'<td class="column-primary wpf-col-file">' +
						'<div class="wpf-media-row-file">' +
							'<div class="wpf-media-row-thumb"><img src="' + escapeHtml(item.thumb || '') + '" alt=""></div>' +
							'<div class="wpf-media-row-main">' +
								'<button type="button" class="button-link wpf-media-row-open">' + escapeHtml(item.title || item.filename || '') + '</button>' +
								'<div class="wpf-media-row-filename">' + escapeHtml(item.filename || '') + '</div>' +
								'<div class="wpf-media-row-actions">' +
									'<a href="' + escapeHtml(item.editUrl || '') + '">' + escapeHtml(state.strings.editLabel) + '</a>' +
									' | <button type="button" class="button-link-delete wpf-media-row-delete" data-attachment-id="' + Number(item.id) + '">' + escapeHtml(state.strings.deletePermanently) + '</button>' +
									' | <a href="' + escapeHtml(item.url || '') + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(state.strings.viewLabel) + '</a>' +
									' | <button type="button" class="button-link wpf-copy-url" data-url="' + escapeHtml(item.url || '') + '">' + escapeHtml(state.strings.fileUrl) + '</button>' +
									' | <a href="' + escapeHtml(item.url || '') + '" download="' + escapeHtml(item.filename || '') + '">' + escapeHtml(state.strings.downloadFileLabel) + '</a>' +
								'</div>' +
							'</div>' +
						'</div>' +
					'</td>'
				);

				$row.append('<td class="wpf-col-author">' + (item.uploadedByUrl ? '<a href="' + escapeHtml(item.uploadedByUrl) + '">' + escapeHtml(item.uploadedBy || '') + '</a>' : escapeHtml(item.uploadedBy || '')) + '</td>');
				$row.append('<td class="wpf-col-uploaded-to">' + renderUploadedToCell(item, state.strings) + '</td>');
				$row.append('<td class="wpf-col-comments">' + renderCommentCount(item) + '</td>');
				$row.append('<td class="wpf-col-date">' + escapeHtml(item.dateShort || item.date || '') + '</td>');

				$tbody.append($row);
			});

			$container.find('.wpf-media-list-select-all').prop('checked', items.length > 0 && items.every(function (item) {
				return state.selectedIds.indexOf(Number(item.id)) !== -1;
			}));
		}
	};
}(jQuery, window));
