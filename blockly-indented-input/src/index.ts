/**
 * @license
 * Copyright 2026 Preet Vadaliya
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview A Blockly plugin adding an indented value input.
 *
 * Stock Blockly offers two shapes for two meanings: a puzzle socket on the
 * right edge for "an expression goes here", and an indented C-shaped well for
 * "a run of code goes here". A language with expression bodies wants both at
 * once — `let x = 1 in <expr>` must connect like a value because it produces
 * one, but should read like a body because that is what it is.
 *
 * Importing this package registers the input type, adds
 * `Block.appendIndentedValueInput` and registers a Geras renderer that draws
 * the indent. None of that changes an existing workspace: the input has to be
 * asked for by name, and the renderer has to be selected at injection.
 *
 * @example
 * import * as Blockly from 'blockly';
 * import {INDENTED_RENDERER_NAME} from '@mit-app-inventor/blockly-indented-input';
 *
 * const workspace = Blockly.inject('blocklyDiv', {
 *   toolbox,
 *   renderer: INDENTED_RENDERER_NAME,
 * });
 *
 * // In JSON, alongside `input_value` and `input_statement`:
 * Blockly.common.defineBlocksWithJsonArray([{
 *   type: 'let_expression',
 *   message0: 'initialize local %1 to %2',
 *   args0: [
 *     {type: 'field_input', name: 'NAME', text: 'name'},
 *     {type: 'input_value', name: 'VALUE'},
 *   ],
 *   message1: 'in %1',
 *   args1: [{type: 'input_indented_value', name: 'RETURN'}],
 *   output: null,
 * }]);
 *
 * // Or imperatively, alongside `appendValueInput`:
 * Blockly.Blocks['let_expression'] = {
 *   init: function () {
 *     this.appendValueInput('VALUE').appendField('initialize local');
 *     this.appendIndentedValueInput('RETURN').appendField('in');
 *     this.setOutput(true);
 *   },
 * };
 */

import {registerIndentedValueInput} from './indented_value_input';
import {registerIndentedRenderer} from './geras_renderer';

// Registered on import. Both registries are global to the page rather than
// per-workspace, so there is no plugin instance to construct and nothing to
// dispose — which is why this package has no `init()` the way a workspace-
// scoped plugin would.
registerIndentedValueInput();
registerIndentedRenderer();

export {
  INDENTED_VALUE_INPUT_TYPE,
  IndentedValueInput,
  registerIndentedValueInput,
} from './indented_value_input';

export {
  INDENTED_RENDERER_NAME,
  IndentedDrawer,
  IndentedGerasRenderer,
  IndentedHighlighter,
  IndentedRenderInfo,
  IndentedValueInputMeasurable,
  registerIndentedRenderer,
} from './geras_renderer';
