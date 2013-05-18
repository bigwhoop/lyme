module.exports = function(grunt) {
    var src_files = ['src/lyme.js', 'src/renderers.js', 'src/hotkeys.js', 'src/plugins.js', 'src/plugins.undoredo.js'];
    
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            none: {
                options: {
                    banner: '/*! <%= pkg.name %> v<%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd") %>) | http://bigwhoop.github.io/lyme | MIT License */\n'
                },
                src: src_files,
                dest: 'build/jquery.lyme.min.js'
            },
            markdown_extra: {
                options: {
                    banner: '/*! <%= pkg.name %> v<%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd") %>) with Markdown Extra and scroll_to plugin | http://bigwhoop.github.io/lyme | MIT License */\n'
                },
                src: src_files.concat(['jquery.scroll-to.min.js', 'lib/js-markdown-extra.js']),
                dest: 'build/jquery.lyme-markdown-extra.min.js'
            }
        },
        concat: {
            build: {
                src: src_files,
                dest: 'build/jquery.lyme.js'
            }
        },
        less: {
            build: {
                src: 'src/lyme.less',
                dest: 'build/lyme.css'
            }
        }
    });
    
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-less');
    
    grunt.registerTask('default', ['uglify:none', 'uglify:markdown_extra', 'concat', 'less']);
};