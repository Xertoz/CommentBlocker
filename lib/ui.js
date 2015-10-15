var _ = require('sdk/l10n').get;
var actionButton = require('sdk/ui/button/action').ActionButton;
var Components = require('chrome').components;

/**
 * The UI button which handles user interactions
 * @type ActionButton
 */
var button = actionButton({
	id: 'commentblocker-actionbutton',
	label: 'CommentBlocker',
	icon: {
		'16': './icon-16.png',
		'32': './icon-32.png',
		'64': './icon-64.png'
	},
	onClick: function() {
		button.callbacks.forEach(function(callback) {
			callback();
		});
	}
});

/**
 * A list of callbacks for user clicks
 * @type Array
 */
button.callbacks = [];

/**
 * Add a callback for the button
 * @param {function} callback
 * @returns {void}
 */
button.addCallback = function(callback) {
	button.callbacks.push(callback);
};

/**
 * Refresh the button within a tab
 * @param {Tab} tab Associated tab
 * @returns {void}
 */
button.refresh = function(tab, block, comments) {
	button.state(tab, {
		badge: comments > 0 ? comments : null,
		badgeColor: block ? 'red' : 'green'
	});
};

/**
 * Notify the user a form was blocked
 * @param {function} callback A callback to be called to show comments
 * @returns {void}
 */
function form(callback) {
	var nb = Components.classes["@mozilla.org/appshell/window-mediator;1"]
		.getService(Components.interfaces.nsIWindowMediator)
		.getMostRecentWindow('navigator:browser').gBrowser.getNotificationBox();
	var n = nb.getNotificationWithValue('commentblocker-dangerous-form');
	var label = _('There are hidden comments on the page. You must view them in order to submit the form!')
	if (n)
		n.label = label;
	else
		nb.appendNotification(
			label,
			'commentblocker-dangerous-form',
			'',
			nb.PRIORITY_WARNING_HIGH,
			[{
				label: _('Show comments'),
				accessKey: _('Show comments').substring(0, 1),
				popup: null,
				callback: function() {
					callback();
				}
			}]
		);
}

exports.Button = button;
exports.notifyForm = form;