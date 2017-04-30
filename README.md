# accessibility-webpack-plugin
Webpack plugin that reports accessibility issues for component-based applications (using React, preact, etc)

## How it works
Currently, the strategy for this plugin is to render components to static markup and run accessibility testing on the markup.
As webpack bundles your project, this will detect a component, render it to static markup and compile an a11y report for each component.

