MARKDOWN_EMPTY_ELEMENT_SUFFIX = '>';

var editor = $('#editor').lyme();

QUnit.test("Editor", function() {
    deepEqual(editor.splitMarkup("Hello\n\r\nTom\nSawyer\n\r\n\n\r."), ["Hello", "Tom\nSawyer", "."], 'Splitting markdown extra.');
    deepEqual(editor.splitMarkup("~~~\r\n\n...\n\r\n~~~"), ["~~~\n\n...\n\n~~~"], 'Splitting markdown extra fenced code block.');
    
    var markup = "Hello  \n**Tom**";
    editor.setMarkup(markup);
    strictEqual(editor.getFullMarkup(), markup, 'Getting markup.');
    strictEqual(editor.getFullHTML(), "<p>Hello<br>\n<strong>Tom</strong></p>\n", 'Getting HTML.');
});

var block = editor.createBlock("# Hi\n\nTom")
QUnit.test("Block", function() {
    strictEqual(block.getMarkup(), "# Hi\n\nTom", 'Getting markup.');
    block.setMarkup("Foo")
    strictEqual(block.getMarkup(), "Foo", 'Changing markup.');
    strictEqual(block.getPreviousBlock(), false, 'Previous block unavailable.');
    strictEqual(block.getNextBlock(), false, 'Next block unavailable.');
});

var markdownRenderer = new $.fn.lyme.renderers.Showdown();
QUnit.test("Markdown", function() {
    editor.setRenderer(markdownRenderer);
    
    deepEqual(editor.splitMarkup("Hello\n\r\nTom\nSawyer\n\r\n\n\r."), ["Hello", "Tom\nSawyer", "."], 'Splitting markdown (editor).');
    deepEqual(editor.splitMarkup("~~~\r\n\n...\n\r\n~~~"), ["~~~", "...", "~~~"], 'Splitting markdown fenced code block (editor).');
    
    strictEqual(markdownRenderer.render("Hello  \n**Tom**"), '<p>Hello <br />\n<strong>Tom</strong></p>');
    strictEqual(markdownRenderer.render("# Hello"), '<h1 id="hello">Hello</h1>');
    strictEqual(markdownRenderer.render("    Hello"), "<pre><code>Hello\n</code></pre>");
    strictEqual(markdownRenderer.render("    <script>log('bla');</script>"), "<pre><code>&lt;script&gt;log('bla');&lt;/script&gt;\n</code></pre>");
});

var markdownExtraRenderer = new $.fn.lyme.renderers.JSMarkdownExtra();
QUnit.test("Markdown Extra", function() {
    editor.setRenderer(markdownExtraRenderer);
    
    deepEqual(editor.splitMarkup("Hello\n\r\nTom\nSawyer\n\r\n\n\r."), ["Hello", "Tom\nSawyer", "."], 'Splitting markdown extra (editor).');
    deepEqual(editor.splitMarkup("~~~\r\n\n...\n\r\n~~~"), ["~~~\n\n...\n\n~~~"], 'Splitting markdown extra fenced code block (editor).');
    
    deepEqual(markdownExtraRenderer.split("Hello\n\r\nTom\nSawyer\n\r\n\n\r."), ["Hello", "Tom\nSawyer", "."], 'Splitting markdown extra (renderer).');
    deepEqual(markdownExtraRenderer.split("~~~\r\n\n...\n\r\n~~~"), ["~~~\n\n...\n\n~~~"], 'Splitting markdown extra fenced code block (renderer).');
    
    strictEqual(markdownExtraRenderer.render("Hello  \n**Tom**"), "<p>Hello<br>\n<strong>Tom</strong></p>\n");
    strictEqual(markdownExtraRenderer.render("# Hello"), "<h1>Hello</h1>\n");
    strictEqual(markdownExtraRenderer.render("a\n\n    Hello"), "<p>a</p>\n\n<pre><code>Hello\n</code></pre>\n");
    strictEqual(markdownExtraRenderer.render("a\n\n    <script>log('bla');</script>"), "<p>a</p>\n\n<pre><code>&lt;script&gt;log('bla');&lt;/script&gt;\n</code></pre>\n");
    strictEqual(markdownExtraRenderer.render("~~~\n<script>log('bla');</script>\n~~~"), "<pre><code>&lt;script&gt;log('bla');&lt;/script&gt;\n</code></pre>\n");
    strictEqual(markdownExtraRenderer.render("<script></script>"), "<script></script>\n");
    strictEqual(markdownExtraRenderer.render("`<script></script>`"), "<p><code>&lt;script&gt;&lt;/script&gt;</code></p>\n");
});


/*var wikyRenderer = new $.fn.lyme.renderers.WikyJS();
QUnit.test("Wiki", function() {
    editor.setRenderer(wikyRenderer);
    
    var markup = "Hello [b]Tom[/b]!\n\nURL: [url=http://example.com]Example[/url]";
    var expected = "Hello <b>Tom</b>!<br><br>URL: <a style=\"text-decoration: underline; color: blue\" href=\"http://example.com\">Example</a>";
    
    editor.setMarkup(markup);
    strictEqual(editor.getFullHTML(), expected);
    strictEqual(bbCodeRenderer.render(markup), expected);
    //'\n\n[code]Some code here[/code]\n\nHa, , [b][color=blue]I see[/color][/b]'
});*/