var EXPORTED_SYMBOLS = ['CommentBlocker'];

/**
* The main CommentBlocker object for its shared purposes within the application
*/
var CommentBlocker = {
    /**
    * The addon's settings
    */
    settings: null,
    
    /**
    * The addon's localized strings
    */
    strings: null,
    
    /**
    * The parser API
    */
    parser: {},
    
    /**
    * The list of websites configured by the user
    */
    websites: null,
    
    /**
    * The XPath query to find all "comments" in any DOM document
    */
    xpath: '//*[not(contains(@class,"CommentBlocker")) and (contains(translate(@class,"COMENT","coment"),"comment") or contains(translate(@id,"COMENT","coment"),"comment"))]'
};

/**
* Load the configuration
*/
CommentBlocker.configure = function() {
    // Show status bar?
    /*if (typeof(CommentBlocker.gui) != 'undefined')
        CommentBlocker.gui.showStatusBar(CommentBlocker.settings.getBoolPref('interface_display_statusbar'));*/
    
    // Load list of sites
    CommentBlocker.websites = CommentBlocker.settings.getCharPref('websites').split(',');
};

/**
* Find out wether or not a given document is listed
*/
CommentBlocker.isListed = function(hostname) {
    if (typeof(hostname) != 'string')
        return false;
    
    for (var i=0;i<CommentBlocker.websites.length;i++) {
        var regex = new RegExp('^'+CommentBlocker.websites[i].replace(/\*/,'(.*)')+'$');
        
        if (hostname.match(regex))
            return true;
    }
    
    return false;
};

/**
* Find out wether or not a given document is to be trusted
*/
CommentBlocker.isTrusted = function(hostname) {
    // If it's listed, use the rule for that condition to determine safety
    if (CommentBlocker.isListed(hostname))
        return CommentBlocker.settings.getBoolPref('rules_listed_display');
    
    // Otherwise, if not listed, use that other rule
    return CommentBlocker.settings.getBoolPref('rules_unknown_display');
};

/**
* This module's onload event
*/
CommentBlocker.load = function() {
    // Get strings
    // CommentBlocker.strings = document.getElementById('cbStrings');
    
    // Grab preferences
    CommentBlocker.settings = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.CommentBlocker.");
    CommentBlocker.settings.QueryInterface(Components.interfaces.nsIPrefBranch2);
    CommentBlocker.settings.addObserver('',CommentBlocker,false);
    
    // Configure
    CommentBlocker.configure();
};

/**
* Return the amount of affected elements
*/
CommentBlocker.parser.comments = function(elem) {
    var count = 0;
    
    if (typeof(elem.className) != 'undefined' && elem.className.indexOf('CommentBlocker') >= 0)
        count++;
    
    for (var i=0;i<elem.childNodes.length;i++)
        count += CommentBlocker.parser.comments(elem.childNodes.item(i));
    
    return count;
};

/**
* Hide all elements
*/
CommentBlocker.parser.hide = function(document) {
    document.CommentBlocker.working = true;
    document.CommentBlocker.enabled = true;
    
    for (var i=0;i<document.CommentBlocker.comments.length;i++)
        CommentBlocker.parser.hideElement(document,i);
    
    document.CommentBlocker.working = false;
};

/**
* Hide an element
*/
CommentBlocker.parser.hideElement = function(document,i) {
    if (document.CommentBlocker.comments[i].element.style.display != 'none') {
        CommentBlocker.parser.updateElement(document,i);
        document.CommentBlocker.comments[i].element.style.display = 'none';
    }
};

/**
* Initialize a document for being supervised by CommentBlocker
*/
CommentBlocker.parser.initDocument = function(document) {
    // CommentBlocker settings for this document
    document.CommentBlocker = {
        comments: new Array(),
        enabled: !CommentBlocker.isTrusted(document.location.hostname),
        working: false
    };
};
    
/**
* Initialize an element for use with CommentBlocker
*/
CommentBlocker.parser.initElement = function(elem) {
    // Document must be initialized
    if (!CommentBlocker.parser.isInitialized(elem.ownerDocument))
        throw 'Element has owner document without CommentBlocker initialized';
    
    // Can't already be.
    if (elem.className.indexOf('CommentBlocker') != -1)
        return;
    
    // Initialize.
    elem.ownerDocument.CommentBlocker.comments.push({
        element: elem,
        display: elem.style.display
    });
    
    // Add CommentBlocker CSS class
    elem.className = elem.className.length > 0 ? elem.className+' CommentBlocker' : 'CommentBlocker';
    
    // Hide it!
    if (elem.ownerDocument.CommentBlocker.enabled)
        CommentBlocker.parser.hideElement(elem.ownerDocument,elem.ownerDocument.CommentBlocker.comments.length-1);
},

/**
* Check for initialization of CommentBlocker
*/
CommentBlocker.parser.isInitialized = function(obj) {
    if (typeof(obj.CommentBlocker) == 'undefined')
        return false;
    return true;
};

/**
* Show all elements
*/
CommentBlocker.parser.show = function(document) {
    document.CommentBlocker.working = true;
    document.CommentBlocker.enabled = false;
    
    for (var i=0;i<document.CommentBlocker.comments.length;i++)
        CommentBlocker.parser.showElement(document,i);
    
    document.CommentBlocker.working = false;
};

/**
* Show an element
*/
CommentBlocker.parser.showElement = function(document,i) {
    document.CommentBlocker.comments[i].element.style.display = document.CommentBlocker.comments[i].display;
},

/**
* Touching a document is to tag all not earlier tagged comment elements with the CommentBlocker class
*/
CommentBlocker.parser.touch = function(document) {
    // Make sure we are initialized..
    if (!CommentBlocker.parser.isInitialized(document))
        return;
    
    document.CommentBlocker.working = true;
    
    // Find all new relevant elements
    var comments = document.evaluate(CommentBlocker.xpath,document,null,Components.interfaces.nsIDOMXPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null);
    
    // Tag them all
    for (var i=0;i<comments.snapshotLength;i++)
        CommentBlocker.parser.initElement(comments.snapshotItem(i));
    
    document.CommentBlocker.working = false;
};

/**
* Update an element's status
*/
CommentBlocker.parser.updateElement = function(document,i) {
    document.CommentBlocker.comments[i].display = document.CommentBlocker.comments[i].element.style.display;
};

/**
* Invert show/hide status on document
*/
CommentBlocker.toggleComments = function(document) {
    if (document.CommentBlocker.enabled == true)
        CommentBlocker.parser.show(document);
    else
        CommentBlocker.parser.hide(document);
},

// Finally, run the load event
CommentBlocker.load();