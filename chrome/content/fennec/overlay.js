window.addEventListener('load',function() {
    try {
        // Load CommentBlocker!
        Components.utils.import('chrome://CommentBlocker/content/application.jsm');
        
        // Handle everything else in child processes
        messageManager.loadFrameScript('chrome://CommentBlocker/content/fennec/frame.js',true);
        
        /*messageManager.addMessageListener("Content:LocationChange",function(aMessage) {
            document.getElementById('cbToolbarButton').image = 'chrome://CommentBlocker/skin/status_disabled.png';
        });
        
        messageManager.addMessageListener("Content:StateChange",function() {
            document.getElementById('cbToolbarButton').image = 'chrome://CommentBlocker/skin/status_enabled.png';
            document.getElementById('cbToolbarButton').disabled = false;
        });
        
        document.getElementById('browsers').addEventListener('load', function(evt) {
            dump("Load hooked\n");
            CommentBlocker.parser.initDocument(evt.target);
            CommentBlocker.parser.touch(evt.target);
            dump("Found "+CommentBlocker.parser.comments(evt.target)+" comments\n");
            dump("Load finished\n");
        },true);
        
        document.getElementById('tabs').addEventListener('TabOpen', function(evt) {
            dump("Open hooked\n");
            dump(evt.originalTarget.browser);
            dump("Open finished\n");
        },true);*/
    }
    catch (e) {
        dump('E: '+e);
    }
},false);