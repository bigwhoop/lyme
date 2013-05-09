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
        markup         : '',
        onMarkupChange : null,
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
        function updatePreviewText(oldBlockText) {
            var blockText = $textarea.val(),
                $appendToBlock = $block;
            
            $.each(splitText(blockText), function(idx, newBlockText) {
                var newBlockHTML = options.renderer.render(newBlockText);
                
                if (idx == 0) { // Replace current block
                    $textarea.val(newBlockText);
                    $preview.html(newBlockHTML);
                } else { // Append new blocks
                    var newBlock = lyme.createBlock(newBlockText, newBlockHTML);
                    $appendToBlock.after(newBlock.getElement());
                    $appendToBlock = newBlock.getElement();
                }
            });
            
            if (oldBlockText != blockText) {
                informPlugins('onMarkupChange', [getFullMarkup(), getFullHTML()]);
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
    

    // Click events normally won't bubble down to the document.
    // So if we hit it, then hide the editor.
    $(document).on('click', function() {
        lyme.hideEditor();
    });
    
    
    return this.each(function() {
        var $container = $(this),
            blocks     = splitText(options.markup);

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
