var guardian = require('./guardian').Guardian;
var pageMod = require('sdk/page-mod').PageMod;
var prefs = require('sdk/simple-prefs').prefs;
var ui = require('./ui');
var button = ui.Button;
var self = require('sdk/self');
var tabs = require('sdk/tabs');
var url = require('sdk/self').data.url;

// Initiate and/or increase stats
(function() {
	/**
	 * Get the current UNIX time
	 * @returns {Number}
	 */
	var utime = function() {
		return Math.round((new Date).getTime()/1000);
	};
	
	// Log the date of the addon's first start
	if (typeof(prefs['stats_since']) !== 'number')
		prefs['stats_since'] = utime();

	// Log the number of times this addon has been started
	if (typeof(prefs['stats_startups'] !== 'number'))
		prefs['stats_startups'] = 0;
	++prefs['stats_startups']; // (increase it for this start)
	
	// Log the number of times a page had comments blocked
	if (typeof(prefs['stats_hits']) !== 'number')
		prefs['stats_hits'] = 0;
	
	// Show a donation request when the user has used the addon for some time
	if (prefs['stats_since']-utime() > 2*7*24*3600
			&& prefs['stats_startups'] > 10
			&& prefs['stats_hits'] > 100)
		tabs.open({
			url: self.data.url('donate.html'),
			inBackground: false,
			onReady: function(tab) {
				tab.attach({
					contentScriptFile: self.data.url('donate.js'),
					contentScriptOptions: {
						comments: prefs['stats_hits'],
						icon: self.data.url('icon-64.png')
					}
				});
			}
		});
})();

// Whenever the user clicks the icon, toggle comment visibility
button.addCallback(function() {
	guardian.toggleComments(button.refresh);
});

// Attach our content script to all documents upon their creation
pageMod({
	include: '*',
	contentScriptFile: url('worker.js'),
	contentScriptWhen: 'start',
	contentStyleFile: url('worker.css'),
	onAttach: function(worker) {
		worker.port.on('html', function() {
			new guardian(worker, button.refresh, ui.notifyForm);
		});
	}
});