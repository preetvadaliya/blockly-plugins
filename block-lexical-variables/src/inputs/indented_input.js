// Copyright 2023 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

import * as Blockly from 'blockly/core';

/**
 * The IndentedInput represents results of computations that run in a
 * statement-like rather than a value-lke context. In particular, it is useful
 * for representing function bodies and macros that compute values.
 */
/**
 * The class body is empty on purpose. `ValueInput`'s own constructor already
 * sets `name`, sets `type` to `inputTypes.VALUE`, and builds the
 * `INPUT_VALUE` connection, so there is nothing left for a subclass to do.
 *
 * What the subclass provides is a distinct class, and that is the entire
 * mechanism: `RenderInfo.addInput_` dispatches on `instanceof`, so being
 * nominally different is what lets the renderer draw this one indented.
 */
export class IndentedInput extends Blockly.inputs.ValueInput {}

Blockly.registry.register(Blockly.registry.Type.INPUT, 'indented_input',
    IndentedInput);
