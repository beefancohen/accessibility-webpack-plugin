const htmlParser = require('html-parse-stringify');

class Parser {
  static parse(html = '') {
    const ast = htmlParser.parse(html);
    const node = ast[0] || {};

    return node;
  }
}

module.exports = Parser;
