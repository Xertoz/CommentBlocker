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

var observer = {
    observe: function(aSubject, aTopic, aData) {
        if (aTopic == 'addon-options-displayed' && aData == 'commentblocker@xertoz.se') {
            var list = aSubject.getElementById('cbWebsites');

            // TODO: The listbox is not updated when changes are made in another tab
            for (var i=0;i<CommentBlocker.websites.length;++i) {
                var item = aSubject.createElement('listitem');
                item.setAttribute('label', CommentBlocker.websites[i]);
                list.appendChild(item);
            }

            aSubject.getElementById('cbWebsitesAdd').addEventListener('click', function() {
                var hostname = aSubject.defaultView.prompt('URL:');

                if (!hostname)
                    return;

                CommentBlocker.toggleListed(hostname);
                var item = aSubject.createElement('listitem');
                item.setAttribute('label', hostname);
                aSubject.getElementById('cbWebsites').appendChild(item);
            }, false);

            aSubject.getElementById('cbWebsitesRemove').addEventListener('click', function() {
                CommentBlocker.toggleListed(aSubject.getElementById('cbWebsites').currentItem.getAttribute('label'));
                aSubject.getElementById('cbWebsites').removeChild(aSubject.getElementById('cbWebsites').currentItem);
            }, false);
        }
    }
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
        cbOverlay.load(windows.getNext());

    Services.wm.addListener(listener);
    Services.obs.addObserver(observer, 'addon-options-displayed', false);
}

function shutdown(data, reason) {
    Services.wm.removeListener(listener);
    Services.obs.removeObserver(observer, 'addon-options-displayed');

    var windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements())
        cbOverlay.unload(windows.getNext());
}