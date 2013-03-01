/**
 * This file is part of LYME (Low Key Markdown Editor).
 *
 * (c) Philippe Gerber <philippe@bigwhoop.ch>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
$.fn.lyme = function(userOptions) {
    var defaultOptions = {
        text         : '',
        onTextChange : null,
        plugins      : [],
        basePlugins  : [
            $.fn.lyme.plugins.showdown,
            $.fn.lyme.plugins.scrollTo
        ]
    };
    
    var options = $.extend(defaultOptions, userOptions);
    
    if ($.isFunction(options.onTextChange)) {
        options.plugins.push({
            onTextChange : options.onTextChange
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
        
        var retVal;
        
        var fnCall = function(plugin) {
            if ($.isFunction(plugin[event])) {
                retVal = plugin[event].apply(null, data);
            }
        };
        
        options.basePlugins.forEach(fnCall);
        options.plugins.forEach(fnCall);
        
        return retVal;
    }
    
    
    /**
     * Creates blocks by splitting up text by "paragraphs" (two linebreaks).
     *
     * @param {String} text
     * @return {Array}
     */
    function createBlocks(text) {
        text = text.replace(/\r/g, '');
        text = text.replace(/\n\n\n/g, "\n\n");
        return text.split("\n\n");
    }


    /**
     * Converts text to HTML
     *
     * @param {String} text
     * @return {String}
     */
    function convertTextToHTML(text) {
        return informPlugins('onTextToHtmlConversion', [text]);
    }


    /**
     * Generate a random ID to assign to each block
     *
     * @return {Number}
     */
    function generateRandomBlockId() {
        return Math.floor(Math.random() * 999999);
    }


    /**
     * Hide edit controls
     */
    function hideEditor() {
        $('.lyme-block .code:visible textarea').blur();
        $('.lyme-block .code:visible').hide();
        $('.lyme-block .preview').show();
    }

    /**
     * Open the edit controls for the given box.
     * 
     * @param {$} $block
     */
    function editBlock($block) {
        $block.find('.preview').trigger('click');
    }
    

    /**
     * Render a block
     *
     * @param {String} blockText
     * @return {$}
     */
    function renderBlock(blockText) {
        var blockId   = generateRandomBlockId(),
            $block    = $('<div id="lyme-block-' + blockId + '" class="lyme-block">'),
            $code     = $('<div class="code">'),
            $textarea = $('<textarea>' + blockText + '</textarea>'),
            $preview  = $('<div class="preview">');

        $code.hide()
             .append($textarea);

        $block.append($code)
              .append($preview);

        $textarea.on('keydown', function(e) {
            // TAB - Add 4 spaces and then regain focus to the textarea
            if (e.keyCode == 9) {
                e.preventDefault();
                
                var that      = this,
                    oldCursor = that.selectionStart;

                // Insert 4 spaces
                that.value = that.value.substring(0, that.selectionStart)
                           + '    '
                           + that.value.substring(that.selectionEnd, that.value.length);

                // Regain focus and set cursor
                setTimeout(function() {
                    that.focus();
                    that.setSelectionRange(oldCursor + 4, oldCursor + 4);
                }, 0);
            }
            
            // ESCAPE - hide current editor
            else if (27 == e.keyCode) {
                hideEditor();
            }
    
            // ALT + CTRL + SHIFT + ARROW UP - place before previous block
            else if (e.altKey && e.ctrlKey && e.shiftKey && e.keyCode == 38) {
                $prev = $block.prev();
                if ($prev.length) {
                    var thisCode = $textarea.val(),
                        prevCode = $prev.find('.code textarea').val();
                    
                    $textarea.val(prevCode);
                    $prev.find('.code textarea').val(thisCode);
                    editBlock($prev);
                }
            }
    
            // ALT + CTRL + ARROW DOWN - place after next block
            else if (e.altKey && e.ctrlKey && e.shiftKey && e.keyCode == 40) {
                $next = $block.next();
                if ($next.length) {
                    var thisCode = $textarea.val(),
                        nextCode = $next.find('.code textarea').val();
                    
                    $textarea.val(nextCode);
                    $next.find('.code textarea').val(thisCode);
                    editBlock($next);
                }
            }
    
            // ALT + CTRL + ARROW UP - go to previous block
            else if (e.altKey && e.ctrlKey && e.keyCode == 38) {
                $prev = $block.prev();
                if ($prev.length) {
                    editBlock($prev);
                }
            }
    
            // ALT + CTRL + ARROW DOWN - go to next block
            else if (e.altKey && e.ctrlKey && e.keyCode == 40) {
                $next = $block.next();
                if ($next.length) {
                    editBlock($next);
                }
            }
    
            // ALT + CTRL + RETURN - append new block to current block
            else if (e.altKey && e.ctrlKey && e.keyCode == 13) {
                var newBlockTexts = createBlocks('');
                var $newBlock = renderBlock(newBlockTexts[0]);
                $block.after($newBlock);
                editBlock($newBlock);
            }
    
            // ALT + CTRL + BACKSPACE - remove block
            else if (e.altKey && e.ctrlKey && e.keyCode == 8) {
                $textarea.val('');
                
                $prev = $block.prev();
                $next = $block.next();
                if ($prev.length) {
                    editBlock($prev);
                } else if ($next.length) {
                    editBlock($next);
                } else {
                    hideEditor();
                }
            }
        });

        // If the preview box is clicked, we show the textarea to make the block editable.
        $preview.on('click', function() {
            hideEditor();
            
            informPlugins('onPreStartEditing', [$block]);

            $preview.hide();
            $code.show();
            $textarea.focus();

            informPlugins('onPostStartEditing', [$block]);
        });
        

        // Helper function to update the preview text of the current block.
        function updatePreviewText() {
            var text           = $textarea.val(),
                newBlocks      = createBlocks(text),
                $appendToBlock = $block;
            
            $.each(newBlocks, function(idx, newBlockText) {
                var newBlockHtml = convertTextToHTML(newBlockText);
                
                // Replace current block
                if (idx == 0) {
                    $textarea.val(newBlockText);
                    $preview.html(newBlockHtml);
                }

                // Append new blocks
                else {
                    var $newBlock = renderBlock(newBlockText);
                    $appendToBlock.after($newBlock);
                    $appendToBlock = $newBlock;
                }
            });

            // Extract all text and pass it to a callback.
            informPlugins('onTextChange', [getFullText()]);
        }

        // Make sure preview text is up to date.
        updatePreviewText();

        // We update the preview text every time the focus of the textarea is lost.
        $textarea.on('focusout', function() {
            if ($textarea.val() == '') {
                $block.remove();
            }
            
            updatePreviewText();
        });

        return $block;
    }


    /**
     * Render the complete text from all blocks/blocks
     * 
     * @return {string}
     */
    function getFullText() {
        var fullText = [];

        $('.lyme-block .code textarea').each(function() {
            fullText.push($(this).val());
        });

        return fullText.join("\r\n\r\n");
    }

    // Register global click event
    $(document).on('click', function(e) {
        hideEditor();
    });

    return this.each(function() {
        var $container = $(this),
            blocks     = createBlocks(options.text);

        // Stop click events from reaching the document level
        $container.on('click', function(e) {
            e.stopPropagation();
        });

        $.each(blocks, function(idx, blockText) {
            var $block = renderBlock(blockText);
            $container.append($block);
        });
        
        informPlugins('onTextChange', [getFullText()]);
    });
};


/**
 * Some base plugins
 * 
 * @type {Object}
 */
$.fn.lyme.plugins = {
    /**
     * Markdown conversion using Showdown
     * 
     * @return {Object}
     */
    showdown: {
        converter : null,
        onTextToHtmlConversion : function(text) {
            if (!this.converter) {
                this.converter = new Showdown.converter();
            }
            
            return this.converter.makeHtml(text);
        }
    },


    /**
     * Scroll to active block using jQuery scrollTo plugin
     * 
     * @return {Object}
     */
    scrollTo: {
        scrollTimeout : null,
        onPreStartEditing : function($block) {
            window.clearTimeout(this.scrollTimeout);
            this.scrollTimeout = window.setTimeout(
                function() {
                    $.scrollTo(
                        $block,
                        {
                            duration : 750,
                            offset   : { top : -100, left : 0 }
                        }
                    );
                },
                200
            );
        }
    }
};