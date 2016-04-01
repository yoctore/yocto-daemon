'use strict';

module.exports = function (grunt) {
  // init config
  grunt.initConfig({
    // default package
    pkg       : grunt.file.readJSON('package.json'),

    // hint our app
    yoctohint : {
      options  : {},
      all      : [ 'src/index.js', 'Gruntfile.js' ]
    },

    // Uglify our app
    uglify    : {
      options : {
        banner  : '/* <%= pkg.name %> - <%= pkg.description %> - V<%= pkg.version %> */\n'
      },
      api     : {
        src    : 'src/index.js',
        dest   : 'dist/index.js'
      }
    },

    // test our app
    mochacli  : {
      options : {
        'reporter'       : 'spec',
        'inline-diffs'   : false,
        'no-exit'        : true,
        'force'          : false,
        'check-leaks'    : true,
        'bail'           : false
      },
      all     : [ 'test/*.js' ]
    }
  });

  // load tasks
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-mocha-cli');
  grunt.loadNpmTasks('yocto-hint');

  // register tasks
  grunt.registerTask('hint', [ 'yoctohint' ]);
  grunt.registerTask('tests', 'mochacli');
  grunt.registerTask('build', [ 'yoctohint', 'uglify' ]);
  grunt.registerTask('default', [ 'tests', 'build' ]);
};
