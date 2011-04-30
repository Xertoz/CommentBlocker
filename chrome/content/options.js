/**
* Manage options for the addon
* 
* @author Mattias Lindholm
* @copyright 2010-2011 Mattias Lindholm
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
        CommentBlocker.onLoad();
        CommentBlocker.loadConfig();
        
        for (var i=0;i<CommentBlocker.websites.length;i++) {
                var e = document.createElement('listitem'); 
                e.setAttribute('label',CommentBlocker.websites[i]);
                document.getElementById('cbWebsites').appendChild(e);
            }
    }
};