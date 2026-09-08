// Copyright 2026 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @fileoverview Tests that the plugin entry point can be imported headlessly.
 *
 * src/css.js used to call document.createElement and appendChild while the
 * module was still evaluating, so importing src/core.js threw anywhere there
 * was no DOM — even though nothing had asked for a workspace yet. That is why
 * every other suite in this package imports twenty individual modules instead
 * of the entry point.
 *
 * The style element is now created on first use inside registerCss, so the
 * import is side-effect free with respect to the DOM. This suite is what keeps
 * that true.
 */

import chai from 'chai';

suite('ImportCore', function () {
  test('importing the plugin core does not require a DOM', async function () {
    const core = await import('../src/core.js');
    chai.assert.isFunction(core.LexicalVariablesPlugin.init);
  });

  test('the plugin entry point exports the plugin', async function () {
    const index = await import('../src/index.js');
    chai.assert.isFunction(index.LexicalVariablesPlugin.init);
  });
});
