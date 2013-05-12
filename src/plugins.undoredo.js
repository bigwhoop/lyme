/**
 * This file is part of LYME (Low Key Markup Editor).
 *
 * (c) Philippe Gerber <philippe@bigwhoop.ch>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * @param {String} storage      Either 'memory' (default) or 'localStorage'.
 * @constructor
 */
$.fn.lyme.plugins.UndoRedo = function(storage) {
    var store;
    switch (storage)
    {
        case 'localStorage':  store = new $.fn.lyme.plugins.UndoRedo.LocalStorage();   break;
        case 'memory':
        default:              store = new $.fn.lyme.plugins.UndoRedo.MemoryStorage();  break;
    }
    
    var editor;

    /**
     * @param {$.fn.lyme.Editor} e
     */
    this.setEditor = function(e) {
        editor = e;
    };
    
    this.undo = function() {
        editor.setMarkup(store.undo());
    };
    
    this.redo = function() {
        editor.setMarkup(store.redo());
    };
    
    /**
     * @param {String} markup
     */
    this.onPostInit = function(markup) {
        editor.setMarkup(store.init(markup));
    };
    
    /**
     * @param {String} markup
     */
    this.onMarkupChange = function(markup) {
        store.push(markup);
    };
};

$.fn.lyme.plugins.UndoRedo.LocalStorage = function() {
    const KEY = 'lyme';
    
    var storage = new $.fn.lyme.plugins.UndoRedo.MemoryStorage();
    
    var persistedStorage = localStorage.getItem(KEY);
    if (persistedStorage && (persistedStorageObj = JSON.parse(persistedStorage))) {
        storage.pointer = persistedStorageObj.pointer;
        storage.entries = persistedStorageObj.entries;
    }
    
    function save() {
        localStorage.setItem(KEY, JSON.stringify(storage));
    }

    /**
     * We continue editing where we last finished and ignore the actual 
     * given markup. But only when some markup is available.
     * 
     * @param {String} markup
     * @returns {String}
     */
    this.init = function(markup) {
        var storedMarkup = storage.getMarkup();
        if (storedMarkup) {
            return storedMarkup;
        }
        var s = storage.init(markup);
        save();
        return s;
    };
    
    this.push = function(markup) {
        storage.push(markup);
        save();
    };
    
    this.undo = function() {
        var s = storage.undo();
        save();
        return s;
    };
    
    this.redo = function() {
        var s = storage.redo();
        save();
        return s;
    };
};

$.fn.lyme.plugins.UndoRedo.MemoryStorage = function() {
    this.pointer = 0;
    this.entries = [];
    
    this.init = function(markup) {
        this.push(markup);
        return markup;
    };
    
    this.push = function(markup) {
        this.entries = this.entries.slice(0, this.pointer);
        this.entries[this.pointer++] = markup;
    };
    
    this.undo = function() {
        this.pointer--;
        if (this.pointer < 1) {
            this.pointer = 1;
        }
        return this.getMarkup();
    };
    
    this.redo = function() {
        this.pointer++;
        if (this.pointer > this.entries.length) {
            this.pointer = this.entries.length;
        }
        return this.getMarkup();
    };
    
    this.getMarkup = function() {
        return this.entries[this.pointer - 1];
    };
};