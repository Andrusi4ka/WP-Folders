(function ($, window) {
	'use strict';

	window.WPFLibraryViews = window.WPFLibraryViews || {};

	function escapeHtml(value) {
		return $('<div>').text(value || '').html();
	}

	window.WPFLibraryViews.grid = {
		render: function ($container, items, state) {
			$container.empty().removeClass('is-list-view').addClass('is-grid-view');

			(items || []).forEach(function (item) {
				var $card = $('<article class="wpf-media-card"></article>');
				var isSelected = state.selectedIds.indexOf(Number(item.id)) !== -1;

				$card.attr('data-id', item.id);
				$card.attr('data-edit-url', item.editUrl || '');
				$card.attr('draggable', state.draggable ? 'true' : 'false');
				$card.data('attachment', item);
				$card.toggleClass('is-selected', isSelected);
				$card.append('<div class="wpf-media-thumb"><img src="' + escapeHtml(item.thumb) + '" alt=""><span class="wpf-media-check" aria-hidden="true">&#10003;</span></div>');
				$card.append('<div class="wpf-media-meta"><p>' + escapeHtml(item.filename || '') + '</p><button type="button" class="button-link wpf-copy-url" data-url="' + escapeHtml(item.url || '') + '">' + escapeHtml(state.strings.fileUrl) + '</button></div>');
				$container.append($card);
			});
		}
	};
}(jQuery, window));
