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
     * @param {Boolean} disableOnFormSubmit     Whether to automatically disable the guard when a form is submitted.
     * @param {Boolean} isEnabled               Whether the door guard is enabled by default.
     * @constructor
     */
    ContentGuard: function(disableOnFormSubmit, isEnabled) {
        var hasChanged          = false,
            disableOnFormSubmit = typeof disableOnFormSubmit === 'boolean' ? disableOnFormSubmit : true,
            isEnabled           = typeof isEnabled === 'boolean' ? isEnabled : true;
        
        this.enable = function() {
            isEnabled = true;
        };
        
        this.disable = function() {
            isEnabled = false;
        };
        
        if (disableOnFormSubmit) {
            $(document).on('submit', 'form', function() {
                isEnabled = false;
            });
        }
        
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
     * Provides the markup from the value of an element and updates the element every time the markup changes. 
     * 
     * @constructor
     * @param {String|Object} selector      String for an element selector or a jQuery object.
     * @param {Boolean} useHTML             Update the element value with the HTML, instead of the Markup. Default: false.
     */
    TextareaAdapter: function(selector, useHTML) {
        var $e = $(selector);
        
        this.onGetMarkup = function() {
            return $e.val();
        };
        
        this.onMarkupChange = function(markup, html) {
            $e.val(useHTML ? html : markup);
        };
    },
    
    /**
     * Provides the markup by GET'ing it from an URL and POSTs to the a URL whenever the markup changes. 
     * 
     * @constructor
     * @param {String} getURL      The URL where to GET the markup from.
     * @param {String} postURL     The URL where to POST the markup to.
     */
    AjaxAdapter: function(getURL, postURL) {
        if (getURL && getURL.length) {
            this.onGetMarkup = function() {
                var markup = 'Failed to retrieve the from ' + getURL;
                $.ajax({
                    'url': getURL,
                    type: 'get',
                    success: function(data) {
                        markup = data;
                    },
                    async: false
                });
                return markup;
            };
        }
        
        if (postURL && postURL.length) {
            this.onMarkupChange = function(markup, html) {
                $.ajax({
                    'url': postURL,
                    data: { 'markup': markup, 'html': html },
                    type: 'post'
                });
            };
        }
    },
    
    /**
     * Scrolls to the active block
     * 
     * @constructor
     * @param {Number} delay
     * @param {Number} topOffset
     */
    ScrollTo: function(delay, topOffset) {
        if (!$.isNumeric(delay)) {
            delay = 300;
        }
        
        if (!$.isNumeric(topOffset)) {
            topOffset = 50;
        }
        
        var scrollTimeout;
        this.onPreStartEditing = function(block) {
            window.clearTimeout(scrollTimeout);
            scrollTimeout = window.setTimeout(
                function() {
                    $('html, body').animate({
                    	scrollTop: block.getElement().offset().top - topOffset
                    }, 750);
                },
                delay
            );
        };
    },
    
    /**
     * Blinks/highlights the edited text block for a short time after the editor is exited. 
     * 
     * @constructor
     * @param {String} color      Color (CSS) in which to blink
     */
    Blink: function(color) {
        if (!color) {
            color = '#FFFBCC';
        }
      
        var $visibleElements = [];
        this.onPreStopEditing = function() {
            $visibleElements = this.getElement().find('.lyme-block .preview:hidden');
        };
        this.onPostStopEditing = function() {
            $visibleElements.each(function() {
                var $preview = $(this);
                var originalBgColor = $preview.css('backgroundColor');
                
                $preview.css({
                    opacity: 0,
                    backgroundColor: color
                });
                
                $preview.animate(
                    { opacity: 1 },
                    200,
                    function() {
                        window.setTimeout(function() {
                            $preview.css({
                                backgroundColor: originalBgColor
                            });
                        }, 600);
                    }
                );
            });
        };
    }
};