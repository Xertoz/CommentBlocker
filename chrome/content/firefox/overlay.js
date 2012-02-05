// Load CommentBlocker!
Components.utils.import('chrome://CommentBlocker/content/application.jsm');

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
            if (typeof(gBrowser.contentDocument.CommentBlocker) == 'undefined')
                return;
            
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
                    CommentBlocker.toggleComments(gBrowser.contentDocument);
                break;
                
                case 2:
                    CommentBlocker.toggleListed(gBrowser.contentDocument.location.hostname);
                    if (CommentBlocker.isTrusted(gBrowser.contentDocument.location.hostname))
                        CommentBlocker.parser.show(gBrowser.contentDocument);
                    else
                        CommentBlocker.parser.hide(gBrowser.contentDocument);
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
            
            // Initialize the document if required
            if (!gBrowser.contentDocument.CommentBlocker)
                CommentBlocker.parser.initDocument(gBrowser.contentDocument,cbOverlay);
            
            // Find out wether this site is trusted / enabled
            var enabled = gBrowser.contentDocument.CommentBlocker.enabled;
            var comments = CommentBlocker.parser.hasComments(gBrowser.contentDocument);
            
            // If there are no comments on this page, do not show the icon
            if (CommentBlocker.settings.getBoolPref('interface_display_locationbar'))
                document.getElementById('cbLocationBar').hidden = !comments;
            else
                document.getElementById('cbLocationBar').hidden = true;
            
            // Update icon image & text
            if (comments) {
                var icon = enabled ? 'chrome://CommentBlocker/skin/status_enabled_16.png' : 'chrome://CommentBlocker/skin/status_disabled_16.png';
                document.getElementById('cbLocationBar').src = icon;
                document.getElementById('cbStatusBarImage').src = icon;
                
                var tooltip = enabled ? CommentBlocker.strings.GetStringFromName('enabled') : CommentBlocker.strings.GetStringFromName('disabled');
                document.getElementById('cbLocationBar').tooltipText = tooltip;
                document.getElementById('cbStatusBarImage').tooltipText = tooltip;
            }
            else {
                document.getElementById('cbStatusBarImage').src = 'chrome://CommentBlocker/skin/status_inactive_16.png';
                document.getElementById('cbStatusBarImage').tooltipText = CommentBlocker.strings.GetStringFromName('inactive');
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
    * The stylesheet service
    */
    sss: null,
    
    /**
    * The URI to the stylesheet
    */
    uri: null,
    
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

// When finished loading...
window.addEventListener('load',function() {
    // Do we show the status bar icon?
    document.getElementById('cbStatusBar').hidden = !CommentBlocker.settings.getBoolPref('interface_display_statusbar');
    
    // Hook all our events to Firefox
    document.getElementById('cbLocationBar').addEventListener('click',cbOverlay.listener.onClickIcon,false);
    document.getElementById('cbStatusBar').addEventListener('click',cbOverlay.listener.onClickIcon,false);
    
    // Initiate the stylesheet service etc
    cbOverlay.sss = Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Components.interfaces.nsIStyleSheetService);
    var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    cbOverlay.uri = ios.newURI("chrome://CommentBlocker/content/application.css", null, null);
},false);

// Update the GUI if necessary whenever a repaint is detected
window.addEventListener('MozAfterPaint',cbOverlay.listener.onRepaint,false);
window.addEventListener('click',cbOverlay.listener.onRepaint,false);