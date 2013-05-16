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