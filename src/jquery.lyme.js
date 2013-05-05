/**
 * This file is part of LYME (Low Key Markup Editor).
 *
 * (c) Philippe Gerber <philippe@bigwhoop.ch>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
$.fn.lyme = function(userOptions) {
    var lyme = this;
    
    var defaultOptions = {
        text           : '',
        onMarkupChange : null,
        renderer       : new $.fn.lyme.renderers.JSMarkdownExtra(),
        plugins        : [ new $.fn.lyme.plugins.ScrollTo() ],
        hotKeys        : $.fn.lyme.hotKeys
    };
    
    var options = $.extend(defaultOptions, userOptions);
    
    // If the 'text' option is a jQuery object, we retrieve the value
    // from this object and setup a plugin to update the underlying
    // element whenever the text changes.
    if (options.text instanceof $) {
        var $e = options.text;
        options.text = $e.val();
        options.plugins.push(new $.fn.lyme.plugins.ValueUpdater($e, false));
    }
    
    // Wrapper function to put 'onMarkupChange' option into a plugin.
    if ($.isFunction(options.onMarkupChange)) {
        options.plugins.push({
            onMarkupChange : options.onMarkupChange
        });
    }
    

    /**
     * @param {String} event
     * @param {Array} data
     */
    function informPlugins(event, data) {
        if (!$.isArray(data)) {
            data = [];
        }
        
        options.plugins.forEach(function(plugin) {
            if ($.isFunction(plugin[event])) {
                plugin[event].apply(null, data);
            }
        });
    }
    
    
    /**
     * Creates blocks by splitting up text by "paragraphs" (two linebreaks).
     *
     * @param {String} text
     * @returns {Array}
     */
    function splitText(text) {
        text = text.replace(/\r/g, '');
        text = text.replace(/\n\n\n/g, "\n\n");
        return text.split("\n\n");
    }


    /**
     * Generate a random ID to assign to each block
     *
     * @returns {Number}
     */
    function generateRandomBlockId() {
        return Math.floor(Math.random() * 999999);
    }


    /**
     * Hide edit controls
     */
    lyme.hideEditor = function() {
        $('.lyme-block .markup:visible textarea').blur();
        $('.lyme-block .markup:visible').hide();
        $('.lyme-block .preview').show();
    };
    

    /**
     * Render a block
     *
     * @param {String} blockText
     * @param {String} blockHTML        The HTML representation of blockText (optional)
     * @returns {$.fn.lyme.Block}
     */
    lyme.createBlock = function(blockText, blockHTML) {
        if (!blockHTML) {
            blockHTML = options.renderer.render(blockText);
        }
        
        var blockId   = generateRandomBlockId(),
            $block    = $('<div id="lyme-block-' + blockId + '" class="lyme-block">'),
            $markup   = $('<div class="markup"></div>'),
            $textarea = $('<textarea></textarea>'),
            $preview  = $('<div class="preview"></div>');
        
        $textarea.val(blockText);
        $preview.html(blockHTML);
        
        $markup.hide().append($textarea);
        $block.append($markup).append($preview);
        
        var block = new $.fn.lyme.Block($block);

        // Helper function to update the preview text of the current block.
        function updatePreviewText() {
            var text           = $textarea.val(),
                newBlocks      = splitText(text),
                $appendToBlock = $block;
            
            $.each(newBlocks, function(idx, newBlockText) {
                var newBlockHTML = options.renderer.render(newBlockText);
                
                // Replace current block
                if (idx == 0) {
                    $textarea.val(newBlockText);
                    $preview.html(newBlockHTML);
                }

                // Append new blocks
                else {
                    var newBlock = lyme.createBlock(newBlockText, newBlockHTML);
                    $appendToBlock.after(newBlock.getElement());
                    $appendToBlock = newBlock.getElement();
                }
            });
            
            informPlugins('onMarkupChange', [getFullMarkup(), getFullHTML()]);
        }

        // We update the preview text every time the focus of the textarea is lost.
        $textarea.on('focusout', function() {
            informPlugins('onPreStopEditing', [block]);
            if ($textarea.val() == '') {
                $block.remove();
            }
            updatePreviewText();
            informPlugins('onPostStopEditing', [block]);
        });
        
        // If a key is pressed while editing a block, we check all the registered hot keys.
        $textarea.on('keydown', function(e) {
            for (var hotKeyName in options.hotKeys) {
                var hotKey = options.hotKeys[hotKeyName];
                if (hotKey.if(e)) {
                    e.preventDefault();
                    hotKey.do(lyme, block);
                }
            }
        });

        // If the preview box is clicked, we show the textarea to make the block editable.
        $preview.on('click', function() {
            lyme.hideEditor();
            informPlugins('onPreStartEditing', [block]);
            $preview.hide();
            $markup.show();
            $textarea.focus();
            informPlugins('onPostStartEditing', [block]);
        });

        return block;
    };


    /**
     * Return the Markup from all blocks.
     * 
     * @returns {string}
     */
    function getFullMarkup() {
        var fullText = [];
        $('.lyme-block .markup textarea').each(function() {
            fullText.push($(this).val());
        });
        return fullText.join("\r\n\r\n");
    }


    /**
     * Render the Markup from all blocks.
     * 
     * @returns {string}
     */
    function getFullHTML() {
        return options.renderer.render(getFullMarkup());
    }
    

    // Register global click event
    $(document).on('click', function() {
        lyme.hideEditor();
    });
    
    
    return this.each(function() {
        var $container = $(this),
            blocks     = splitText(options.text);

        // Stop click events from reaching the document level
        $container.on('click', function(e) {
            e.stopPropagation();
        });

        $.each(blocks, function(idx, blockText) {
            var block = lyme.createBlock(blockText);
            $container.append(block.getElement());
        });
    });
};


/**
 * Wrapper object for a block.
 * 
 * @constructor
 * @param {jQuery} $block
 */
$.fn.lyme.Block = function($block) {
    /**
     * Start editing this block.
     */
    this.edit = function() {
        $block.find('.preview').trigger('click');
    };
    
    /**
     * Return the previous block.
     * 
     * @returns {$.fn.lyme.Block|Boolean}
     */
    this.getPreviousBlock = function() {
        var $prev = $block.prev();
        return $prev.length ? new $.fn.lyme.Block($prev) : false;
    };
    
    /**
     * Return the next block.
     * 
     * @returns {$.fn.lyme.Block|Boolean}
     */
    this.getNextBlock = function() {
        var $next = $block.next();
        return $next.length ? new $.fn.lyme.Block($next) : false;
    };

    /**
     * @returns {String}
     */
    this.getMarkup = function() {
        return $block.find('textarea').val();
    };

    /**
     * @param {String} markup
     */
    this.setMarkup = function(markup) {
        $block.find('textarea').val(markup);
    };

    /**
     * @returns {jQuery}
     */
    this.getElement = function() {
        return $block;
    };
};


/**
 * Renders transform text into HTML.
 * 
 * @type {Object}
 */
$.fn.lyme.renderers = {
    /**
     * Markdown Extra conversion using JS Markdown Extra.
     * 
     * @constructor
     * @returns {Object}
     */
    JSMarkdownExtra: function() {
        var converter;
        this.render = function(markup) {
            if (!converter) {
                converter = new MarkdownExtra_Parser();
                converter.init();
            }
            return converter.transform(markup);
        }
    },
    
    /**
     * Markdown conversion using Showdown.
     * 
     * @constructor
     * @returns {Object}
     */
    Showdown: function() {
        var converter;
        this.render = function(markup) {
            if (!converter) {
                converter = new Showdown.converter();
            }
            return converter.makeHtml(markup);
        }
    }
};


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
     * Update an element every time the Markup changes. 
     * 
     * @param {String|Object} elementId     String for the element's ID or a jQuery object.
     * @param {Boolean} useHTML             Update the element value with the HTML, instead of the Markup. Default: false.
     * @returns {Object}
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
     * @param {Number} delay
     * @returns {Object}
     */
    ScrollTo: function(delay) {
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


/**
 * Hot keys are invoked when the user on each keydown event of a block's textarea.
 * 
 * @type {Object}
 */
$.fn.lyme.hotKeys = {
    // TAB - Add 4 spaces and then regain focus to the textarea
    'tabbing': {
        indentation: '    ',
        'if': function(e) { return e.keyCode == 9; },
        'do': function(lyme, block) {
            var textarea  = block.getElement().find('textarea').get(0),
                oldCursor = textarea.selectionStart;

            // Insert 4 spaces
            textarea.value = textarea.value.substring(0, textarea.selectionStart)
                           + this.indentation
                           + textarea.value.substring(textarea.selectionEnd, textarea.value.length);

            // Regain focus and set cursor
            setTimeout(function() {
                textarea.focus();
                textarea.setSelectionRange(oldCursor + 4, oldCursor + 4);
            }, 0);
        }
    },
        
    // ESCAPE - hide current editor
    'escape': {
        'if': function(e) { return e.keyCode == 27; },
        'do': function(lyme, block) {
            lyme.hideEditor();
        }
    },

    // ALT + CTRL + SHIFT + ARROW UP - place before previous block
    'place-before': {
        'if': function(e) { return e.altKey && e.ctrlKey && e.shiftKey && e.keyCode == 38; },
        'do': function(lyme, block) {
            var prev = block.getPreviousBlock();
            if (prev) {
                var thisCode = block.getMarkup(),
                    prevCode = prev.getMarkup();
                
                block.setMarkup(prevCode);
                prev.setMarkup(thisCode);
                prev.edit();
            }
        }
    },

    // ALT + CTRL + ARROW DOWN - place after next block
    'place-after': {
        'if': function(e) { return e.altKey && e.ctrlKey && e.shiftKey && e.keyCode == 40; },
        'do': function(lyme, block) {
            var next = block.getNextBlock();
            if (next) {
                var thisCode = block.getMarkup(),
                    nextCode = next.getMarkup();
                
                block.setMarkup(nextCode);
                next.setMarkup(thisCode);
                next.edit();
            }
        }
    },

    // ALT + CTRL + ARROW UP - go to previous block
    'move-up': {
        'if': function(e) { return e.altKey && e.ctrlKey && e.keyCode == 38; },
        'do': function(lyme, block) {
            var prev = block.getPreviousBlock();
            if (prev) {
                prev.edit();
            }
        }
    },

    // ALT + CTRL + ARROW DOWN - go to next block
    'move-down': {
        'if': function(e) { return e.altKey && e.ctrlKey && e.keyCode == 40; },
        'do': function(lyme, block) {
            var next = block.getNextBlock();
            if (next) {
                next.edit();
            }
        }
    },

    // ALT + CTRL + RETURN - append new block to current block
    'append-empty-block': {
        'if': function(e) { return e.altKey && e.ctrlKey && e.keyCode == 13; },
        'do': function(lyme, block) {
            var newBlock = lyme.createBlock('', '');
            block.getElement().after(newBlock.getElement());
            newBlock.edit();
        }
    },

    // ALT + CTRL + BACKSPACE - remove block
    'remove-block': {
        'if': function(e) { return e.altKey && e.ctrlKey && e.keyCode == 8; },
        'do': function(lyme, block) {
            block.setMarkup('');
            
            var prev = block.getPreviousBlock();
            var next = block.getNextBlock();
            if (prev) {
                prev.edit();
            } else if (next) {
                next.edit();
            } else {
                lyme.hideEditor();
            }
        }
    }
};