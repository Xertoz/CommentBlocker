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
    * The addon's strings
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
    // Get the strings
    CommentBlocker.strings = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle('chrome://CommentBlocker/locale/overlay.properties');
    
    // Grab preferences
    CommentBlocker.settings = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.CommentBlocker.");
    CommentBlocker.settings.QueryInterface(Components.interfaces.nsIPrefBranch2);
    CommentBlocker.settings.addObserver('',CommentBlocker,false);
    
    // Configure
    CommentBlocker.configure();
};

/**
* Observe preference changes
*/
CommentBlocker.observe = function(aSubject, aTopic, aData) {
    switch (aData) {
        case 'websites':
        case 'interface_display_statusbar':
            CommentBlocker.loadConfig();
            break;
    }
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
    
    // Listen for events when loaded
    //document.addEventListener('DOMContentLoaded',function() {
        document.addEventListener('DOMNodeInserted',function(evt) {
            CommentBlocker.parser.parse(evt.originalTarget,true);
        },false);
        
        document.addEventListener('DOMNodeRemoved',function(evt) {
            CommentBlocker.parser.remove(evt.originalTarget,true);
        },false);
        
        document.addEventListener('DOMAttrModified',function(evt) {
            if (!evt.originalTarget.ownerDocument.CommentBlocker.working && evt.originalTarget.ownerDocument.CommentBlocker.enabled)
                CommentBlocker.parser.jailGuard(evt.originalTarget);
        },false);
        
        document.addEventListener('submit',function(e) {
            if (e.originalTarget.ownerDocument.CommentBlocker.enabled && CommentBlocker.parser.comments(e.originalTarget))
                CommentBlocker.parser.stopSubmission(e);
        },true);
    //},false);
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
* When DOM attributes change - make sure CommentBlocker rules stick
*/
CommentBlocker.parser.jailGuard = function(elem) {
    if (elem.className.indexOf('CommentBlocker') == -1)
        return;
    
    var n = -1;
    
    for (var i=0;i<elem.ownerDocument.CommentBlocker.comments.length;i++)
        if (elem.ownerDocument.CommentBlocker.comments[i].element == elem)
            n = i;
    
    if (n == -1)
        return;
    
    if (elem.ownerDocument.CommentBlocker.enabled == true)
        CommentBlocker.parser.hideElement(elem.ownerDocument,n);
    else
        CommentBlocker.parser.updateElement(elem.ownerDocument,n);
};

// Parse an element and its child for comment elements
CommentBlocker.parser.parse = function(elem,update) {
    if ((typeof(elem.className) != 'undefined' && elem.className.indexOf('comment') >= 0) || (typeof(elem.id) != 'undefined' && elem.id.indexOf('comment') >= 0))
        CommentBlocker.parser.initElement(elem);
    
    for (var i=0;i<elem.childNodes.length;i++)
        CommentBlocker.parser.parse(elem.childNodes.item(i),false);
    
    if (update)
        CommentBlocker.gui.update(elem.ownerDocument);
};

// Remove an elemnt from the comments list
CommentBlocker.parser.remove = function(elem,update) {
    if (CommentBlocker.parser.isInitialized(elem)); {
        var comments = elem.ownerDocument.CommentBlocker.comments;
        
        for (var i=0;i<comments.length;i++)
            if (comments[i].element === elem)
                comments.splice(i,1);
    }
    
    for (var i=0;i<elem.childNodes.length;i++)
        CommentBlocker.parser.parse(elem.childNodes.item(i),false);
    
    if (update)
        CommentBlocker.gui.update(elem.ownerDocument);
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
};

// Stop submission of a form that's got blocked elements
CommentBlocker.parser.stopSubmission = function(evt) {
    // First off, stop the submission!
    evt.stopPropagation();
    evt.preventDefault();
    
    // Secondly, show a notification that we did.
    CommentBlocker.gui.stopSubmission(evt.originalTarget.ownerDocument);
};

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
* Save listed websites to string
*/
CommentBlocker.saveListed = function() {
    CommentBlocker.settings.setCharPref('websites',CommentBlocker.websites.join(','));
};

/**
* Invert show/hide status on document
*/
CommentBlocker.toggleComments = function(document) {
    if (document.CommentBlocker.enabled == true)
        CommentBlocker.parser.show(document);
    else
        CommentBlocker.parser.hide(document);
};

/**
* Toggle listing status of a website
*/
CommentBlocker.toggleListed = function(hostname) {
    for (var i=0;i<CommentBlocker.websites.length;i++)
        if (CommentBlocker.websites[i] == hostname) {
            CommentBlocker.websites.splice(i,1);
            
            CommentBlocker.saveListed();
            
            return;
        }
    
    CommentBlocker.websites.push(hostname);
    
    CommentBlocker.saveListed();
};

// Finally, run the load event
CommentBlocker.load();