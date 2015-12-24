## GatorWebClient/Polymer

> New branch for GatorWebClient using Polymer.

### Install dependencies

With [Node.js](https://nodejs.org) installed, run the following one liner from the root directory:

```sh
npm install -g gulp bower && npm install && bower install
```

#### Tools

- Node.js, used to run JavaScript tools from the command line.
- npm, the node package manager, installed with Node.js and used to install Node.js packages.
- gulp, a Node.js-based build tool.
- bower, a Node.js-based package manager used to install front-end packages (like Polymer).

### Serve / Watch

```sh
gulp serve
```

This outputs an IP address you can use to locally test and another that can be used on devices connected to your network.

### Run tests

```sh
gulp test:local
```

This runs the unit tests defined in the `app/test` directory through [web-component-tester](https://github.com/Polymer/web-component-tester).

To run tests Java 7 or higher is required. To update Java go to http://www.oracle.com/technetwork/java/javase/downloads/index.html and download ***JDK*** and install it.

### Build & Vulcanize

```sh
gulp
```

Build and optimize the current project, ready for deployment. This includes linting as well as vulcanization, image, script, stylesheet and HTML optimization and minification.

The deployment-ready version is placed under the `dist` directory.

### Application Theming & Styling

Polymer 1.0 introduces a shim for CSS custom properties. We take advantage of this in `app/styles/app-theme.html`. You can also find the presets for [Material Design](https://www.google.com/design/spec/material-design/introduction.html) breakpoints in this file.

[Read more](https://www.polymer-project.org/1.0/docs/devguide/styling.html) about CSS custom properties.

### Styling
1. ***main.css*** - to define styles that can be applied outside of Polymer's custom CSS properties implementation. Some of the use-cases include defining styles that you want to be applied for a splash screen, styles for your application 'shell' before it gets upgraded using Polymer or critical style blocks that you want parsed before your elements are.
2. ***app-theme.html*** - to provide theming for the application. You can also find the presets for Material Design breakpoints in this file.
3. ***shared-styles.html*** - to shared styles between elements and index.html.
4. ***element styles only*** - styles specific to element. These styles should be inside the `<style></style>` inside `template`.

  ```HTML
  <dom-module id="my-list">
    <template>
      <style>
        :host {
          display: block;
          background-color: yellow;
        }
      </style>
      <ul>
        <template is="dom-repeat" items="{{items}}">
          <li><span class="paper-font-body1">{{item}}</span></li>
        </template>
      </ul>
    </template>
  </dom-module>
  ```

These style files are located in the [styles folder](app/styles/).

### Unit Testing

We're using the [Web Component Tester](https://github.com/Polymer/web-component-tester) - Polymer's preferred tool for authoring and running unit tests. This makes testing elements easy. See the [test folder](app/test/) for examples.

[Read more](https://github.com/Polymer/web-component-tester#html-suites) about using Web Component tester.

### Dependency Management

We use [Bower](http://bower.io) for package management. This makes it easy to keep our elements up to date and versioned. For tooling, we use npm to manage Node.js-based dependencies.

### Routing

We use Page.js for routing and new routes
can be defined in [`app/elements/routing.html`](https://github.com/PolymerElements/polymer-starter-kit/blob/master/app/elements/routing.html). We then toggle which `<iron-pages>` page to display based on the selected route.
