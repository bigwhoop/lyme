/**
 * This file is part of LYME (Low Key Markup Editor).
 *
 * (c) Philippe Gerber <philippe@bigwhoop.ch>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
$.fn.lyme = function(userOptions) {
    var defaultOptions = {
        markup         : '',
        onMarkupChange : null,
        onPreInit      : null,
        onPostInit     : null,
        renderer       : new $.fn.lyme.renderers.JSMarkdownExtra(),
        plugins        : [ new $.fn.lyme.plugins.ScrollTo() ],
        hotKeys        : $.fn.lyme.hotKeys
    };
    
    var options = $.extend(defaultOptions, userOptions);
    
    // If the 'markup' option is a jQuery object, we setup an adapter plugin for the selected element.
    if (options.markup instanceof $) {
        var $e = options.markup;
        options.plugins.push(new $.fn.lyme.plugins.TextareaAdapter($e));
    }
    
    // Let's see, whether we can retrieve the markup from one of the plugins.
    options.plugins.forEach(function(plugin) {
        if ($.isFunction(plugin.onGetMarkup)) {
            options.markup = plugin.onGetMarkup();
        }
    });
    
    // Wrapper function to put some options into a plugin.
    var wrapperPlugin = {};
    $.each(['onMarkupChange', 'onPreInit', 'onPostInit'], function() {
        if ($.isFunction(options[this])) {
            wrapperPlugin[this] = options[this];
        }
    });
    options.plugins.push(wrapperPlugin);
    
    if (this.length == 1) {
        return new $.fn.lyme.Editor($(this), options);
    }
    
    var editors = {};
    this.each(function() {
        editors[this.selector] = new $.fn.lyme.Editor($(this), options);
    });
    return editors;
};


/**
 * @param {jQuery} $container
 * @param {Object} options
 * @constructor
 */
$.fn.lyme.Editor = function($container, options) {
    var editor = this;

    /**
     * Initialized the editor
     */
    function initialize() {
        // Stop click events from reaching the document level
        $container.on('click', function(e) {
            e.stopPropagation();
        });

        // Click events normally won't bubble down to the document.
        // So if we hit it, then hide the editor.
        $(document).on('click', function() {
            editor.hideEditor();
        });
        
        // Pass this lyme object to each plugin that has a 'setEditor()' method.    
        options.plugins.forEach(function(plugin) {
            if ($.isFunction(plugin.setEditor)) {
                plugin.setEditor(editor);
            }
        });
        
        informPlugins('onPreInit', [$container, options]);
        editor.setMarkup(options.markup);
        informPlugins('onPostInit', [editor.getFullMarkup(), editor.getFullHTML()]);
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
     * @param {Object} renderer
     */
    editor.setRenderer = function(renderer) {
        options.renderer = renderer;
    };
    
    /**
     * Creates blocks by splitting up text by "paragraphs" (two line breaks).
     * If the renderer provides a splitMarkup function, it is invoked instead
     * of the default splitting.
     *
     * @param {String} markup
     * @returns {Array}
     */
    editor.splitMarkup = function(markup) {
        if ($.isFunction(options.renderer.split)) {
            return options.renderer.split(markup);
        }
        return markup.replace(/\r/g, '').replace(/\n\n\n/g, "\n\n").split("\n\n");
    };

    /**
     * @returns {Number}
     */
    var lastBlockId = 0;
    function getNextBlockId() {
        return lastBlockId++;
    }

    /**
     * Render a block
     *
     * @param {String} blockText
     * @param {String} blockHTML        The HTML representation of blockText (optional)
     * @returns {$.fn.lyme.Block}
     */
    editor.createBlock = function(blockText, blockHTML) {
        if (!blockHTML) {
            blockHTML = options.renderer.render(blockText);
        }
        
        var blockId   = getNextBlockId(),
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
        function updatePreviewText(oldBlockText) {
            var blockText = $textarea.val(),
                $appendToBlock = $block;
            
            $.each(editor.splitMarkup(blockText), function(idx, newBlockText) {
                var newBlockHTML = options.renderer.render(newBlockText);
                
                if (idx == 0) { // Replace current block
                    $textarea.val(newBlockText);
                    $preview.html(newBlockHTML);
                } else { // Append new blocks
                    var newBlock = editor.createBlock(newBlockText, newBlockHTML);
                    $appendToBlock.after(newBlock.getElement());
                    $appendToBlock = newBlock.getElement();
                }
            });
            
            if (oldBlockText != blockText) {
                informPlugins('onMarkupChange', [editor.getFullMarkup(), editor.getFullHTML()]);
            }
            
            return blockText;
        }

        // We update the preview text every time the focus of the textarea is lost.
        $textarea.on('focusout', function() {
            informPlugins('onPreStopEditing', [block]);
            if ($textarea.val() == '') {
                $block.remove();
            }
            blockText = updatePreviewText(blockText);
            informPlugins('onPostStopEditing', [block]);
        });
        
        // If a key is pressed while editing a block, we check all the registered hot keys.
        $textarea.on('keydown', function(e) {
            for (var hotKeyName in options.hotKeys) {
                var hotKey = options.hotKeys[hotKeyName];
                if (hotKey.if(e)) {
                    e.preventDefault();
                    hotKey.do(editor, block);
                }
            }
        });

        // If the preview box is clicked, we show the textarea to make the block editable.
        $preview.on('click', function() {
            editor.hideEditor();
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
    editor.getFullMarkup = function() {
        var fullText = [];
        $container.find('.lyme-block .markup textarea').each(function() {
            fullText.push($(this).val());
        });
        return fullText.join("\r\n\r\n");
    };

    /**
     * Render the Markup from all blocks.
     * 
     * @returns {string}
     */
    editor.getFullHTML = function() {
        return options.renderer.render(editor.getFullMarkup());
    };

    /**
     * @param {String} markup
     */
    editor.setMarkup = function(markup) {
        $container.empty();
        $.each(editor.splitMarkup(markup), function(idx, blockText) {
            var block = editor.createBlock(blockText);
            $container.append(block.getElement());
        });
    };

    /**
     * Return the element of this LYME editor.
     * 
     * @returns {jQuery}
     */
    editor.getElement = function() {
        return $container;
    };

    /**
     * Hide edit controls
     */
    editor.hideEditor = function() {
        $container.find('.lyme-block .markup:visible textarea').blur();
        $container.find('.lyme-block .markup:visible').hide();
        $container.find('.lyme-block .preview').show();
    };
    
    initialize();
};


/**
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
 * This file is part of LYME (Low Key Markup Editor).
 *
 * (c) Philippe Gerber <philippe@bigwhoop.ch>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

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

        /**
         * Renders the markup into HTML
         * 
         * @param {String} markup
         * @returns {String}
         */
        this.render = function(markup) {
            if (!converter) {
                converter = new MarkdownExtra_Parser();
                converter.init();
            }
            return converter.transform(markup);
        };
        
        /**
         * Creates blocks by splitting up text by "paragraphs" (two line breaks).
         * Also makes sure that fenced code blocks are not separated.
         *
         * @param {String} markup
         * @returns {Array}
         */
        this.split = function(markup) {
            var texts = markup.replace(/\r/g, '').replace(/\n\n\n/g, "\n\n").split("\n\n")
            
            // Make sure we don't break up fenced code blocks.
            var blocks = [];
            var codeBlock = [];
            for (var i = 0; i < texts.length; i++) {
                if (codeBlock.length == 0) {
                    if (texts[i].indexOf('~~~') > -1) {
                        codeBlock.push(texts[i]);
                    } else {
                        blocks.push(texts[i]);
                    }
                } else {
                    codeBlock.push(texts[i]);
                    if (texts[i].indexOf('~~~') > -1) {
                        blocks.push(codeBlock.join("\n\n"));
                        codeBlock = [];
                    }
                }
            }
            if (codeBlock.length) {
                blocks.push(codeBlock.join("\n\n"));
            }
            return blocks;
        };
    },
    
    /**
     * Markdown conversion using Showdown.
     * 
     * @constructor
     * @returns {Object}
     */
    Showdown: function() {
        var converter;

        /**
         * Renders the markup into HTML
         * 
         * @param {String} markup
         * @returns {String}
         */
        this.render = function(markup) {
            if (!converter) {
                converter = new Showdown.converter();
            }
            return converter.makeHtml(markup);
        };
    }
};
/**
 * This file is part of LYME (Low Key Markup Editor).
 *
 * (c) Philippe Gerber <philippe@bigwhoop.ch>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

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