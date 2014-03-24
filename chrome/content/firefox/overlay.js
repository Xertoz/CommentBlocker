Components.utils.import('resource:///modules/CustomizableUI.jsm');

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
            var nb = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                .getService(Components.interfaces.nsIWindowMediator)
                .getMostRecentWindow('navigator:browser').gBrowser.getNotificationBox();
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
         * Listen for tab changes
         */
        onChangeTab: function(event) {
            cbOverlay.updateUI(event.target.ownerDocument.defaultView.gBrowser.contentDocument);
        },

        /**
        * Determine what to do & do it when the user clicks the status bar icon
        */
        onClickIcon: function(event) {
            var browserWindow = event.target.ownerDocument.defaultView;
            var contentDocument = browserWindow.content.document;
            
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
                    browserWindow.BrowserOpenAddonsMgr('addons://detail/'+encodeURIComponent('commentblocker@xertoz.se')+'/preferences');
                break;
            }

            cbOverlay.updateUI(contentDocument);
            
            event.stopPropagation();
            event.preventDefault();
        },
        
        /**
         * Handle document loads
         */
        onProgressChange: function(aBrowser, aWebProgress, aRequest) {
            if (!CommentBlocker.map.has(aBrowser.contentDocument) && aBrowser.contentDocument.body)
                CommentBlocker.parser.initDocument(aBrowser.contentDocument, cbOverlay);
        }
    },
    
    /**
    * Load the addon
    */
    load: function(window) {
        var document = window.document;
        
        // Create the URL bar button
        var urlBar = document.getElementById('urlbar-icons');
        if (urlBar) {
            var urlBarImage = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul','image');
            urlBarImage.addEventListener('click',cbOverlay.listener.onClickIcon,false);
            urlBarImage.setAttribute('id','cbLocationBar');
            urlBarImage.setAttribute('src','chrome://CommentBlocker/skin/status_inactive_16.png');
            urlBarImage.setAttribute('mousethrough','never');
            urlBarImage.setAttribute('width','16');
            urlBarImage.setAttribute('height','16');
            urlBar.appendChild(urlBarImage);
        }

        // Create the addon bar button
        CustomizableUI.createWidget({
            id : 'CommentBlocker',
            defaultArea : CustomizableUI.AREA_NAVBAR,
            label : 'CommentBlocker',
            tooltiptext: CommentBlocker.strings.GetStringFromName('inactive'),
            type: 'button',
            image: 'chrome://CommentBlocker/skin/status_inactive_16.png',
            onClick : cbOverlay.listener.onClickIcon
        });

        // Initate any open documents
        for (var i=0;i<window.gBrowser.browsers.length;++i) {
            var contentDocument = window.gBrowser.getBrowserAtIndex(i).contentDocument;

            if (contentDocument.body)
                CommentBlocker.parser.initDocument(contentDocument, cbOverlay);
        }

        // Listen for tab switches
        window.gBrowser.tabContainer.addEventListener('TabSelect', cbOverlay.listener.onChangeTab, false);

        cbOverlay.useCSS(true);

        window.gBrowser.addTabsProgressListener(cbOverlay.listener);
    },

    /**
     * Observe DOM mutation events
     */
    observe: function(objects, instance) {
        // Update any UI elements
        cbOverlay.updateUI(objects[0].target.ownerDocument);
    },
    
    /**
    * The stylesheet service
    */
    sss: Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Components.interfaces.nsIStyleSheetService),
    
    /**
    * The URI to the stylesheet
    */
    uri: Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newURI("chrome://CommentBlocker/content/application.css", null, null),
    
    /**
    * Unload the addon
    */
    unload: function(window) {
        var document = window.document;
        
        cbOverlay.useCSS(false);

         window.gBrowser.tabContainer.removeEventListener('TabSelect', cbOverlay.listener.onChangeTab, false);

        for (var i=0;i<window.gBrowser.browsers.length;++i) {
            var contentDocument = window.gBrowser.getBrowserAtIndex(i).contentDocument;

            if (CommentBlocker.map.has(contentDocument))
                CommentBlocker.parser.uninitDocument(contentDocument);
        }

        CustomizableUI.destroyWidget('CommentBlocker');

        var cbLocationBar = document.getElementById('cbLocationBar');
        if (cbLocationBar)
            cbLocationBar.parentNode.removeChild(cbLocationBar);

        window.gBrowser.removeTabsProgressListener(cbOverlay.listener);
    },

    /**
     * Request an update of the UI
     * The UI will only be updated if it is deemed necessary
     * @param contentDocument Source document causing the update to be requested
     */
    updateUI: function(contentDocument) {
        // Find the affected chrome window
        var windows = Services.wm.getEnumerator('navigator:browser');
        while (windows.hasMoreElements()) {
            var window = windows.getNext();
            var browser = window.gBrowser.getBrowserForDocument(contentDocument);

            if (browser) {
                // Do nothing if the document ain't visible
                if (window.gBrowser.contentDocument != contentDocument)
                    return;

                var document = window.document;
            }
        }
        var cbLocationBar = document.getElementById('cbLocationBar');
        var widget = CustomizableUI.getWidget('CommentBlocker').instances[0].node;

        // Find out wether this site is trusted / enabled
        if (CommentBlocker.map.has(contentDocument)) {
            var state = CommentBlocker.map.get(contentDocument);
            var enabled = state.enabled;
            var comments = CommentBlocker.parser.hasComments(contentDocument.body);

            // If there are no comments on this page, do not show the icon
            if (cbLocationBar) {
                if (CommentBlocker.settings.getBoolPref('interface_display_locationbar'))
                    cbLocationBar.hidden = !comments;
                else
                    cbLocationBar.hidden = true;
            }

            // Update icon image & text
            if (comments) {
                var icon = enabled ? 'chrome://CommentBlocker/skin/status_enabled_16.png' : 'chrome://CommentBlocker/skin/status_disabled_16.png';
                var tooltip = enabled ? CommentBlocker.strings.GetStringFromName('enabled') : CommentBlocker.strings.GetStringFromName('disabled');

                if (cbLocationBar) {
                    cbLocationBar.src = icon;
                    cbLocationBar.tooltipText = tooltip;
                }
                widget.image = icon;
                widget.tooltipText = tooltip;
            }
        }
        else {
            if (cbLocationBar)
                cbLocationBar.hidden = true;
            widget.image = 'chrome://CommentBlocker/skin/status_inactive_16.png';
            widget.tooltipText = CommentBlocker.strings.GetStringFromName('inactive');
        }
    },
    
    /**
    * Use the stylesheet?
    */
    useCSS: function(use) {
        if (use && !cbOverlay.sss.sheetRegistered(cbOverlay.uri, cbOverlay.sss.AGENT_SHEET)) {
            cbOverlay.sss.loadAndRegisterSheet(cbOverlay.uri, cbOverlay.sss.AGENT_SHEET);
            cbOverlay.sss.loadAndRegisterSheet(cbOverlay.WIDGET_CSS, cbOverlay.sss.AGENT_SHEET);
        }
        else if (!use && cbOverlay.sss.sheetRegistered(cbOverlay.uri, cbOverlay.sss.AGENT_SHEET)) {
            cbOverlay.sss.unregisterSheet(cbOverlay.uri, cbOverlay.sss.AGENT_SHEET);
            cbOverlay.sss.unregisterSheet(cbOverlay.WIDGET_CSS, cbOverlay.sss.AGENT_SHEET);
        }
    },

    /**
     * URI to the widget CSS
     */
    WIDGET_CSS: Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newURI("chrome://CommentBlocker/content/firefox/widget.css", null, null)
};