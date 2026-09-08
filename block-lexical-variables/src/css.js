'use strict';

/**
 * The style element holding this plugin's rules.
 *
 * Created on first use rather than at module scope. Touching `document` while
 * the module is evaluating means merely importing the plugin throws anywhere
 * there is no DOM — Node, SSR, or a test runner — even when nothing is ever
 * rendered. Creating it here keeps the single-element behaviour while making
 * the import side-effect free.
 *
 * @type {?HTMLStyleElement}
 */
let cssNode = null;

/**
 * Register our extra CSS with Blockly.
 *
 * @param {string} selector The CSS selector for the Blockly workspace.
 */
export function registerCss(selector) {
  if (!cssNode) {
    cssNode = document.createElement('style');
    document.head.appendChild(cssNode);
  }
  cssNode.textContent = `
  ${selector}  .blocklyFieldParameter>rect {
    fill: rgb(222, 143, 108);
    fill-opacity: 1.0;
    stroke-width: 2;
    stroke: rgb(231, 175, 150);
  }
  ${selector} .blocklyFieldParameter>text {
    stroke-width: 1;
    fill: #000;
  }
  ${selector} .blocklyFieldParameter:hover>rect {
    stroke-width: 2;
    stroke: rgb(231,175,150);
    fill: rgb(231,175,150);
    fill-opacity: 1.0;
  }
  /*
   * [lyn, 10/08/13] Control flydown with the getter/setter blocks.
   */
  ${selector} .blocklyFieldParameterFlydown {
    fill: rgb(231,175,150);
    fill-opacity: 0.8;
  }
  /*
   * [lyn, 10/08/13] Control parameter fields with flydown procedure
   * caller block.
   */
  ${selector} .blocklyFieldProcedure>rect {
    fill: rgb(215,203,218);
    fill-opacity: 1.0;
    stroke-width: 0;
    stroke: #000;
  }
  ${selector} .blocklyFieldProcedure>text {
    fill: #000;
  }
  ${selector} .blocklyFieldProcedure:hover>rect {
    stroke-width: 2;
    stroke: #fff;
    fill: rgb(215,203,218);
    fill-opacity: 1.0;
  }
  /*
   * [lyn, 10/08/13] Control flydown with the procedure caller block.
   */
  ${selector} .blocklyFieldProcedureFlydown {
    fill: rgb(215,203,218);
    fill-opacity: 0.8;
  }`;
}
