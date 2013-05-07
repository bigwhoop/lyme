/**
 * This file is part of LYME (Low Key Markup Editor).
 *
 * (c) Philippe Gerber <philippe@bigwhoop.ch>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Some base plugins
 * 
 * @type {Object}
 */
$.fn.lyme.plugins = {
    /**
     * 
     * @param {String} storage      Either 'memory' (default) or 'localStorage'.
     * @param {Number} numEntries   The number of entries to keep in the back log (default: 50).
     * @constructor
     */
    UndoRedo: function(storage, numEntries) {
        if (!$.isNumeric(numEntries)) {
            numEntries = 50;
        }
        
        var store;
        switch (storage)
        {
            case 'localStorage':
                store = {
                    version: 0,
                    prefix: 'rev-',
                    push: function(markup) {
                        window.localStorage.setItem(this.prefix + this.version++, markup);
                    }
                };
                break;
            
            case 'memory':
            default:
                store = {
                    entries : [],
                    push: function(markup) {
                        this.entries.push(markup);
                    }
                };
                break;
        }
        
        this.onMarkupChange = function(markup, html) {
            store.push(markup);
        };
    },


    /**
     * @param {Boolean} isEnabled       Whether the door guard is enabled by default.
     * @constructor
     */
    ContentGuard: function(isEnabled) {
        var hasChanged = false,
            isEnabled  = typeof isEnabled === 'boolean' ? isEnabled : false;
        
        this.enable = function() {
            isEnabled = true;
        };
        
        this.disable = function() {
            isEnabled = false;
        };
        
        this.onMarkupChange = function() {
            hasChanged = true;
        };
        
        $(window).bind('beforeunload', function() {
            if (isEnabled && hasChanged) {
                return 'Are you sure you want to leave this page?';
            }
        });
    },
    
    
    /**
     * Update an element every time the Markup changes. 
     * 
     * @constructor
     * @param {String|Object} elementId     String for the element's ID or a jQuery object.
     * @param {Boolean} useHTML             Update the element value with the HTML, instead of the Markup. Default: false.
     */
    ValueUpdater: function(elementId, useHTML) {
        var $e = $(elementId);
        this.onMarkupChange = function(markup, html) {
            $e.val(useHTML ? html : markup);
        };
    },
    
    /**
     * Scroll to active block using jQuery scrollTo plugin
     * 
     * @constructor
     * @param {Number} delay
     */
    ScrollTo: function(delay) {
        if (!$.isFunction($.scrollTo)) {
            return;
        }
        
        if (!$.isNumeric(delay)) {
            delay = 200;
        }
        
        var scrollTimeout;
        this.onPreStartEditing = function(block) {
            window.clearTimeout(scrollTimeout);
            scrollTimeout = window.setTimeout(
                function() {
                    $.scrollTo(
                        block.getElement(),
                        {
                            duration : 750,
                            offset   : { top : -100, left : 0 }
                        }
                    );
                },
                delay
            );
        };
    }
};