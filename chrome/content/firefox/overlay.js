/**
* CommentBlocker's Firefox overlay object for this window
*/
var cbOverlay = {
    /**
    * GUI API for Firefox
    */
    gui: {
        /**
        * Show a notification that we have stopped a submission
        */
        stopSubmission: function(doc) {
            var nb = gBrowser.getNotificationBox();
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
                            CommentBlocker.parser.show(doc);
                        }
                    }]
                );
        }
    },
    
    /**
    * Listening API for Firefox
    */
    listener: {
        /**
        * Determine what to do & do it when the user clicks the status bar icon
        */
        onClickIcon: function(event) {
            var contentDocument = event.target.ownerDocument.defaultView.content.document;
            
            switch (event.button) {
                case 0: // Left click
                    var todo = CommentBlocker.settings.getIntPref('interface_behaviour_leftclick');
                break;
                
                case 1: // Scroll click
                    var todo = CommentBlocker.settings.getIntPref('interface_behaviour_scrollclick');
                break;
                
                case 2: // Right click
                    var todo = CommentBlocker.settings.getIntPref('interface_behaviour_rightclick');
                break;
                
                default:
                    return;
            }
            
            switch (todo) {
                case 1:
                    CommentBlocker.toggleComments(contentDocument);
                break;
                
                case 2:
                    CommentBlocker.toggleListed(contentDocument.location.hostname);
                    if (CommentBlocker.isTrusted(contentDocument.location.hostname))
                        CommentBlocker.parser.show(contentDocument);
                    else
                        CommentBlocker.parser.hide(contentDocument);
                break;
                
                case 3:
                    window.openDialog('chrome://CommentBlocker/content/options.xul','Preferences','chrome,titlebar,toolbar,centerscreen,modal');
                break;
            }
            
            event.stopPropagation();
            event.preventDefault();
        },
        
        /**
        * Handle repaints in our own little way
        */
        onRepaint: function(evt) {
            // Make sure we are the only worker
            if (cbOverlay.listener.onRepaintWorking)
                return;
            cbOverlay.listener.onRepaintWorking = true;
            
            // We need these variables while working
            var document = evt.target.document;
            var contentDocument = evt.target.content.document;
            
            var cbLocationBar = document.getElementById('cbLocationBar');
            var cbStatusBarImage = document.getElementById('cbStatusBarImage');
            
            // Initialize the document if required
            if (!contentDocument.CommentBlocker)
                CommentBlocker.parser.initDocument(contentDocument,cbOverlay);
            
            // Find out wether this site is trusted / enabled
            var enabled = contentDocument.CommentBlocker.enabled;
            var comments = CommentBlocker.parser.hasComments(contentDocument);
            
            // If there are no comments on this page, do not show the icon
            if (cbLocationBar) {
                if (CommentBlocker.settings.getBoolPref('interface_display_locationbar'))
                    cbLocationBar.hidden = !comments;
                else
                    cbLocationBar.hidden = true;
            }
            
            // Show the addon bar?
            if (cbStatusBarImage && CommentBlocker.settings.getBoolPref('interface_display_statusbar'))
                cbStatusBarImage.hidden = false;
            
            // Update icon image & text
            if (comments) {
                var icon = enabled ? 'chrome://CommentBlocker/skin/status_enabled_16.png' : 'chrome://CommentBlocker/skin/status_disabled_16.png';
                var tooltip = enabled ? CommentBlocker.strings.GetStringFromName('enabled') : CommentBlocker.strings.GetStringFromName('disabled');
                
                if (cbLocationBar) {
                    cbLocationBar.src = icon;
                    cbLocationBar.tooltipText = tooltip;
                }
                
                if (cbStatusBarImage) {
                    cbStatusBarImage.src = icon;
                    cbStatusBarImage.tooltipText = tooltip;
                }
            }
            else if (cbStatusBarImage) {
                cbStatusBarImage.src = 'chrome://CommentBlocker/skin/status_inactive_16.png';
                cbStatusBarImage.tooltipText = CommentBlocker.strings.GetStringFromName('inactive');
            }
            
            // Enable CSS?
            cbOverlay.useCSS(enabled);
            
            // Release the lock
            cbOverlay.listener.onRepaintWorking = false;
        },
        
        /**
        * Flag to prevent infinite loops
        */
        onRepaintWorking: false
    },
    
    /**
    * Load the addon
    */
    load: function(window) {
        var document = window.document;
        
        // Create the status bar button
        var statusBar = document.getElementById('status-bar');
        if (statusBar) {
            var statusBarPanel = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul','statusbarpanel');
            statusBarPanel.setAttribute('id','cbStatusBar');
            statusBarPanel.setAttribute('role','button');
            statusBarPanel.setAttribute('hidden','false');
            
            var statusBarImage = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul','image');
            statusBarImage.setAttribute('id','cbStatusBarImage');
            statusBarImage.setAttribute('src','chrome://CommentBlocker/skin/status_inactive_16.png');
            statusBarImage.setAttribute('mousethrough','never');
            statusBarImage.setAttribute('width','16');
            statusBarImage.setAttribute('height','16');
            statusBarPanel.appendChild(statusBarImage);
            
            statusBar.appendChild(statusBarPanel);
        }
        
        // Create the URL bar button
        var urlBar = document.getElementById('urlbar-icons');
        if (urlBar) {
            var urlBarImage = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul','image');
            statusBarImage.setAttribute('id','cbLocationBar');
            statusBarImage.setAttribute('src','chrome://CommentBlocker/skin/status_inactive_16.png');
            statusBarImage.setAttribute('mousethrough','never');
            statusBarImage.setAttribute('width','16');
            statusBarImage.setAttribute('height','16');
            urlBar.appendChild(statusBarImage);
        }
        
        // Hook all our events to Firefox
        if (statusBarImage)
            statusBarImage.addEventListener('click',cbOverlay.listener.onClickIcon,false);
        if (statusBarPanel)
            statusBarPanel.addEventListener('click',cbOverlay.listener.onClickIcon,false);

        // Update the GUI if necessary whenever a repaint is detected
        window.addEventListener('MozAfterPaint',cbOverlay.listener.onRepaint,true);
    },
    
    /**
    * The stylesheet service
    */
    sss: null,
    
    /**
    * The URI to the stylesheet
    */
    uri: null,
    
    /**
    * Unload the addon
    */
    unload: function(window) {
        var document = window.document;
        
        cbOverlay.useCSS(false);
        
        var cbStatusBar = document.getElementById('cbStatusBar');
        if (cbStatusBar)
            cbStatusBar.parentNode.removeChild(cbStatusBar);
        
        var cbLocationBar = document.getElementById('cbLocationBar');
        if (cbLocationBar)
            cbLocationBar.parentNode.removeChild(cbLocationBar);
        
        window.removeEventListener('MozAfterPaint',cbOverlay.listener.onRepaint,true);
    },
    
    /**
    * Use the stylesheet?
    */
    useCSS: function(use) {
        if (use && !cbOverlay.sss.sheetRegistered(cbOverlay.uri, cbOverlay.sss.AGENT_SHEET))
            cbOverlay.sss.loadAndRegisterSheet(cbOverlay.uri, cbOverlay.sss.AGENT_SHEET);
        else if (!use && cbOverlay.sss.sheetRegistered(cbOverlay.uri, cbOverlay.sss.AGENT_SHEET))
            cbOverlay.sss.unregisterSheet(cbOverlay.uri, cbOverlay.sss.AGENT_SHEET);
    }
};

// Initiate the stylesheet service etc
(function() {
    cbOverlay.sss = Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Components.interfaces.nsIStyleSheetService);
    var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    cbOverlay.uri = ios.newURI("chrome://CommentBlocker/content/application.css", null, null);
})();