var NODE_ELEMENT = 1;
var block = false;

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
	count: null,
	
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
	
	// Block comments if we should and aren't
	if (block && document.body && !document.body.hasAttribute('CommentBlocker'))
		hide();
	
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
				
				if (node.nodeType === NODE_ELEMENT)
					comments.query(node, true);
			}
			for (var i=0;i<record.removedNodes.length;++i) {
				var node = record.removedNodes.item(i);
				
				if (node.nodeType === NODE_ELEMENT)
					comments.query(node, false);
			}
		}
	});
	
	// If the amount of comments changed, tell the main UI
	if (oldCount !== comments.count)
		self.port.emit('comments', comments.count);
	
	// If new comments were found, tell the main UI
	if (block && (oldCount === null || oldCount === 0) && comments.count > 0)
		self.port.emit('blocked');
});

// Define an event for attaching the observer and then register it
var bodyserver = new MutationObserver(function() {
	if (document.body) {
		observer.observe(document.body, {
			attributeFilter: ['id', 'class', 'name'],
			attributes: true,
			childList: true,
			subtree: true
		});
		
		bodyserver.disconnect();
	}
});
bodyserver.observe(document.documentElement, { childList: true });

// Attach a safeguard to prevent forms with hidden elements from being sent
document.addEventListener('submit', function(event) {
	// Prevent forms when blocking is active and comments exist
	if (block === true && comments.count !== 0) {
		// Stop the event from propagating!
		event.stopPropagation();
		event.preventDefault();
		
		// Tell the guardian a submission was stopped
		self.port.emit('form');
	}
}, true);

// Fired when the UI wants to show comments
self.port.on('show', function() {
	block = false;
	
	if (document.body)
		show();
});

// Fired when the UI Wants to hide comments
self.port.on('hide', function() {
	block = true;
	
	if (document.body)
		hide();
});