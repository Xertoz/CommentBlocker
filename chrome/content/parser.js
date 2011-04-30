CommentBlocker.parser = {
    // This XPath string will find all relevant new comment elements
    __xpath: '//*[not(contains(@class,"CommentBlocker")) and (contains(translate(@class,"COMENT","coment"),"comment") or contains(translate(@id,"COMENT","coment"),"comment"))]',
    
    // Parse an element and its child for comment elements
    parse: function(elem,update) {
        if (typeof(elem.className) != 'undefined' && elem.className.indexOf('comment') >= 0)
            CommentBlocker.parser.initElement(elem);
        
        for (var i=0;i<elem.childNodes.length;i++)
            CommentBlocker.parser.parse(elem.childNodes.item(i),false);
        
        if (update)
            CommentBlocker.gui.update(elem.ownerDocument);
    },
    
    // Touching a document is to tag all not earlier tagged comment elements with the CommentBlocker class
    touch: function(doc) {
        // Make sure we are initialized..
        if (!this.isInitialized(doc))
            return;
        
        doc.CommentBlocker.working = true;
        
        // Find all new relevant elements
        var comments = doc.evaluate(this.__xpath,doc,null,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null);
        
        // Tag them all
        for (var i=0;i<comments.snapshotLength;i++)
            CommentBlocker.parser.initElement(comments.snapshotItem(i));
        
        CommentBlocker.gui.update(doc);
        
        doc.CommentBlocker.working = false;
    },
    
    // Remove an elemnt from the comments list
    remove: function(elem,update) {
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
    },
    
    // Initialize a document for use with CommentBlocker
    initDocument: function(doc) {
        // CommentBlocker settings for this document
        doc.CommentBlocker = {
            comments: new Array(),
            enabled: !CommentBlocker.isTrusted(doc.location.hostname),
            working: false
        };
        
        // Listen for events when loaded
        doc.addEventListener('DOMContentLoaded',function() {
            doc.addEventListener('DOMNodeInserted',function(e) {
                CommentBlocker.parser.parse(e.originalTarget,true);
            },false);
            
            doc.addEventListener('DOMNodeRemoved',function(e) {
                CommentBlocker.parser.remove(e.originalTarget,true);
            },false);
            
            doc.addEventListener('DOMAttrModified',function(e) {
                if (!e.originalTarget.ownerDocument.CommentBlocker.working && e.originalTarget.ownerDocument.CommentBlocker.enabled)
                    CommentBlocker.parser.jailGuard(e.originalTarget);
            },false);
        },false);
    },
    
    // Initialize an element for use with CommentBlocker
    initElement: function(elem) {
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
    
    // Check for initialization of CommentBlocker
    isInitialized: function(obj) {
        if (typeof(obj.CommentBlocker) == 'undefined')
            return false;
        return true;
    },
    
    // Hide an element
    hideElement: function(doc,i) {
        if (doc.CommentBlocker.comments[i].element.style.display != 'none') {
            CommentBlocker.parser.updateElement(doc,i);
            doc.CommentBlocker.comments[i].element.style.display = 'none';
        }
    },
    
    // Show an element
    showElement: function(doc,i) {
        doc.CommentBlocker.comments[i].element.style.display = doc.CommentBlocker.comments[i].display;
    },
    
    // Update an element's status
    updateElement: function(doc,i) {
        doc.CommentBlocker.comments[i].display = doc.CommentBlocker.comments[i].element.style.display;
    },
    
    // Hide all elements
    hide: function() {
        gBrowser.contentDocument.CommentBlocker.working = true;
        gBrowser.contentDocument.CommentBlocker.enabled = true;
        
        for (var i=0;i<gBrowser.contentDocument.CommentBlocker.comments.length;i++)
            CommentBlocker.parser.hideElement(gBrowser.contentDocument,i);
        
        CommentBlocker.gui.update(gBrowser.contentDocument);
        
        gBrowser.contentDocument.CommentBlocker.working = false;
    },
    
    // Show all elements
    show: function() {
        gBrowser.contentDocument.CommentBlocker.working = true;
        gBrowser.contentDocument.CommentBlocker.enabled = false;
        
        for (var i=0;i<gBrowser.contentDocument.CommentBlocker.comments.length;i++)
            CommentBlocker.parser.showElement(gBrowser.contentDocument,i);
        
        CommentBlocker.gui.update(gBrowser.contentDocument);
        
        gBrowser.contentDocument.CommentBlocker.working = false;
    },
    
    // When DOM attributes change - make sure CB rules stick
    jailGuard: function(elem) {
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
    }
};