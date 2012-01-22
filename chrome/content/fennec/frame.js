// Load CommentBlocker!
Components.utils.import('chrome://CommentBlocker/content/application.jsm');

var callback = {
    gui: {
        stopSubmission: function(doc) {
            sendAsyncMessage('CommentBlocker:StopSubmission',doc);
        },
        
        update: function(doc) {
            sendAsyncMessage('CommentBlocker:ToggleComments',doc.CommentBlocker);
        }
    }
}

// Whenever a page is loaded - parse it
addEventListener('load',function(evt) {
    CommentBlocker.parser.initDocument(evt.target,callback);
    CommentBlocker.parser.touch(evt.target);
    
    sendAsyncMessage('CommentBlocker:DocumentParsed',content.document.CommentBlocker);
},true);

// When the toggle request is issued
addMessageListener('CommentBlocker:ToggleComments',function(aMessage) {
    CommentBlocker.toggleComments(content.document);
    
    sendAsyncMessage('CommentBlocker:ToggleComments',content.document.CommentBlocker);
});

// When the tab is switched
addMessageListener('CommentBlocker:TabSelected',function() {
    if (typeof(content.document.CommentBlocker) != 'undefined')
        sendAsyncMessage('CommentBlocker:ToggleComments',content.document.CommentBlocker);
});

// Load the CommentBlocker CSS rules
var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Components.interfaces.nsIStyleSheetService);
var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
var uri = ios.newURI("chrome://CommentBlocker/content/application.css", null, null);
sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);