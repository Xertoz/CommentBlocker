/**
* API for handling the GUI
* 
* @author Mattias Lindholm
* @copyright 2010-2011 Mattias Lindholm
*/
CommentBlocker.gui = {
    showLocationBar: function(show) {
        if (CommentBlocker.settings.getBoolPref('interface_display_locationbar'))
            document.getElementById('cbLocationBar').hidden = !show;
        else
            document.getElementById('cbLocationBar').hidden = true;
    },
    
    showPreferences: function() {
        window.openDialog('chrome://CommentBlocker/content/options.xul','Preferences','chrome,titlebar,toolbar,centerscreen,modal');
    },
    
    showStatusBar: function(show) {
        document.getElementById('cbStatusBar').hidden = !show;
    },
    
    // Invert show/hide status on current tab
    toggleComments: function() {
        if (gBrowser.contentDocument.CommentBlocker.enabled == true)
            CommentBlocker.parser.show();
        else
            CommentBlocker.parser.hide();
    },
    
    update: function(doc) {
        if (doc != gBrowser.contentDocument)
            return;
        
        // For failsafe, hide the icon if CommentBlocker is not initialized
        if (!CommentBlocker.parser.isInitialized(gBrowser.contentDocument)) {
            document.getElementById('cbLocationBar').hidden = true;
            return;
        }
        
        // Find out wether this site is trusted / enabled
        var trusted = CommentBlocker.isTrusted(gBrowser.contentDocument);
        var enabled = gBrowser.contentDocument.CommentBlocker.enabled;
        var comments = gBrowser.contentDocument.CommentBlocker.comments.length > 0;
        
        // If there are no comments on this page, do not show the icon
        CommentBlocker.gui.showLocationBar(comments);
        
        // Update icon image & text
        if (comments) {
            document.getElementById('cbLocationBar').src = enabled ? 'chrome://CommentBlocker/skin/status_enabled_16.png' : 'chrome://CommentBlocker/skin/status_disabled_16.png';
            document.getElementById('cbStatusBarImage').src = enabled ? 'chrome://CommentBlocker/skin/status_enabled_16.png' : 'chrome://CommentBlocker/skin/status_disabled_16.png';
            document.getElementById('cbLocationBar').tooltipText = (enabled ? CommentBlocker.strings.getString('enabled') : CommentBlocker.strings.getString('disabled'));
            document.getElementById('cbStatusBarImage').tooltipText = (enabled ? CommentBlocker.strings.getString('enabled') : CommentBlocker.strings.getString('disabled'));
        }
        else {
            document.getElementById('cbStatusBarImage').src = 'chrome://CommentBlocker/skin/status_inactive_16.png';
            document.getElementById('cbStatusBarImage').tooltipText = CommentBlocker.strings.getString('inactive');
        }
    }
}
