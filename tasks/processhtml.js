/*
 * grunt-processhtml
 * https://github.com/dciccale/grunt-processhtml
 *
 * Copyright (c) 2013-2014 Denis Ciccale (@tdecs)
 * Licensed under the MIT license.
 * https://github.com/dciccale/grunt-processhtml/blob/master/LICENSE-MIT
 */

'use strict';

var lodash = require('lodash');
var path = require('path');
var async = require('async');

var HTMLProcessor = require('htmlprocessor');

const getSettings = (settingsFilePath, grunt) => {
  const settingsFiles = [
    '/settings.yaml',
    '/settings.json',
    '/../settings.yaml',
    '/../settings.json',
  ];
  let settingsFile;
  let returnData = false;
  for (let i = 0; i < settingsFiles.length; i++) {
    settingsFile = settingsFilePath + settingsFiles[i];
    if (path.extname(settingsFile) === '.yaml' && grunt.file.exists(settingsFile)) {
      return grunt.file.readYAML(settingsFile);
    } else if (path.extname(settingsFile) === '.json' && grunt.file.exists(settingsFile)) {
      return grunt.file.readJSON(settingsFile);
    }
  }
  grunt.log.warn('Settings file not found!');
  return false;
}

module.exports = function (grunt) {

  grunt.registerMultiTask('processhtml', 'Process html files at build time to modify them depending on the release environment', function () {
    var options = this.options({
      process: false,
      data: {},
      templateSettings: null,
      includeBase: null,
      commentMarker: 'build',
      strip: false,
      recursive: false,
      customBlockTypes: [],
      environment: this.target
    });

    var done = this.async();
    var html = new HTMLProcessor(options);

    async.eachSeries(this.files, function (f, n) {
      var destFile = path.normalize(f.dest);

      var srcFiles = f.src.filter(function (filepath) {
        // Warn on and remove invalid source files (if nonull was set).
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        }
        return true;
      });

      if (srcFiles.length === 0) {
        // No src files, goto next target. Warn would have been issued above.
        return n();
      }

      var result = [],
          settingsFile;
      async.concatSeries(srcFiles, function (file, next) {
        grunt.verbose.writeln('File ' + file.cyan + ' to process.');

        var settingsFilePath = path.dirname(file);
        var settingsData = getSettings(settingsFilePath, grunt);
        if (settingsData) {
          html.data.environment = settingsData;
        }

        try {
        var content = html.process(file);

        if (options.process) {
          content = html.template(content, lodash.cloneDeep(html.data), options.templateSettings);
        }
        } catch (e) {
          throw new Error('Unable to process "' + file + '".\n' + e);
        }

        result.push(content);
        grunt.log.writeln('File "' + file + '" processed.')
        process.nextTick(next);

      }, function () {
        grunt.file.write(destFile, result.join(grunt.util.normalizelf(grunt.util.linefeed)));
        grunt.verbose.writeln('File ' + destFile.cyan + ' created.');
        n();
      });
    }, done);
  });
};
