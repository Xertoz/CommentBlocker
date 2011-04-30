/**
* Main object in which all functions and variables to the javascript of the addon will be kept
* 
* @author Mattias Lindholm
* @copyright 2010-2011 Mattias Lindholm
*/
var CommentBlocker = {
    /**
    * Addon status
    */
    initialized: false,
    
    /**
    * Strings
    */
    strings: null,
    
    /**
    * Settings
    */
    settings: null,
    
    /**
    * Initialize the addon for it to run properly
    */
    onLoad: function() {
        // Don't run twice
        if (CommentBlocker.initialized)
            true;
        
        // Mark as having been run
        CommentBlocker.initialized = true;
        
        // Get strings.
        CommentBlocker.strings = document.getElementById('cbStrings');
        
        // Grab preferences
        CommentBlocker.settings = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.CommentBlocker.");
        CommentBlocker.settings.QueryInterface(Components.interfaces.nsIPrefBranch2);
        CommentBlocker.settings.addObserver('',CommentBlocker,false);
        
        // Configure
        CommentBlocker.loadConfig();
    },
    
    /**
    * Find out wether or not a given document is listed
    */
    isListed: function(hostname) {
        if (typeof(hostname) != 'string')
            return false;
        
        for (var i=0;i<CommentBlocker.websites.length;i++) {
            var regex = new RegExp('^'+CommentBlocker.websites[i].replace(/\*/,'(.*)')+'$');
            
            if (hostname.match(regex))
                return true;
        }
        
        return false;
    },
    
    /**
    * Find out wether or not a given document is to be trusted
    */
    isTrusted: function(hostname) {
        // If it's listed, use the rule for that condition to determine safety
        if (CommentBlocker.isListed(hostname))
            return CommentBlocker.settings.getBoolPref('rules_listed_display');
        
        // Otherwise, if not listed, use that other rule
        return CommentBlocker.settings.getBoolPref('rules_unknown_display');
    },
    
    /**
    * Based on the configuration, make adjustments
    */
    loadConfig: function() {
        // Show status bar?
        if (typeof(CommentBlocker.gui) != 'undefined')
            CommentBlocker.gui.showStatusBar(CommentBlocker.settings.getBoolPref('interface_display_statusbar'));
        
        // Load list of sites
        CommentBlocker.websites = CommentBlocker.settings.getCharPref('websites').split(',');
    },
    
    observe: function(aSubject, aTopic, aData) {
        switch (aData) {
            case 'websites':
            case 'interface_display_statusbar':
                CommentBlocker.loadConfig();
                break;
        }
    },
    
    /**
    * Save listed websites to string
    */
    saveListed: function() {
        CommentBlocker.settings.setCharPref('websites',CommentBlocker.websites.join(','));
    },
    
    /**
    * Invert listed status of a site
    */
    toggleListed: function(hostname) {
        for (var i=0;i<CommentBlocker.websites.length;i++)
            if (CommentBlocker.websites[i] == hostname) {
                CommentBlocker.websites.splice(i,1);
                
                CommentBlocker.saveListed();
                
                return;
            }
        
        CommentBlocker.websites.push(hostname);
        
        CommentBlocker.saveListed();
    }
};

// When all javascript is loaded - run the initialization process
window.addEventListener("load", CommentBlocker.onLoad, false);