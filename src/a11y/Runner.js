class Runner {
  constructor({ component, reporter, parser, rules }) {
    this.component = component;
    this.reporter = reporter;
    this.parser = parser;
    this.rules = rules;
  }

  report(error) {
    this.reporter.report({ error, component: this.component });
  }

  run(markup) {
    const node = this.parser.parse(markup);

    this.rules.forEach((rule) => {
      rule(node, this.report.bind(this));
    });
  }
}

module.exports = Runner;
