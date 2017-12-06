const C_BLOCK_DEFAULT = 'rules_listed_display';
const C_BLOCK_HOST = 'block.'+window.location.host.toString();

var config = browser.storage.local;

var block;

/**
 * Handle all port communication
 * @type Object
 */
var port = {
	/**
	 * The actual port to the background script
	 * @type Port
	 */
	bg: undefined,

	/**
	 * Connect the the background script
	 * @returns {undefined}
	 */
	connect: function() {
		// Connect
		port.bg = browser.runtime.connect();

		// Listen for messages
		port.bg.onMessage.addListener(port.listener);

		// Send the current comment total
		port.tellCount();
	},

	/**
	* Handle a message from the background script
	* @param {Object} message
	* @returns {undefined}
	*/
	listener: function(message) {
		switch (message.type) {
			case 'toggle':
				port.onToggle();
				break;
		}
	},

	onToggle: function() {
		block = !block;
		config.set({[C_BLOCK_HOST]: block});
		block ? hide() : show();
		port.tellCount();
	},

	tellCount: function() {
		port.bg.postMessage({
			type: 'count',
			block: block,
			comments: comments.count
		});
	},

	tellForm: function() {
		port.bg.postMessage({
			type: 'form'
		});
	}
};

/**
 * Hide all comments on the page
 * @returns {undefined}
 */
function hide() {
	document.body.setAttribute('CommentBlocker', block);
}

/**
 * Show all comments on the page
 * @returns {undefined}
 */
function show() {
	document.body.removeAttribute('CommentBlocker');
	var event = document.createEvent('UIEvents');
	event.initUIEvent('resize', true, false, document.defaultView, 0);
	document.defaultView.dispatchEvent(event);
}

/**
 * The object which does the comment magic
 * @type type
 */
var comments = {
	/**
	 * Number of comments found on the page
	 * @type Number
	 */
	count: 0,

	/**
	 * Does this page have comments?
	 * @returns {Boolean}
	 */
	has: function() {
		return count > 0;
	},

	/**
	 * Is this attribute string a comment holder?
	 * @param {String} string
	 * @returns {Boolean}
	 */
	is: function(string) {
		return string.toLowerCase().indexOf('comment') > -1 || string === 'disqus_thread';
	},

	/**
	 * Does an attribute change present comment changes?
	 * @param {String} newValue
	 * @param {String} oldValue
	 * @returns {undefined}
	 */
	parse: function(newValue, oldValue) {
		if (oldValue && this.is(oldValue))
				--comments.count;
		if (newValue && this.is(newValue))
				++comments.count;
	},

	/**
	 * Query DOM elements
	 * @param {Element} element
	 * @param {Boolean} added
	 * @returns {undefined}
	 */
	query: function(element, added) {
		var comments = element.querySelectorAll(
				'[id*="comment"], [id*="Comment"], [id*="COMMENT"], ' +
				'[class*="comment"], [class*="Comment"], [class*="COMMENT"], ' +
				'[name*="comment"], [name*="Comment"], [name*="COMMENT"], ' +
				'#disqus_thread'
		).length;

		this.count += added ? comments : -comments;
	}
};

/**
 * Monitor DOM mutations
 * @type MutationObserver
 */
var observer = new MutationObserver(function(records) {
	// Remember old count
	var oldCount = comments.count;

	// Loop through the mutations
	records.forEach(function(record) {
		// If an attribute changed, use the simple lookup
		if (record.type === 'attributes' && record.attributeName !== null) {
			var newValue = record.target.getAttribute(record.attributeName);
			comments.parse(newValue, record.target.oldValue);
		}
		// If an element changed, use the advanced lookup
		else if (record.type === 'childList') {
			for (var i=0;i<record.addedNodes.length;++i) {
				var node = record.addedNodes.item(i);

				if (node.nodeType === 1)
					comments.query(node, true);
			}
			for (var i=0;i<record.removedNodes.length;++i) {
				var node = record.removedNodes.item(i);

				if (node.nodeType === 1)
					comments.query(node, false);
			}
		}
	});

	// If the amount of comments changed, tell the main UI
	if (oldCount !== comments.count) {
		// Make sure to block if needed
		if (oldCount === 0)
			block ? hide() : show();

		port.tellCount();
	}
});

// We only care about HTML documents - don't do anything if it ain't one
if (document.contentType === 'text/html') {
	// Find out wether to block or not
	config.get([C_BLOCK_HOST, C_BLOCK_DEFAULT]).then((result) => {
		// Local rules always get written
		if (typeof(result[C_BLOCK_HOST]) !== 'undefined')
			block = result[C_BLOCK_HOST];
		// Default rules get written in lack of a local rule
		else if (typeof(result[C_BLOCK_DEFAULT]) !== 'undefined' &&
				typeof(block) === 'undefined')
			block = result[C_BLOCK_DEFAULT];
		
		// Block if we should
		block ? hide() : show();
	});

	// Observe the document body
	observer.observe(document.body, {
		attributeFilter: ['id', 'class', 'name'],
		attributes: true,
		childList: true,
		subtree: true
	});

	// Find any existing comments already
	comments.query(document.body, true);

	// Attach a safeguard to prevent forms with hidden elements from being sent
	document.addEventListener('submit', function(event) {
		// Prevent forms when blocking is active and comments exist
		if (block === true && comments.count !== 0) {
			// Stop the event from propagating!
			event.stopPropagation();
			event.preventDefault();

			// Tell the guardian a submission was stopped
			port.tellForm();
		}
	}, true);

	// Tell any background script that we're here! (otherwise, wait for it)
	browser.runtime.sendMessage({type: 'handshake'}).then(port.connect).catch(() => {
		var handshake = () => {
			// Connect to the background script
			port.connect();

			// Stop listening for this
			browser.runtime.onMessage.removeListener(handshake);
		};

		// Listen for the backup handshake procedure
		browser.runtime.onMessage.addListener(handshake);
	});
}