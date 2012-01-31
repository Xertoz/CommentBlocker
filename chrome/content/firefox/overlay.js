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
        * Show the location bar
        */
        showLocationBar: function(show) {
            if (CommentBlocker.settings.getBoolPref('interface_display_locationbar'))
                document.getElementById('cbLocationBar').hidden = !show;
            else
                document.getElementById('cbLocationBar').hidden = true;
        },
        
        /**
        * Show the preference window
        */
        showPreferences: function() {
            window.openDialog('chrome://CommentBlocker/content/options.xul','Preferences','chrome,titlebar,toolbar,centerscreen,modal');
        },
        
        /**
        * Show the status bar icon?
        */
        showStatusBar: function(show) {
            document.getElementById('cbStatusBar').hidden = !show;
        },
        
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
        },
        
        /**
        * Update the UI interface
        */
        update: function(doc) {
            if (doc != gBrowser.contentDocument)
                return;
            
            // Find out wether this site is trusted / enabled
            var trusted = CommentBlocker.isTrusted(gBrowser.contentDocument);
            var enabled = gBrowser.contentDocument.CommentBlocker.enabled;
            var comments = CommentBlocker.parser.hasComments(gBrowser.contentDocument);
            
            // If there are no comments on this page, do not show the icon
            cbOverlay.gui.showLocationBar(comments);
            
            // Update icon image & text
            if (comments) {
                document.getElementById('cbLocationBar').src = enabled ? 'chrome://CommentBlocker/skin/status_enabled_16.png' : 'chrome://CommentBlocker/skin/status_disabled_16.png';
                document.getElementById('cbStatusBarImage').src = enabled ? 'chrome://CommentBlocker/skin/status_enabled_16.png' : 'chrome://CommentBlocker/skin/status_disabled_16.png';
                document.getElementById('cbLocationBar').tooltipText = (enabled ? CommentBlocker.strings.GetStringFromName('enabled') : CommentBlocker.strings.GetStringFromName('disabled'));
                document.getElementById('cbStatusBarImage').tooltipText = (enabled ? CommentBlocker.strings.GetStringFromName('enabled') : CommentBlocker.strings.GetStringFromName('disabled'));
            }
            else {
                document.getElementById('cbStatusBarImage').src = 'chrome://CommentBlocker/skin/status_inactive_16.png';
                document.getElementById('cbStatusBarImage').tooltipText = CommentBlocker.strings.GetStringFromName('inactive');
            }
            
            // Enable CSS?
            cbOverlay.useCSS(enabled);
        }
    },
    
    /**
    * Listening API for Firefox
    */
    listener: {
        /**
        * Whenever the user switches to a new tab in the browser, update the status bar icon
        */
        onChangeTab: function(e) {
            cbOverlay.gui.update(gBrowser.contentDocument);
        },
        
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
                    cbOverlay.gui.showPreferences();
                break;
            }
            
            event.stopPropagation();
            event.preventDefault();
        },
        
        /**
        * Whenever a new location is fetched, initialize CommentBlocker into the document's DOM
        */
        onLocationChange: function(aBrowser) {
            CommentBlocker.parser.initDocument(aBrowser.contentDocument,cbOverlay);
        },
        
        /**
        * The main listener to interfere with static page loading before painted onto the screen
        */
        onStatusChange: function(aBrowser){
            cbOverlay.gui.update(aBrowser.contentDocument);
        }
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
    cbOverlay.gui.showStatusBar(CommentBlocker.settings.getBoolPref('interface_display_statusbar'));
    
    // Hook all our events to Firefox
    gBrowser.addTabsProgressListener(cbOverlay.listener);
    gBrowser.tabContainer.addEventListener('TabSelect',cbOverlay.listener.onChangeTab,false);
    document.getElementById('cbLocationBar').addEventListener('click',cbOverlay.listener.onClickIcon,false);
    document.getElementById('cbStatusBar').addEventListener('click',cbOverlay.listener.onClickIcon,false);
    
    // Initiate the stylesheet service etc
    cbOverlay.sss = Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Components.interfaces.nsIStyleSheetService);
    var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    cbOverlay.uri = ios.newURI("chrome://CommentBlocker/content/application.css", null, null);
},false);