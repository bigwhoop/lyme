module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> v<%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd") %>) | http://bigwhoop.github.io/lyme | MIT License */\n'
            },
            build: {
                src: ['src/lyme.js', 'src/renderers.js', 'src/hotkeys.js', 'src/plugins.js'],
                dest: 'build/jquery.lyme.min.js'
            }
        },
        concat: {
            build: {
                src: ['src/lyme.js', 'src/renderers.js', 'src/hotkeys.js', 'src/plugins.js'],
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
    
    grunt.registerTask('default', ['uglify', 'concat', 'less']);
};