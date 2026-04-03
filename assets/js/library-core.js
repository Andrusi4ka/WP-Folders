(function ($, window) {
	'use strict';

	if (typeof wpfLibraryData === 'undefined') {
		return;
	}

	var app = window.WPFLibraryApp = window.WPFLibraryApp || {};
	var toastTimer = null;

	function normalizePerPage(value) {
		value = Number(value) || 20;

		if ([20, 50, 100].indexOf(value) === -1) {
			return 20;
		}

		return value;
	}

	app.state = {
		currentFolder: wpfLibraryData.currentFolder,
		folderTree: [],
		folderSummary: {
			allMedia: 0,
			unassigned: 0
		},
		currentMediaType: '',
		currentMediaMonth: '',
		currentSortBy: '',
		currentSortOrder: '',
		currentViewMode: window.localStorage && window.localStorage.getItem('wpfLibraryViewMode') === 'list' ? 'list' : 'grid',
		currentAttachments: [],
		selectedIds: [],
		searchTimer: null,
		attachmentState: {
			page: 1,
			perPage: normalizePerPage(wpfLibraryData.defaultPerPage),
			total: 0,
			shown: 0,
			hasMore: false,
			totalPages: 0
		},
		isUploadPanelOpen: false,
		isSelectionMode: false,
		lastSelectedId: null,
		isUploadingFiles: false,
		uploadProgressItems: [],
		uploadRequestCompleted: false,
		currentModalAttachmentId: null,
		draggedAttachmentId: null,
		draggedAttachmentIds: [],
		$dragPlaceholder: $(),
		sortingHintTimer: null,
		sortingHintPosition: { x: 0, y: 0 },
		isCursorInsideGrid: false
	};

	app.normalizePerPage = normalizePerPage;

	app.ajax = function (action, data) {
		return $.post(wpfLibraryData.ajaxUrl, $.extend({
			action: action,
			nonce: wpfLibraryData.nonce
		}, data || {}));
	};

	app.notify = function (message, type) {
		var cls = type === 'error' ? 'notice notice-error' : 'notice notice-success';
		var $notice = $('<div class="' + cls + ' is-dismissible"><p></p></div>');
		$notice.find('p').text(message);
		$('.wrap h1').first().after($notice);
		setTimeout(function () {
			$notice.fadeOut(200, function () {
				$notice.remove();
			});
		}, 3000);
	};

	app.showToast = function (message, type) {
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
	};

	app.escapeHtml = function (value) {
		return $('<div>').text(value || '').html();
	};

	app.fallbackCopyText = function (text) {
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
	};

	app.copyText = function (text) {
		if (navigator.clipboard && window.isSecureContext) {
			return navigator.clipboard.writeText(text);
		}

		return app.fallbackCopyText(text)
			? Promise.resolve()
			: Promise.reject(new Error('copy-failed'));
	};

	app.formatBytes = function (bytes) {
		var value = Number(bytes) || 0;
		var units = ['B', 'KB', 'MB', 'GB', 'TB'];
		var unitIndex = 0;

		while (value >= 1024 && unitIndex < units.length - 1) {
			value = value / 1024;
			unitIndex += 1;
		}

		return (unitIndex === 0 ? Math.round(value) : value.toFixed(value >= 100 ? 0 : 1)) + ' ' + units[unitIndex];
	};

	app.getUploadStatusText = function (loadedBytes, totalBytes) {
		return (wpfLibraryData.strings.uploadTransferStatus || 'Transferring %1$s of %2$s')
			.replace('%1$s', app.formatBytes(loadedBytes))
			.replace('%2$s', app.formatBytes(totalBytes));
	};

	app.readError = function (xhr) {
		return xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message
			? xhr.responseJSON.data.message
			: wpfLibraryData.strings.unexpected;
	};

	app.getDefaultSortOrder = function (sortBy) {
		return sortBy === 'date' || sortBy === 'comments' ? 'DESC' : 'ASC';
	};
}(jQuery, window));
