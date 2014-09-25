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
        plugins        : [ new $.fn.lyme.plugins.ScrollTo(), new $.fn.lyme.plugins.Blink() ],
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
                plugin[event].apply(editor, data);
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
     * If the renderer provides a split() function, it is invoked instead
     * of the default behavior in this function.
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
     * Joins blocks again to provide the complete markup of all blocks.
     * If the renderer provides a join() function, it is invoked instead
     * of the default behavior in this function.
     *
     * @param {Array} markups
     * @returns {String}
     */
    editor.joinMarkup = function(markups) {
        if ($.isFunction(options.renderer.join)) {
            return options.renderer.join(markups);
        }
        return markups.join("\n\n");
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
        return editor.joinMarkup(fullText);
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
        $container.find('.lyme-block .markup:visible textarea:focus').blur();
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
