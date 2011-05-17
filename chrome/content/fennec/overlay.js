window.addEventListener('load',function() {
    // Load CommentBlocker!
    Components.utils.import('chrome://CommentBlocker/content/application.jsm');
    
    // Handle everything else in child processes
    messageManager.loadFrameScript('chrome://CommentBlocker/content/fennec/frame.js',true);
    
    // Listen for parsed messages from the children
    messageManager.addMessageListener('CommentBlocker:DocumentParsed',function(aMessage) {
        if (aMessage.json.comments) {
            document.getElementById('cbToolbarButton').image = 'chrome://CommentBlocker/skin/status_enabled.png';
            document.getElementById('cbToolbarButton').disabled = false;
        }
        else {
            document.getElementById('cbToolbarButton').image = 'chrome://CommentBlocker/skin/status_inactive.png';
            document.getElementById('cbToolbarButton').disabled = true;
        }
    });
    
    // Listen for toggling of comments
    messageManager.addMessageListener('CommentBlocker:ToggleComments',function(aMessage) {
        if (aMessage.json.comments.length == 0) {
            document.getElementById('cbToolbarButton').image = 'chrome://CommentBlocker/skin/status_inactive.png';
            document.getElementById('cbToolbarButton').disabled = true;
        }
        else if (aMessage.json.enabled) {
            document.getElementById('cbToolbarButton').image = 'chrome://CommentBlocker/skin/status_enabled.png';
            document.getElementById('cbToolbarButton').disabled = false;
        }
        else {
            document.getElementById('cbToolbarButton').image = 'chrome://CommentBlocker/skin/status_disabled.png';
            document.getElementById('cbToolbarButton').disabled = false;
        }
    });
    
    // Make sure we have the right toolbar button when changing tabs
    document.getElementById('tabs').addEventListener('TabSelect',function(evt) {
        Browser.selectedBrowser.messageManager.sendAsyncMessage('CommentBlocker:TabSelected');
    },false);
},false);