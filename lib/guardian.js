var prefs = require('sdk/simple-prefs').prefs;
var tabs = require('sdk/tabs');

/**
 * A guardian handles the UI <> Page communication
 * @param {Worker} worker
 * @param {function} comments A callback to be fired when comment changes are deteced
 * @param {function} form A callback to be fired whenever a submission is blocked
 * @returns {Guardian}
 */
var Guardian = function(worker, comments, form) {
	// Initiate the members
	var tab = worker.tab;
	var host = tab.url.split('/')[2];
	var userBlock = prefs['block.'+host];
	this.block = typeof(userBlock) === 'undefined' ? prefs['rules_listed_display'] : userBlock;
	this.callbackComments = comments;
	this.callbackForm = form;
	this.comments = null;
	this.hasComments = false;
	this.worker = worker;
	
	// Whenever the comment count changes, fire the event listener
	var that = this;
	worker.port.on('comments', function(worker) {
		that.onComments.call(that, worker);
	});
	
	// Notify users whenever forms are blocked
	worker.port.on('form', function(worker) {
		that.callbackForm.call(that, function() {
			// Display the comments if the user wants to
			Guardian.toggleComments(function() {});
		});
	});
	
	/**
	 * Add the guardian to the live list
	 * @returns {undefined}
	 */
	var addGuardian = function() {
		Guardian.addGuardian(tab, that);
	};
	
	/**
	 * Remove the guardian from the live list
	 * @returns {undefined}
	 */
	var deleteGuardian = function() {
		Guardian.deleteGuardian(tab, that);
	};
	
	// Monitor this guardian whenever its page is visible in the browser
	worker.on('pageshow', addGuardian);
	worker.on('pagehide', deleteGuardian);
	worker.on('detach', deleteGuardian);
	
	// Possibly block the comments
	if (this.block)
		this.hideComments();
};

/**
 * Hide comments hidden by the guardian
 * @returns {void}
 */
Guardian.prototype.hideComments = function() {
	this.showComments(false);
};

/**
 * Trigger this when the amount of comments changes on a page
 * @param {Number} comments
 * @returns {void}
 */
Guardian.prototype.onComments = function(comments) {
	var oldCount = this.comments;
	
	this.comments = comments;
	this.hasComments = comments > 0;

	if (oldCount !== comments)
		Guardian.onComments(this.worker, this.callbackComments);
};

/**
 * Toggle comment's visibility by the guardian
 * @param {Boolean} show
 * @returns {void}
 */
Guardian.prototype.showComments = function(show) {
	show = show !== false;
	
	this.block = !show;
	this.worker.port.emit(show ? 'show' : 'hide');
};

/**
 * Toggle the visibility of comments
 * @returns {Boolean}
 */
Guardian.prototype.toggleComments = function() {
	this.showComments(this.block);
	
	var host = this.worker.url.split('/')[2];
	prefs['block.'+host] = this.block;
	
	return this.block;
};

/**
 * Add a guardian to a tab
 * @param {Tab} tab
 * @param {Guardian} guardian
 * @returns {void}
 */
Guardian.addGuardian = function(tab, guardian) {
	Guardian.getTab(tab).set(guardian.worker, guardian);
};

/**
 * Add a new tab to monitor
 * @param {Tab} tab
 * @returns {Map}
 */
Guardian.addTab = function(tab) {
	var guardians = new Map;
	Guardian.tabs.set(tab, guardians);
	
	return guardians;
};

/**
 * Delete a guardian from a tab
 * @param {Tab} tab
 * @param {Guardian} guardian
 * @returns {void}
 */
Guardian.deleteGuardian = function(tab, guardian) {
	Guardian.getTab(tab).delete(guardian.worker);
};

/**
 * Get all guardians in a tab
 * @param {Tab} tab
 * @returns {Map}
 */
Guardian.getTab = function(tab) {
	var guardians = Guardian.tabs.get(tab);
	
	if (typeof(guardians) === 'undefined')
		guardians = Guardian.addTab(tab);
	
	return guardians;
};

/**
 * Set the guardians of a tab
 * @param {Tab} tab
 * @param {Map} guardians
 * @returns {void}
 */
Guardian.setTab = function(tab, guardians) {
	Guardian.tabs.set(tab, guardians);
};

/**
 * List all guardians for corresponding tab
 * @type Map
 */
Guardian.tabs = new Map;

/**
 * Toggle comment visibility on the current tab
 * @param {function} callback Callback function
 * @returns {void}
 */
Guardian.toggleComments = function(callback) {
	var tab = tabs.activeTab;
	var block = false;
	var comments = 0;
	
	this.getTab(tab).forEach(function(guardian) {
		guardian.toggleComments();
		block |= guardian.block;
		comments += guardian.comments;
	});
	
	callback(tab, block, comments);
};

/**
 * Fired when a worker has an updated number of comments
 * @param {Worker} worker
 * @param {function} callback
 * @returns {void}
 */
Guardian.onComments = function(worker, callback) {
	var block = false;
	var comments = 0;
	
	this.getTab(worker.tab).forEach(function(worker) {
		block |= worker.block;
		comments += worker.comments;
	});
	
	callback(worker.tab, block, comments);
};

exports.Guardian = Guardian;