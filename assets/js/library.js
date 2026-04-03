(function ($, window) {
	'use strict';

	var app = window.WPFLibraryApp;

	if (!app || typeof app.init !== 'function') {
		return;
	}

	$(function () {
		app.init();
	});
}(jQuery, window));
