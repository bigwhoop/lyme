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