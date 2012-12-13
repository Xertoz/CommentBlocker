// Load CommentBlocker!
Components.utils.import('resource://gre/modules/Services.jsm');
Services.scriptloader.loadSubScript('chrome://CommentBlocker/content/application.js', this);

var callback = {
    gui: {
        stopSubmission: function(doc) {
            sendAsyncMessage('CommentBlocker:StopSubmission',doc);
        },

        update: function(doc) {
            if (content.document == doc)
                sendAsyncMessage('CommentBlocker:ToggleComments',doc.CommentBlocker);
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
        if (use && !callback.sss.sheetRegistered(callback.uri, callback.sss.AGENT_SHEET))
            callback.sss.loadAndRegisterSheet(callback.uri, callback.sss.AGENT_SHEET);
        else if (!use && callback.sss.sheetRegistered(callback.uri, callback.sss.AGENT_SHEET))
            callback.sss.unregisterSheet(callback.uri, callback.sss.AGENT_SHEET);
    }
};

var listeners = {
    load: function(evt) {
        CommentBlocker.parser.initDocument(evt.target,callback);

        if (content.document == evt.target) {
            callback.useCSS(evt.target.CommentBlocker.enabled);

            evt.target.CommentBlocker.comments = CommentBlocker.parser.hasComments(content.document.body);

            sendAsyncMessage('CommentBlocker:ToggleButton',evt.target.CommentBlocker);
        }
    },

    tabSelect: function() {
        if (typeof(content.document.CommentBlocker) != 'undefined')
            sendAsyncMessage('CommentBlocker:ToggleButton',content.document.CommentBlocker);
    },

    toggleComments: function(aMessage) {
        CommentBlocker.toggleComments(content.document);

        sendAsyncMessage('CommentBlocker:ToggleButton',content.document.CommentBlocker);
    },

    unload: function(aMessage) {
        callback.useCSS(false);

        removeEventListener('load', listeners.load, true);

        removeMessageListener('CommentBlocker:ToggleComments', listeners.toggleComments);
        removeMessageListener('CommentBlocker:TabSelected', listeners.tabSelect);
        removeMessageListener('CommentBlocker:Unload', listeners.unload);

        sendAsyncMessage('CommentBlocker:Unload');
    }
};

// Whenever a page is loaded - parse it
addEventListener('load', listeners.load, true);

// When the toggle request is issued
addMessageListener('CommentBlocker:ToggleComments', listeners.toggleComments);

// When the tab is switched
addMessageListener('CommentBlocker:TabSelected', listeners.tabSelect);

// Listen for when to unload
addMessageListener('CommentBlocker:Unload', listeners.unload);

// Initiate the stylesheet service etc
callback.sss = Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Components.interfaces.nsIStyleSheetService);
var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
callback.uri = ios.newURI("chrome://CommentBlocker/content/application.css", null, null);