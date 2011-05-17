// Load CommentBlocker!
Components.utils.import('chrome://CommentBlocker/content/application.jsm');

// Whenever a page is loaded - parse it
addEventListener('load',function(evt) {
    CommentBlocker.parser.initDocument(evt.target);
    CommentBlocker.parser.touch(evt.target);
    
    sendAsyncMessage('CommentBlocker:DocumentParsed',{
        comments: CommentBlocker.parser.comments(evt.target),
        document: evt.target
    });
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