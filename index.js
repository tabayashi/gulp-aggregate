'use strict';
var path        = require('path');
var through     = require('through2');
var merge       = require('event-stream').merge;
var PluginError = require('plugin-error');

module.exports = function(aggregate, options) {
  var groups = {};

  options = options || {};
  if (!('group' in options) || !options.group) {
    options.group = function(file) {
      return path.basename(path.dirname(file.path));
    };
  }

  if (!('onend' in options) || !options.onend) {
    options.onend = function() {};
  }

  return through.obj(
    function(chunk, encoding, callback) {
      var group;

      if (chunk.isNull()) {
        return callback(null, chunk);
      }

      if (chunk.isStream()) {
        return callback(new PluginError('aggregate', 'Streaming not supported'));
      }

      group = options.group(chunk);
      if (!(group in groups)) {
        groups[group] = [];
      }
      groups[group].push(chunk);
      return callback();
    },
    function(callback) {
      return merge.apply(null, Object.keys(groups)
        .reduce(function(streams, group) {
          streams.push(aggregate.call(null, group, groups[group]));
          return streams;
        }, [])
      ).on('end', callback);
    }
  );
};
