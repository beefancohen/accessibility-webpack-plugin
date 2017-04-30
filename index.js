const tmp = require('tmp');
const fs = require('fs');

function isReactComponent(source = '') {
  return source.indexOf('(_react.Component)') > -1;
}

function WebpackAccessibilityPlugin(options) {
  this.createElement = options.createElement;
  this.renderMarkup = options.renderMarkup;
}

WebpackAccessibilityPlugin.prototype.apply = (compiler) => {
  compiler.plugin('emit', (compilation, callback) => {
    // Explore each chunk (build output):
    compilation.chunks.forEach((chunk) => {
      // Start with application specific modules
      chunk.modules
        .filter(module => module.resource && module.resource.indexOf('node_modules') === -1 && module.resource.match(/\.(js|jsx)$/))
        .map(module => module._source._value) // eslint-disable-line no-underscore-dangle
        .filter(isReactComponent)
        .forEach((source) => {
          // Write to temporary file
          tmp.file({ postfix: '.js', dir: `${__dirname}/tmp` }, (tmpErr, path, fd, cleanupCallback) => {
            if (tmpErr) throw tmpErr;

            fs.writeFile(path, source, (err) => {
              if (err) throw err;

              const component = require(path).default; // eslint-disable-line
              const element = this.createElement(component);
              const markup = this.renderMarkup(element);

              // Run a11y report on markup!
              console.log(markup); // eslint-disable-line

              cleanupCallback();
            });
          });
        }, this);
    }, this);

    callback();
  });
};

module.exports = WebpackAccessibilityPlugin;
