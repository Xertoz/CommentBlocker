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
     * Key-value map of document states
     */
    map: new WeakMap(),

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
                '[id*="comment"], [id*="Comment"], [id*="COMMENT"], ' +
                '[class*="comment"], [class*="Comment"], [class*="COMMENT"], ' +
                '[name*="comment"], [name*="Comment"], [name*="COMMENT"], ' +
                '#disqus_thread'
            ) != null;
        },

        /**
        * Hide all elements
        */
        hide: function(document) {
            var state = CommentBlocker.map.get(document);
            state.enabled = true;
            CommentBlocker.map.set(document, state);
            document.body.setAttribute('CommentBlocker', 'true');
        },

        /**
        * Initialize a document for being supervised by CommentBlocker
        */
        initDocument: function(document,callback) {
            // CommentBlocker settings for this document
            var state = {
                callback: callback,
                enabled: !CommentBlocker.isTrusted(document.location.hostname),
                observer: new document.defaultView.MutationObserver(callback.observe)
            };
            CommentBlocker.map.set(document, state);
            
            if (state.enabled)
                CommentBlocker.parser.hide(document);
            
            // Prevent forms from being sent with hidden elements
            document.addEventListener('submit', CommentBlocker.submit, true);

            // Observe mutations
            state.observer.observe(document.body, {
                attributeFilter: ['CommentBlocker', 'id', 'class', 'name'],
                attributes: true,
                childList: true,
                subtree: true
            });
        },

        /**
        * Show all elements
        */
        show: function(document) {
            var state = CommentBlocker.map.get(document);
            state.enabled = false;
            CommentBlocker.map.set(document, state);
            document.body.removeAttribute('CommentBlocker');
            var event = document.createEvent('UIEvents');
            event.initUIEvent('resize', true, false, document.defaultView, 0);
            document.defaultView.dispatchEvent(event);
        },

        /**
        * Stop submission of a form that's got blocked elements
        */
        stopSubmission: function(evt) {
            var state = CommentBlocker.map.get(evt.originalTarget.ownerDocument);
            // First off, stop the submission!
            evt.stopPropagation();
            evt.preventDefault();
            
            // Secondly, show a notification that we did.
            state.callback.gui.stopSubmission(evt.originalTarget.ownerDocument);
        },

        /**
         * Uninitialize a document for being supervised by CommentBlocker
         */
        uninitDocument: function(document) {
            var state = CommentBlocker.map.get(document);
            CommentBlocker.parser.show(document);
            state.observer.disconnect();
            document.removeEventListener('submit', CommentBlocker.submit, true);
            CommentBlocker.map.delete(document);
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
     * Listen to submit events of documents
     */
    submit: function(e) {
        var state = CommentBlocker.map.get(e.originalTarget.ownerDocument);
        if (state.enabled
            && CommentBlocker.parser.hasComments(e.originalTarget.ownerDocument.body))
            CommentBlocker.parser.stopSubmission(e);
    },

    /**
    * Invert show/hide status on document
    */
    toggleComments: function(document) {
        var state = CommentBlocker.map.get(document);
        if (state.enabled == true)
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
     * Unload CommentBlocker
     */
    unload: function() {
        CommentBlocker.settings.removeObserver('', CommentBlocker, false);
    },
    
    /**
    * The list of websites configured by the user
    */
    websites: null
};