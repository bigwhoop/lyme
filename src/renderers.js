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
            markup = markup.replace(/\r/g, '');
            
            var re = new RegExp(
                '(?:'           + // non-capturing group
                  '~{3,}[ ]*\n' + // anything that starts with at least 3 tildes followed by whitespace and a line break
                  '[^]*?'       + // any character, ungreedy
                  '\n~{3,}'     + // and ends with a new line followed by at least 3 tildes
                ')+'            , // each match is one or more of the things described in the group
                "g"
            );
            
            var placeholders = [];
            markup.replace(re, function(match) {
                var placeholder = "_LYME_PLACEHOLDER_" + placeholders.length + "_";
                markup = markup.replace(match, placeholder);
                placeholders.push(match);
            });
            
            var blocks = markup.replace(/\n\n\n/g, "\n\n").split("\n\n");
            
            for (var placeholderIdx in placeholders) {
                $.each(blocks, function(idx, block) {
                    if (block == "_LYME_PLACEHOLDER_" + placeholderIdx + "_") {
                        blocks[idx] = placeholders[placeholderIdx];
                    }
                });
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
        
    /**
     * Wiki markup conversion using wiky.js
     * 
     * @constructor
     * @param {Object} options      Options, delegated to wiky.process()
     * @returns {Object}
     */
    /*WikyJS: function(options) {
        this.render = function(markup) {
            var html = wiky.process(markup, options);
            html = '<p>' + html.replace(/\n\n/, '</p><p>') + '</p>';
            return html;
        };
    }*/
};