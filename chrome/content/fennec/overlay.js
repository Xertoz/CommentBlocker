/**
 * CommentBlocker's Fennec overlay object for this window
 */
var cbOverlay = {
    /**
     * GUI API for Fennec
     */
    gui: {
        /**
         * Show a notification that we have stopped a submission
         */
        stopSubmission: function(doc) {
            var window = cbOverlay.gui.window;
            var nb = window.Browser.getNotificationBox();
            var n = nb.getNotificationWithValue('commentblocker-dangerous-form');
            if (n)
                n.label = CommentBlocker.strings.GetStringFromName('submissionDenied');
            else
                nb.appendNotification(
                    CommentBlocker.strings.GetStringFromName('submissionDenied'),
                    'commentblocker-dangerous-form',
                    'chrome://commentblocker/skin/status_enabled_16.png',
                    nb.PRIORITY_WARNING_HIGH,
                    [{
                        label: CommentBlocker.strings.GetStringFromName('show'),
                        accessKey: 'S',
                        popup: null,
                        callback: function() {
                            window.Browser.selectedBrowser.messageManager.sendAsyncMessage('CommentBlocker:ToggleComments');
                        }
                    }]
                );
        },

        /**
         * Toolbar button API
         */
        toolbar: {
            /**
             * The toolbar button itself
             */
            button: null,

            /**
             * Set as disabled
             */
            setDisabled: function() {
                this.button.image = 'chrome://CommentBlocker/skin/status_disabled.png';
                this.button.getElementById('cbToolbarButton').disabled = false;
            },

            /**
             * Set as enabled
             */
            setEnabled: function() {
                this.button.image = 'chrome://CommentBlocker/skin/status_enabled.png';
                this.button.disabled = false;
            },

            /**
             * Set as inactive
             */
            setInactive: function() {
                this.button.image = 'chrome://CommentBlocker/skin/status_inactive.png';
                this.button.disabled = true;
            }
        },

        /**
         * A reference to the app's window
         */
        window: null
    },

    /**
     * Various listeners
     */
    listeners: {
        unload: function() {
            // Remove the toolbar button
            cbOverlay.gui.toolbar.button.parentNode.removeChild(cbOverlay.gui.toolbar.button);

            // Remove the frame script and all the associated listeners
            var window = cbOverlay.gui.window;
            window.messageManager.removeDelayedFrameScript('chrome://CommentBlocker/content/fennec/frame.js');
            window.messageManager.removeMessageListener('CommentBlocker:ToggleButton', cbOverlay.listeners.toggleButton);
            window.window.document.getElementById('tabs').removeEventListener('TabSelect', cbOverlay.listeners.tabSelect, false);
            window.messageManager.removeMessageListener('CommentBlocker:StopSubmission', cbOverlay.listeners.stopSubmission);
            window.messageManager.removeMessageListener('CommentBlocker:Unload', cbOverlay.listeners.unload);
        },

        tabSelect: function(evt) {
            window.Browser.selectedBrowser.messageManager.sendAsyncMessage('CommentBlocker:TabSelected');
        },

        stopSubmission: function(aMessage) {
            cbOverlay.gui.stopSubmission(aMessage.json);
        },

        toggleButton: function(aMessage) {
            if (aMessage.json.comments) {
                if (aMessage.json.enabled)
                    cbOverlay.gui.toolbar.setEnabled();
                else
                    cbOverlay.gui.toolbar.setDisabled();
            }
            else
                cbOverlay.gui.toolbar.setInactive();
        }
    },

    /**
     * Load the addon into a window
     */
    load: function(window) {
        // Add the toolbar button
        var toolbar = window.document.getElementById('browser-controls');
        var forward = window.document.getElementById('tool-forward');
        var button = window.document.createElement('toolbarbutton');
        button.setAttribute('id', 'cbToolbarButton');
        button.setAttribute('image', 'chrome://CommentBlocker/skin/status_inactive.png');
        button.setAttribute('class', 'button-control');
        button.setAttribute('insert-after', 'tool-forward');
        button.setAttribute('disabled', 'true');
        button.addEventListener('command', function(event) {
            window.messageManager.sendAsyncMessage('CommentBlocker:ToggleComments');
        }, false);
        toolbar.insertBefore(button, forward.nextSibling);

        // Save a reference to the button for future usage
        cbOverlay.gui.toolbar.button = button;

        // Run code in the content processes
        window.messageManager.loadFrameScript('chrome://CommentBlocker/content/fennec/frame.js', true);

        // Listen for parsed messages from the children that tell us to update the UI
        window.messageManager.addMessageListener('CommentBlocker:ToggleButton', cbOverlay.listeners.toggleButton);

        // Make sure we have the right toolbar button when changing tabs
        window.window.document.getElementById('tabs').addEventListener('TabSelect', cbOverlay.listeners.tabSelect, false);

        // Listen for form submissions to be stopped
        window.messageManager.addMessageListener('CommentBlocker:StopSubmission', cbOverlay.listeners.stopSubmission);

        // Listen for addon unloading
        window.messageManager.addMessageListener('CommentBlocker:Unload', cbOverlay.listeners.unload);

        // Save a reference to the window
        cbOverlay.gui.window = window;
    },

    /**
     * Unload the window
     */
    unload: function(window) {
        // Tell the content process to unload
        window.messageManager.sendAsyncMessage('CommentBlocker:Unload');
    }
};