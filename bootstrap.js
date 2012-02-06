Components.utils.import('resource://gre/modules/Services.jsm');

var listener = {
    onOpenWindow: function(xulWindow) {
        let domWindow = xulWindow
            .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
            .getInterface(Components.interfaces.nsIDOMWindowInternal);
        
        domWindow.addEventListener('load', function listener() {
            domWindow.removeEventListener('load',listener,false);
        
            if (domWindow.document.documentElement.getAttribute('windowtype') == 'navigator:browser')
                cbOverlay.load(domWindow);
        },false);
    },

    onCloseWindow: function(xulWindow) {},

    onWindowTitleChange: function(xulWindow, newTitle) {}
};

function startup(data, reason) {
    let defaults = Services.prefs.getDefaultBranch('extensions.CommentBlocker.');
    defaults.setBoolPref('interface_display_locationbar', true);
    defaults.setBoolPref('interface_display_statusbar', true);
    defaults.setIntPref('interface_behaviour_leftclick', 1);
    defaults.setIntPref('interface_behaviour_scrollclick', 3);
    defaults.setIntPref('interface_behaviour_rightclick', 2);
    defaults.setBoolPref('rules_unknown_display', false);
    defaults.setBoolPref('rules_listed_display', true);
    defaults.setCharPref('websites', '');
    
    Services.scriptloader.loadSubScript('chrome://CommentBlocker/content/application.js',this);
    Services.scriptloader.loadSubScript('chrome://CommentBlocker/content/firefox/overlay.js',this);
    
    var windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements())
        cbOverlay.load(windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow));

    Services.wm.addListener(listener);
}

function shutdown(data, reason) {
    Services.wm.removeListener(listener);
    
    var windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements())
        cbOverlay.unload(windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow));
}