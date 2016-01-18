module.exports = function(grunt) {
  var banner = '/*! Version: <%= pkg.version %>\nDate: <%= grunt.template.today("yyyy-mm-dd") %> */\n(function (){\n\'use strict\';';
  var footer = '\n}());'
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: banner,
        preserveComments: 'some',
        sourceMap: true,
        footer: footer
      },
      dist: {
        files: {
          'dist/leaflet.groupedlayercontrol.min.js': 'src/leaflet.groupedlayercontrol.js'
        }
      }
    },
    cssmin: {
      dist: {
        files: {
          'dist/leaflet.groupedlayercontrol.min.css': 'src/leaflet.groupedlayercontrol.css'
        }
      }
    },
    bump: {
      options: {
        files: ['bower.json', 'package.json'],
        commitFiles: ['bower.json', 'commit.json'],
        push: false
      }
    }
  });

  grunt.registerTask('default', ['uglify', 'cssmin']);
};
