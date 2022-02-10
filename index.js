const Path        = require('path');
const Through     = require('through2');
const EventStream = require('event-steam');
const PluginError = require('plugin-error');

function plugin(aggregate, options) {
  let groups   = {};

  options = { ...({
    group: file => Path.basename(Path.dirname(file.path)),
  }), ...(options || {}) };

  function transform(file, encode, callback) {
    let group = "";

    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isStream()) {
      return callback(new PluginError("gulp-aggregate", "Streaming not supported"));
    }

    group = options.group(file);
    if (!(group in groups)) {
      groups[group] = [];
    }
    groups[group].push(file);
    return callback();
  }

  function flush(callback) {
    const streams = Object.keys(groups).reduce((memo, name) => {
      const stream = EventStream.readArray(groups[name]);
      memo.push(aggregate(name, stream));
      return memo;
    }, []);
    const stream = EventStream.merge(streams);
    stream.on('end', callback);
    return stream;
  }

  return Through.obj(transform, flush);
}

module.exports = plugin;
