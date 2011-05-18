// Load CommentBlocker!
Components.utils.import('chrome://CommentBlocker/content/application.jsm');

/**
* CommentBlocker's GUI API for Firefox
*/
CommentBlocker.gui = {
    /**
    * Show a notification that we have stopped a submission
    */
    stopSubmission: function(doc) {
        var n;
        var nb = Browser.getNotificationBox();
        if (n = nb.getNotificationWithValue('commentblocker-dangerous-form'))
            n.label = message;
        else {
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
                        CommentBlocker.parser.show(doc);
                    }
                }]
            );
        }
    },
    
    /**
    * Toolbar button API
    */
    toolbar: {
        /**
        * Set as disabled
        */
        setDisabled: function() {
            document.getElementById('cbToolbarButton').image = 'chrome://CommentBlocker/skin/status_disabled.png';
            document.getElementById('cbToolbarButton').disabled = false;
        },
        
        /**
        * Set as enabled
        */
        setEnabled: function() {
            document.getElementById('cbToolbarButton').image = 'chrome://CommentBlocker/skin/status_enabled.png';
            document.getElementById('cbToolbarButton').disabled = false;
        },
        
        /**
        * Set as inactive
        */
        setInactive: function() {
            document.getElementById('cbToolbarButton').image = 'chrome://CommentBlocker/skin/status_inactive.png';
            document.getElementById('cbToolbarButton').disabled = true;
        }
    },
    
    /**
    * Update the UI interface
    */
    update: function(doc) {
        if (Browser.selectedBrowser.contentDocument != doc)
            return;
        
        // For failsafe, hide the icon if CommentBlocker is not initialized
        if (!CommentBlocker.parser.isInitialized(doc))
            return CommentBlocker.gui.toolbar.setInactive();
        
        // Find out wether this site is trusted / enabled
        var trusted = CommentBlocker.isTrusted(doc);
        var enabled = doc.CommentBlocker.enabled;
        var comments = CommentBlocker.parser.comments(doc);
        
        // Update icon image & text
        if (comments) {
            if (enabled)
                CommentBlocker.gui.toolbar.setEnabled();
            else
                CommentBlocker.gui.toolbar.setDisabled();
        }
        else
            CommentBlocker.gui.toolbar.setInactive();
    }
};

/**
* Manage options for the addon
*/
CommentBlocker.options = {
    addWebsite: function() {
        var hostname = prompt('URL:');
        
        if (!hostname)
            return;
        
        CommentBlocker.toggleListed(hostname);
        var e = document.createElement('listitem'); 
        e.setAttribute('label',hostname);
        document.getElementById('cbWebsites').appendChild(e);
    },
    
    deleteWebsite: function() {
        CommentBlocker.toggleListed(document.getElementById('cbWebsites').currentItem.getAttribute('label'));
        document.getElementById('cbWebsites').removeChild(document.getElementById('cbWebsites').currentItem);
    },
    
    loadWebsites: function() {
        for (var i=0;i<CommentBlocker.websites.length;i++) {
                var e = document.createElement('listitem'); 
                e.setAttribute('label',CommentBlocker.websites[i]);
                document.getElementById('cbWebsites').appendChild(e);
            }
    }
};

window.addEventListener('load',function() {
    // Handle everything else in child processes
    messageManager.loadFrameScript('chrome://CommentBlocker/content/fennec/frame.js',true);
    
    // Listen for parsed messages from the children
    messageManager.addMessageListener('CommentBlocker:DocumentParsed',function(aMessage) {
        if (aMessage.json.comments.length) {
            if (aMessage.json.enabled)
                CommentBlocker.gui.toolbar.setEnabled();
            else
                CommentBlocker.gui.toolbar.setDisabled();
        }
        else
            CommentBlocker.gui.toolbar.setInactive();
    });
    
    // Listen for toggling of comments
    messageManager.addMessageListener('CommentBlocker:ToggleComments',function(aMessage) {
        if (aMessage.json.comments.length) {
            if (aMessage.json.enabled)
                CommentBlocker.gui.toolbar.setEnabled();
            else
                CommentBlocker.gui.toolbar.setDisabled();
        }
        else
            CommentBlocker.gui.toolbar.setInactive();
    });
    
    // Make sure we have the right toolbar button when changing tabs
    document.getElementById('tabs').addEventListener('TabSelect',function(evt) {
        Browser.selectedBrowser.messageManager.sendAsyncMessage('CommentBlocker:TabSelected');
    },false);
    
    // Load websites into the preferences
    document.addEventListener('AddonOptionsLoad',function(evt) {
        if (evt.target.id == 'urn:mozilla:item:commentblocker@xertoz.se')
            CommentBlocker.options.loadWebsites();
    },false);
},false);