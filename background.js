const ICONS_ON = {
    '16': 'icons/on-16.png',
    '19': 'icons/on-19.png',
    '32': 'icons/on-32.png',
    '38': 'icons/on-38.png'
};
const ICONS_OFF = {
    '16': 'icons/off-16.png',
    '19': 'icons/off-19.png',
    '32': 'icons/off-32.png',
    '38': 'icons/off-38.png'
};

var ports = new Map;

/**
 * Fired when the user clicks the CommentBlocker icon
 * @param {Tab} tab
 * @returns {undefined}
 */
function onClick(tab) {
    /**
     * The port to the content script
     * @type Port
     */
    var port = ports.get(tab.id);
    
    // Tell the cs to toggle visibility of the comments
    port.postMessage({type: 'toggle'});
}

/**
 * Handle a count message
 * @param {Port} port
 * @param {Object} message
 * @returns {undefined}
 */
function onCount(port, message) {
    // If there's comments, figure out what to do with them
    if (message.comments > 0) {
		// Get the tab ID
		let tabId = port.sender.tab.id;
		
        // Show the button
        browser.pageAction.show(port.sender.tab.id);
        
        // Update the button icon
        browser.pageAction.setIcon({
            tabId: tabId,
            path: message.block ? ICONS_OFF : ICONS_ON
        });
		
		// Update the description
		let title = message.block ? 'showComments' : 'hideComments';
		browser.pageAction.setTitle({
			tabId: tabId,
			title: browser.i18n.getMessage(title)
		});
    }
    else
        // Hide the button if there ain't any comments
        browser.pageAction.hide(port.sender.tab.id);
}

/**
 * Handle a form message
 * @param {Port} port
 * @param {Object} message
 * @returns {undefined}
 */
function onForm(port, message) {
	/**
	 * ID of the notification
	 * @type String
	 */
	var id = 'commentblocker-form';
	
	/**
	 * The notification's options
	 * @type Object
	 */
	var options = {
		type: 'basic',
		message: browser.i18n.getMessage('formBlocked'),
		title: 'CommentBlocker',
		iconUrl: browser.extension.getURL('icons/off-38.png'),
		priority: 2,
		buttons: [{
			title: browser.i18n.getMessage('showComments')
		}]
	};
	
	try {
		// Show the notification with the button
		browser.notifications.create(id, options);
	}
	catch (exception) {
		// Delete the button if they are still unsupported by Firefox
		delete options.buttons;
		
		// Then show the notification without the button
		browser.notifications.create(id, options);
	}
}

// Listen to incoming port connections
browser.runtime.onConnect.addListener((port) => {
    // Add the port to the list
	ports.set(port.sender.tab.id, port);
    
    // Listen to closing port connections
    port.onDisconnect.addListener((port) => {
        // Remove the port from the list
        ports.delete(port.sender.tab.id);
    });
    
    // Listen to messages (this is where the magic happens)
    port.onMessage.addListener((message) => {
        switch (message.type) {
            case 'count':
                onCount(port, message);
                break;
            
            case 'debug': // TODO: ReMove
                console.debug(message);
                break;
				
            case 'form':
                onForm(port, message);
                break;
        }
    });
});

// Listen for content scripts' handshakes (must listen for them to succeed)
browser.runtime.onMessage.addListener(() => {});

// Shake hands with already active tabs, they connected before we could listen
browser.tabs.query({status: "complete"}).then((tabs) => {
    for (let tab of tabs)
        browser.tabs.sendMessage(
            tab.id,
            {type: "handshake"}
        ).catch(() => {});
});

// Listen to clicks on the buttons
browser.pageAction.onClicked.addListener(onClick);
browser.notifications.onButtonClicked.addListener(onClick);