# Welcome to LYME

LYME stands for **<u>L</u>ow Ke<u>y</u> <u>M</u>arkup <u>E</u>ditor** and guess what, it's simply that. LYME aims to
stay in the background and provide you with a distraction-free interface for writing text in your favorite markup
language. 

## Editor

### Structure

The given text - or markup - is split into blocks. A block is delimited by two line breaks. Think of it as a paragraph.
You can click any block to start editing. **Just try it and click this text.** As soon as you leave a block the
`onMarkupChange` callback is invoked.

### Markup Languages

Renderers transform markup into HTML. What markup language you use is up to you. LYME ships with the following renderers
(*Markdown Extra* is the default renderer):

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

Here is some sample code that initializes a LYME editor.

~~~
<html>
<head>
    <link rel="stylesheet" type="text/css" href="build/lyme.css">
</head>
<body>
    <div id="editor"></div>
    <script src="http://code.jquery.com/jquery-1.9.1.min.js"></script>
    <script src="/lib/js-markdown-extra.js"></script>
    <script src="/build/jquery.lyme.min.js"></script>
    <script>
        $('#editor').lyme({
            text : "# Hi there\n\nI am text!",
            onMarkupChange : function(markup, html) {
                console.log(markup, html);
            }
        });
    </script>
</body>
</html>
~~~

LYME provides a shortcut to read and write to a textarea element. Just provide the selected element as the `text` option
and LYME will automatically setup a plugin to update the element whenever the markup changes.

~~~
$('#editor').lyme({
    text : $('#textarea')
});
~~~


## Plugins

Plugin enhance the functionality of LYME. Some plugins are provided by LYME and may be even be enabled by default.

### ScrollTo

Provides smooth scrolling when to a block block you've started to edit.

~~~
$.fn.lyme.plugins.ScrollTo(delay)
~~~

Param               | Type                   | Required | Default Value | Description
--------------------|------------------------|----------|---------------|-------------
`delay`             | Number                 | no       | `200`         | How fast the page scrolls to the activated block.

~~~
new $.fn.lyme.plugins.ScrollTo()
new $.fn.lyme.plugins.ScrollTo(500)
~~~

* You must include the ScrollTo jQuery plugin: `<script src="lib/jquery.scroll-to.min.js"></script>`
* The plugin is enabled by default, if the `$.scrollTo()` function is available.

### ValueUpdater

Updates an element's value with whenever the markup changes.

~~~
$.fn.lyme.plugins.ValueUpdater(elementId, useHTML)
~~~

Param               | Type                   | Required | Default Value | Description
--------------------|------------------------|----------|---------------|-------------
`elementId`         | String or `$` Object   | yes      | -             | The `textarea` element's selector.
`useHTML`           | Boolean                | no       | `false`       | If `true`, the HTML and not the markup of the page is set as the element's value.

~~~
new $.fn.lyme.plugins.ValueUpdater('#textarea')
new $.fn.lyme.plugins.ValueUpdater($('#textarea'))
new $.fn.lyme.plugins.ValueUpdater($('.something > textarea'), true)
~~~

### ContentGuard

Asks the user to confirm leaving the page, when he has made changes to the markup. 

~~~
$.fn.lyme.plugins.ContentGuard(disableOnFormSubmit, isEnabled)
~~~

Param                 | Type                   | Required | Default Value | Description
----------------------|------------------------|----------|---------------|-------------
`disableOnFormSubmit` | Boolean                | no       | `true`        | Automatically disable the guard whenever a form is submitted.
`isEnabled`           | Boolean                | no       | `true`        | Whether the guard is enabled or not.

This is the behavior used when `disableOnFormSubmit` is `true`.

~~~
var doorGuard = new $.fn.lyme.plugins.ContentGuard();
$(document).on('submit', 'form', function() {
    doorGuard.disable();
});
~~~

If you want to enable the guard after 20 seconds, you could use something along these lines:

~~~
var doorGuard = new $.fn.lyme.plugins.ContentGuard(true, false);
window.setTimeout(function() {
    doorGuard.enable();
}, 20000);
~~~

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