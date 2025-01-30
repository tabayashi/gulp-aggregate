const path = require('node:path');
const through2 = require('through2');
const es = require('event-stream');
const PluginError = require('plugin-error');

function plugin(aggregate, options) {
  options = {
    ...({ grouping: file => path.basename(path.dirname(file.path)) }),
    ...(options || {})
  };
  let groups = {};
  return through2.obj(
    function(file, _, callback) {
      if (file.isNull()) {
        return callback(null, file);
      }
      if (file.isStream()) {
        return callback(new PluginError("gulp-aggregate", "Streaming not supported"));
      }
      const group = options.grouping(file);
      if (!(group in groups)) {
        groups[group] = [];
      }
      groups[group].push(file);
      callback();
    },
    function(callback) {
      const stream = es.merge(Object.keys(groups).reduce((acum, group) => {
        acum.push(aggregate(group, es.readArray(groups[group])));
        return acum;
      }, []));
      stream.on('end', callback);
    }
  );
}

module.exports = plugin;
