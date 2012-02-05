var EXPORTED_SYMBOLS = ['CommentBlocker'];

/**
* The main CommentBlocker object for its shared purposes within the application
*/
var CommentBlocker = {
    /**
    * Load the configuration
    */
    configure: function() {
        // Load list of sites
        CommentBlocker.websites = CommentBlocker.settings.getCharPref('websites');
        CommentBlocker.websites = CommentBlocker.websites.length ? CommentBlocker.websites.split(',') : new Array();
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
    * This module's onload event
    */
    load: function() {
        // Get the strings
        CommentBlocker.strings = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle('chrome://CommentBlocker/locale/overlay.properties');
        
        // Grab preferences
        CommentBlocker.settings = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.CommentBlocker.");
        CommentBlocker.settings.QueryInterface(Components.interfaces.nsIPrefBranch2);
        CommentBlocker.settings.addObserver('',CommentBlocker,false);
        
        // Configure
        CommentBlocker.configure();
    },

    /**
    * Observe preference changes
    */
    observe: function(aSubject, aTopic, aData) {
        switch (aData) {
            case 'websites':
            case 'interface_display_statusbar':
                CommentBlocker.configure();
                break;
        }
    },
    
    /**
    * The parser API
    */
    parser: {
        /**
        * Look for comments in an element
        */
        hasComments: function(elem) {
            return elem.querySelector(
                '[id*="comment"], [id*="Comment"], [id*="COMMENT"], [class*="comment"], [class*="Comment"], [class*="COMMENT"]'
            ) != null;
        },

        /**
        * Hide all elements
        */
        hide: function(document) {
            document.CommentBlocker.enabled = true;
            document.CommentBlocker.callback.useCSS(true);
        },

        /**
        * Initialize a document for being supervised by CommentBlocker
        */
        initDocument: function(document,callback) {
            // CommentBlocker settings for this document
            document.CommentBlocker = {
                callback: callback,
                enabled: !CommentBlocker.isTrusted(document.location.hostname)
            };
            
            // Prevent forms from being sent with hidden elements
            document.addEventListener('submit',function(e) {
                if (e.originalTarget.ownerDocument.CommentBlocker.enabled
                && CommentBlocker.parser.hasComments(e.originalTarget.ownerDocument))
                    CommentBlocker.parser.stopSubmission(e);
            },true);
        },

        /**
        * Show all elements
        */
        show: function(document) {
            document.CommentBlocker.enabled = false;
            document.CommentBlocker.callback.useCSS(false);
        },

        /**
        * Stop submission of a form that's got blocked elements
        */
        stopSubmission: function(evt) {
            // First off, stop the submission!
            evt.stopPropagation();
            evt.preventDefault();
            
            // Secondly, show a notification that we did.
            evt.originalTarget.ownerDocument.CommentBlocker.callback.gui.stopSubmission(evt.originalTarget.ownerDocument);
        }
    },

    /**
    * Save listed websites to string
    */
    saveListed: function() {
        CommentBlocker.settings.setCharPref('websites',CommentBlocker.websites.join(','));
    },
    
    /**
    * The addon's settings
    */
    settings: null,
    
    /**
    * The addon's strings
    */
    strings: null,

    /**
    * Invert show/hide status on document
    */
    toggleComments: function(document) {
        if (document.CommentBlocker.enabled == true)
            CommentBlocker.parser.show(document);
        else
            CommentBlocker.parser.hide(document);
    },

    /**
    * Toggle listing status of a website
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
    },
    
    /**
    * The list of websites configured by the user
    */
    websites: null
};

// Finally, run the load event
CommentBlocker.load();