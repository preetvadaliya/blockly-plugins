/**
 * @license
 * Copyright 2026 Preet Vadaliya
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview The playground.
 *
 * Everything about how the input *looks* has to be checked here — the mocha
 * suites run headless, where `Blockly.inject` does not exist and nothing is
 * drawn.
 *
 * The playground deliberately offers both renderers. Selecting stock `geras`
 * shows the plugin's fallback: the indented socket becomes an ordinary
 * external value socket on the right edge. The block still renders, still
 * connects and still saves — which is the whole argument for extending
 * `ValueInput` rather than `Input`, and it is easier to believe when you can
 * flip between the two.
 */

import * as Blockly from 'blockly';
import {createPlayground} from '@blockly/dev-tools';

import {INDENTED_RENDERER_NAME} from '../src/index';

/**
 * A "let" expression: a value to bind, and a body that is itself a value.
 *
 * This is the App Inventor block that motivated the plugin —
 * `local_declaration_expression` — reduced to its essentials.
 */
const LET_EXPRESSION = {
  type: 'let_expression',
  message0: 'initialize local %1 to %2',
  args0: [
    {type: 'field_input', name: 'NAME', text: 'name'},
    {type: 'input_value', name: 'VALUE'},
  ],
  message1: 'in %1',
  args1: [{type: 'input_indented_value', name: 'RETURN'}],
  output: null,
  colour: 330,
  tooltip: 'Binds a name, then evaluates its body with that name in scope.',
};

/**
 * The smallest block that has one, for looking at the shape on its own.
 */
const INDENTED_DEMO = {
  type: 'indented_demo',
  message0: 'body %1',
  args0: [{type: 'input_indented_value', name: 'BODY'}],
  previousStatement: null,
  nextStatement: null,
  colour: 230,
  tooltip: 'A single indented value input.',
};

/**
 * The stock equivalent, for comparison: a value input and a statement input.
 *
 * Sitting next to `let_expression` this is what shows the difference — the
 * same two-row shape, but the second socket takes statements rather than a
 * value.
 */
const STOCK_COMPARISON = {
  type: 'stock_comparison',
  message0: 'initialize local %1 to %2',
  args0: [
    {type: 'field_input', name: 'NAME', text: 'name'},
    {type: 'input_value', name: 'VALUE'},
  ],
  message1: 'in %1',
  args1: [{type: 'input_statement', name: 'STACK'}],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: 'Stock Blockly: a value input then a statement input.',
};

/**
 * An inline block with a value input before the indented one.
 *
 * A regression canary: the base `shouldStartNewRow_` only breaks a row before
 * a value input when the block is *not* inline, and an indented input is a
 * value input. Without the renderer's override this block renders with the
 * well collapsed onto the first row.
 */
const INLINE_CANARY = {
  type: 'inline_canary',
  message0: 'inline %1 body %2',
  args0: [
    {type: 'input_value', name: 'HEAD'},
    {type: 'input_indented_value', name: 'BODY'},
  ],
  inputsInline: true,
  previousStatement: null,
  nextStatement: null,
  colour: 120,
  tooltip: 'Inline block: the body must still get its own row.',
};

Blockly.common.defineBlocksWithJsonArray([
  LET_EXPRESSION,
  INDENTED_DEMO,
  STOCK_COMPARISON,
  INLINE_CANARY,
]);

const toolbox = {
  kind: 'flyoutToolbox',
  contents: [
    {kind: 'block', type: 'let_expression'},
    {kind: 'block', type: 'indented_demo'},
    {kind: 'block', type: 'stock_comparison'},
    {kind: 'block', type: 'inline_canary'},
    {kind: 'sep', gap: '24'},
    {kind: 'block', type: 'math_number'},
    {kind: 'block', type: 'text'},
    {kind: 'block', type: 'logic_boolean'},
    {kind: 'block', type: 'text_print'},
  ],
};

/**
 * Starting content, so the shape is visible the moment the page loads.
 */
const START_STATE = {
  blocks: {
    blocks: [
      {
        type: 'let_expression',
        x: 60,
        y: 40,
        fields: {NAME: 'count'},
        inputs: {
          VALUE: {block: {type: 'math_number', fields: {NUM: 5}}},
          RETURN: {block: {type: 'math_number', fields: {NUM: 42}}},
        },
      },
      {type: 'indented_demo', x: 60, y: 200},
    ],
  },
};

/**
 * Builds the workspace.
 *
 * @param blocklyDiv The container element.
 * @param options Injection options from the playground's controls.
 * @returns The new workspace.
 */
function createWorkspace(blocklyDiv, options) {
  const workspace = Blockly.inject(blocklyDiv, options);
  Blockly.serialization.workspaces.load(START_STATE, workspace);

  globalThis.blocklyWorkspace = workspace;
  return workspace;
}

document.addEventListener('DOMContentLoaded', function () {
  createPlayground(document.getElementById('root'), createWorkspace, {
    toolbox,
    // The plugin's own renderer. Switch to plain `geras` in the playground's
    // Options panel to see the fallback.
    renderer: INDENTED_RENDERER_NAME,
  }).then((playground) => {
    playground.addAction('Log the RETURN connection', (ws) => {
      const block = ws
        .getAllBlocks(false)
        .find((b) => b.type === 'let_expression');
      if (!block) {
        console.log('No let_expression block on the workspace.');
        return;
      }
      const input = block.getInput('RETURN');
      console.log('input class:', input.constructor.name);
      console.log('input.type (1 = VALUE):', input.type);
      console.log('connection type:', input.connection.type);
      console.log('connected block:', block.getInputTargetBlock('RETURN'));
      console.log('statementInputCount:', block.statementInputCount);
    });

    playground.addAction('Check outlines are well formed', (ws) => {
      // Two things that have actually gone wrong here, both invisible until
      // you look at a block and something is subtly off.
      //
      // 1. The wall of the well is drawn in three vertical runs — down to the
      //    tab, the tab, then the rest — which have to sum to the row height.
      //    When the last one went negative the outline doubled back on itself.
      //    A negative `v` is the signature.
      //
      //    Only the outline is checked, not the whole `d`. A block's path is
      //    `outlinePath + '\n' + inlinePath`, and an inline input's subpath
      //    closes itself by travelling back up — a legitimate negative `v`
      //    that made this report every inline block as broken.
      //
      // 2. The well has to reach the block's right edge. Geras deliberately
      //    caps a statement row on an inline block, which left the body
      //    hanging out of the block it belongs to.
      let bad = 0;
      for (const block of ws.getAllBlocks(false)) {
        const outline = (
          block.pathObject.svgPath.getAttribute('d') || ''
        ).split('\n')[0];

        const negatives = outline.match(/v -[\d.]+/g) || [];
        if (negatives.length) {
          bad++;
          console.warn(block.type, 'has a backtracking outline:', negatives);
        }

        const child = block.inputList
          .filter((i) => i.constructor.name === 'IndentedValueInput')
          .map((i) => i.connection.targetBlock())
          .find(Boolean);
        if (!child) continue;

        const origin = block.getRelativeToSurfaceXY();
        const childOrigin = child.getRelativeToSurfaceXY();
        const slack =
          block.getHeightWidth().width -
          Math.abs(childOrigin.x - origin.x) -
          child.getHeightWidth().width;
        if (slack < 0) {
          bad++;
          console.warn(
            block.type,
            `body overflows its block by ${(-slack).toFixed(2)}px`,
          );
        }
      }
      console.log(bad ? `${bad} problem(s) found` : 'All outlines OK');
    });

    playground.addAction('Round-trip through XML', (ws) => {
      const dom = Blockly.Xml.workspaceToDom(ws);
      const text = Blockly.Xml.domToText(dom);
      const before = ws.getAllBlocks(false).length;
      Blockly.Xml.clearWorkspaceAndLoadFromXml(dom, ws);
      console.log(text);
      console.log(
        `blocks ${before} -> ${ws.getAllBlocks(false).length}`,
        before === ws.getAllBlocks(false).length ? 'OK' : 'MISMATCH',
      );
    });
  });
});
