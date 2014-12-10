var actionButton = require('sdk/ui/button/action').ActionButton;

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

exports.Button = button;