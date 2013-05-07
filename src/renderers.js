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