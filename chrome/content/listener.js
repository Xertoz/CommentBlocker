/**
* All events that will be handled by CommentBlocker are found in CommentBlocker.listener
* CommentBlocker is completely event driven and this will be the spine of the addon
* By mapping the following events to parser & gui functions CommentBlocker performs its work
* 
* @author Mattias Lindholm
* @copyright 2010-2011 Mattias Lindholm
*/
CommentBlocker.listener = {
    /**
    * Whenever the user switches to a new tab in the browser, update the status bar icon
    */
    onChangeTab: function(e) {
        CommentBlocker.gui.update(gBrowser.contentDocument);
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
                CommentBlocker.gui.toggleComments();
            break;
            
            case 2:
                CommentBlocker.toggleListed(gBrowser.contentDocument.location.hostname);
                if (CommentBlocker.isTrusted(gBrowser.contentDocument.location.hostname))
                    CommentBlocker.parser.show();
                else
                    CommentBlocker.parser.hide();
            break;
            
            case 3:
                CommentBlocker.gui.showPreferences();
            break;
        }
        
        CommentBlocker.gui.update(gBrowser.contentDocument);
        
        return false;
    },
    
    /**
    * Whenever a new location is fetched, initialize CommentBlocker into the document's DOM
    */
    onLocationChange: function(aBrowser) {
        if (typeof(aBrowser.contentDocument.CommentBlocker) == 'undefined')
            CommentBlocker.parser.initDocument(aBrowser.contentDocument);
    },
    
    /**
    * The main listener to interfere with static page loading before painted onto the screen
    */
    onStatusChange: function(aBrowser){
        CommentBlocker.parser.touch(aBrowser.contentDocument);
        CommentBlocker.gui.update(aBrowser.contentDocument);
    },
    
    /**
    * Empty (but required) event listener due to Mozilla restrictions
    */
    onSecurityChange: function() {},
    
    /**
    * Empty (but required) event listener due to Mozilla restrictions
    */
    onProgressChange: function() {},
    
    /**
    * Empty (but required) event listener due to Mozilla restrictions
    */
    onStateChange: function() {}
};

// Hook events when the addon finishes loading
window.addEventListener('load',function() {
    gBrowser.addTabsProgressListener(CommentBlocker.listener);
    gBrowser.tabContainer.addEventListener('TabSelect',CommentBlocker.listener.onChangeTab,false);
    //document.getElementById('cbLocationBar').addEventListener('click',CommentBlocker.listener.onClickIcon,false); Nowadays found in the onclick attribute to prevent bubbling
    document.getElementById('cbStatusBar').addEventListener('click',CommentBlocker.listener.onClickIcon,false);
},false);