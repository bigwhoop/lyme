# Welcome to LYME

LYME stands for **&lt;u&gt;L&lt;/u&gt;ow Ke&lt;u&gt;y&lt;/u&gt; &lt;u&gt;M&lt;/u&gt;arkup &lt;u&gt;E&lt;/u&gt;ditor** and guess what, it's simply that. LYME aims to stay in the background and provide you with a distraction-free interface for writing text in your favorite markup language. 

## Editor

### Structure

The given text - or markup - is split into blocks. A block is delimited by two line breaks. Think of it as a paragraph. You can click any block to start editing. **Just try it and click this text.** As soon as you leave a block the `onMarkupChange` callback is invoked.

### Markup Languages

Renderers transform markup into HTML. What markup language you use is up to you. LYME ships with the following renderers (*Markdown Extra* is the default renderer):

Markup Language  | Library Dependencies                                                                                  | Constructor
---------------- | ------------------------------------------------------------------------------------------------------|---------------------------------
Markdown         | `lib/showdown.min.js` ([Showdown](https://github.com/coreyti/showdown))                               | `$.fn.renderers.Showdown`
Markdown Extra   | `lib/js-markdown-extra.js` ([JS Markdown Extra](https://github.com/tanakahisateru/js-markdown-extra)) | `$.fn.renderers.JSMarkdownExtra`

But don't worry, you can override the `renderer` option with an object providing a `render(string markup) string` function and plug in your own renderer.

~~~
$('#lyme').lyme({
    renderer : {
        render: function(markup) {
            var html = ...;
            return html;
        }
    }
});
~~~

### Hot Keys

If you're editing a block you can use the following hot keys to navigate the editor:

Key Combination                   | Effect
----------------------------------|---------------------------
`TAB`                             | Indents code by 4 spaces.
`CTRL + ALT + DOWN ARROW`         | Moves to the next block.
`CTRL + ALT + UP ARROW`           | Moves to the previous block.
`CTRL + ALT + BACKSPACE`          | Deletes the current block.
`CTRL + ALT + RETURN`             | Adds new block below the current block.
`CTRL + ALT + SHIFT + DOWN ARROW` | Places the current block after the next block.
`CTRL + ALT + SHIFT + UP ARROW`   | Places the current block before the previous block.
`ESCAPE`                          | Leaves the current block / exits the editor.

You can provide your own hot keys if you wish. Have a look at the `$.fn.lyme.hotKeys` object and the `hotKeys` option.

Some hot keys, like `TAB`, are configurable:

~~~
$.fn.lyme.hotKeys.tabbing.indentation = "\t"; // Use TAB
$.fn.lyme.hotKeys.tabbing.indentation = '  '; // Use two spaces
~~~


## Integration

### Initialization

Here is some sample code that initializes a LYME editor.

~~~
&lt;html&gt;
&lt;head&gt;
    &lt;link rel="stylesheet" type="text/css" href="build/lyme.css"&gt;
&lt;/head&gt;
&lt;body&gt;
    &lt;div id="editor"&gt;&lt;/div&gt;
    &lt;script src="http://code.jquery.com/jquery-1.9.1.min.js"&gt;&lt;/script&gt;
    &lt;script src="/lib/js-markdown-extra.js"&gt;&lt;/script&gt;
    &lt;script src="/build/jquery.lyme.min.js"&gt;&lt;/script&gt;
    &lt;script&gt;
        $('#editor').lyme({
            text : "# Hi there\n\nI am text!",
            onMarkupChange : function(markup, html) {
                console.log(markup, html);
            }
        });
    &lt;/script&gt;
&lt;/body&gt;
&lt;/html&gt;
~~~

LYME provides a shortcut to read and write to a textarea element. Just provide the selected element as the `text` option and LYME will automatically setup a plugin to update the element whenever the markup changes.

~~~
$('#lyme').lyme({
    text : $('#markup')
});
~~~


## Plugins

Plugin enhance the functionality of LYME. The following plugins come with LYME.

Name         | Description                                         | Library Dependencies          | Constructor                      | Enabled
-------------|-----------------------------------------------------|-------------------------------|----------------------------------|------------------------------
ScrollTo     | Smooth scrolling to active block.                   | `lib/jquery.scroll-to.min.js` | `$.fn.lyme.plugins.ScrollTo`     | if `$.scrollTo` is available
ValueUpdater | Updates an element's value when the markup changes. | none                          | `$.fn.lyme.plugins.ValueUpdater` | no

### Writing your own plugins

You can register plugins (plain objects) with callback functions which are invoked on various events.

`onMarkupChange(string markup, string html)`  
Called when the markup of a block was updated. Returns the markup and HTML of all blocks.

`onBlockChange(string markup, string html)`  
Called when the markup of a block was updated. Returns the markup and HTML of the edited block.

`onPreStartEditing($.fn.lyme.Block $block)`  
Called when a block is about to go into edit mode. 

`onPostStartEditing($.fn.lyme.Block block)`  
Called after a block went into edit mode.