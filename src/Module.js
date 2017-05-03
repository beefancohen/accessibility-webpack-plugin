const JS_FILE_REGEX = /\.(js|jsx)$/;

class Module {
  constructor(source = '', relativePath = '', absolutePath = '', dependencies = []) {
    this.source = source;
    this.relativePath = relativePath;
    this.absolutePath = absolutePath;
    this.dependencies = dependencies;
  }

  isExternalDependency() {
    return this.absolutePath.indexOf('node_modules') > -1;
  }

  shouldExamine() {
    return this.isExternalDependency() === false && this.isJavascriptFile() && this.isReactComponent();
  }

  isJavascriptFile() {
    return JS_FILE_REGEX.test(this.absolutePath);
  }

  isReactComponent() {
    return this.source.indexOf('(_react.Component)') > -1;
  }
}

module.exports = Module;
