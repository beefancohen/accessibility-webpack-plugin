const htmlParser = require('htmlparser2');

module.exports = function apply(rules, htmlString = '', component) {
  rules.forEach((rule) => {
    const parser = new htmlParser.Parser(rule(component), { decodeEntities: true });
    parser.write(htmlString);
    parser.end();
  });
};
