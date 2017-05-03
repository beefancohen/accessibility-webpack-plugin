const htmlParser = require('htmlparser2');

class Parser {
  constructor(component, reporter) {
    this.component = component;
    this.reporter = reporter;
  }

  execute(rules, htmlString = '') {
    rules.forEach((rule) => {
      const parser = new htmlParser.Parser(rule(this.component, this.reporter), { decodeEntities: true });
      parser.write(htmlString);
      parser.end();
    });
  }
}

module.exports = Parser;
