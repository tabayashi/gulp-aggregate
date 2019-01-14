'use strict';
var path          = require('path');
var kindof        = require('kind-of');
var through       = require('through2');
var isPlainObject = require('is-plain-object');
var PluginError   = require(' plugin-error');
var Vinyl         = require('vinyl');
var Q             = require('q');

module.exports = function() {
  return {
    get: function() {
      return function(options) {
        var groups = {};
        options = options || {};

        if ('function' === kindof(options)) {
          options = {aggregate: options};
        }

        if (!('group' in options) || !options.group) {
          options.group = function(file) {
            return path.basename(path.dirname(file.path));
          };
        }

        if (!('aggregate' in options) || !options.aggregate) {
          options.aggregate = function() {};
        }

        return through.obj(
          function(file, encoding, callback) {
            var group;

            if (file.isNull()) {
              return callback(null, file);
            }

            if (file.isStream()) {
              return callback(new PluginError(
                'aggregate',
                'Streaming not supported'
              ));
            }

            group = options.group(file);
            if (!(group in groups)) {
              groups[group] = [];
            }
            groups[group].push(file);
            return callback();
          },
          function(callback) {
            var $this, promises;
            $this = this;
            promises = [];
            Object.keys(groups).forEach(function(group) {
              var files = options.aggregate(group, groups[group], Q.defer());
              if (Q.isPromise(files)) {
                promises.push(files);
              } else {
                files = Array.isArray(files) ? files : [files];
                files.forEach(function(file) {
                  file = isPlainObject(file) ? new Vinyl(file) : file;
                  if (file instanceof Vinyl) {
                    $this.push(file);
                  }
                });
              }
            });
            return promises.length ?
              Q.when.apply(Q, promises).then(callback).done() :
              callback();
          }
        );
      };
    }
  };
};
