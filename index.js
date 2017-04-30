var tmp = require('tmp');
var fs = require('fs');

function isReactComponent(source = '') {
  return source.indexOf('(_react.Component)') > -1;
}

function WebpackAccessibilityPlugin(options) {
  this.createElement = options.createElement;
  this.renderMarkup = options.renderMarkup;
}

WebpackAccessibilityPlugin.prototype.apply = function(compiler) {
  compiler.plugin('emit', function(compilation, callback) {
    // Explore each chunk (build output):
    compilation.chunks.forEach(function(chunk) {
      // Start with application specific modules
      chunk.modules
        .filter(module => module.resource && module.resource.indexOf('node_modules') === -1 && module.resource.match(/\.(js|jsx)$/))
        .map(module => module._source._value)
        .filter(isReactComponent)
        .forEach(function(source) {
          // Write to temporary file
          tmp.file({ postfix: '.js', dir: './tmp' }, function _tempFileCreated(err, path, fd, cleanupCallback) {
            if (err) throw err;
            var self = this;

            fs.writeFile(path, source, (err) => {
              if (err) throw err;

              var component = require('./' + path).default;
              var element = self.createElement(component);
              var markup = self.renderMarkup(element);

              // Run a11y report on markup!
              console.log(markup);

              cleanupCallback();
            });
          }.bind(this));
        }, this);
    }, this);

    callback();
  }.bind(this));
};

module.exports = WebpackAccessibilityPlugin;

