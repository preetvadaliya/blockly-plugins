/**
 * @license
 * Copyright 2026 Preet Vadaliya
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview A socket that takes a value but reads as a block of code.
 *
 * Blockly gives you two shapes for two meanings. A value input is a puzzle
 * socket on the right edge and means "an expression goes here". A statement
 * input is an indented C-shaped well and means "a run of code goes here". A
 * language with expression bodies — `let x = 1 in <expr>`, a function whose
 * body is a single expression — wants both at once: it must *connect* like a
 * value, because it produces one, but it should *read* like a body, because
 * that is what it is.
 *
 * This is that input. The idea comes from MIT App Inventor, whose
 * `local_declaration_expression` block uses exactly this to render
 * "initialize local x to [ ] in [ ]" with the "in" socket indented.
 *
 * The class body is empty on purpose, and that is worth explaining rather than
 * leaving to look like an oversight. `ValueInput` already declares
 * `readonly type = inputTypes.VALUE` and already builds an `INPUT_VALUE`
 * connection in its constructor, so there is nothing left to set. What the
 * subclass provides is a distinct constructor, which is the only thing the
 * renderer needs: `RenderInfo.addInput_` dispatches on `instanceof`, so being
 * a nominally different class is the entire mechanism.
 *
 * Extending `ValueInput` rather than `Input` is also what makes this safe to
 * use without the bundled renderer. `RenderInfo.addInput_` is a closed
 * `if / else if` chain with no `else`: an input extending `Input` directly
 * falls off the end and contributes no measurable, no height and no positioned
 * connection — a live socket nobody can see or aim at. Extending `ValueInput`
 * means every stock renderer already draws it, just as an ordinary external
 * value socket rather than an indented one.
 *
 * It also means this is a value input in every way Blockly cares about, not a
 * lookalike. Serialization, events, undo, copy and paste, connection checking
 * and the whole `Input` API reach it through `ValueInput` and `INPUT_VALUE`,
 * so there is no parallel implementation of any of them here to drift out of
 * step. `test/parity.mocha.js` asserts that against a stock `input_value`
 * operation by operation.
 */

import * as Blockly from 'blockly/core';

/**
 * The registry key this input is registered under.
 *
 * Named to sit alongside Blockly's own — `input_value`, `input_statement`,
 * `input_dummy`, `input_end_row` — because it is resolved by exactly the same
 * lookup. Use it in a JSON block definition, where an argument's `type` falls
 * through to the input registry:
 *
 * ```json
 * {"type": "input_indented_value", "name": "RETURN"}
 * ```
 */
export const INDENTED_VALUE_INPUT_TYPE = 'input_indented_value';

/**
 * A value input drawn as an indented, statement-style body.
 *
 * Deliberately adds nothing to `ValueInput` — see this file's overview.
 */
export class IndentedValueInput extends Blockly.inputs.ValueInput {}

declare module 'blockly/core' {
  interface Block {
    /**
     * Appends an indented value input row.
     *
     * The counterpart to `appendValueInput`, and deliberately the same shape:
     * one name argument, the new input returned so fields can be chained onto
     * it.
     *
     * @param name Language-neutral identifier which may used to find this
     *     input again. Should be unique to this block.
     * @returns The input object created.
     */
    appendIndentedValueInput(name: string): IndentedValueInput;
  }
}

/**
 * Whether the input type has been registered.
 *
 * Registration is global to the page rather than per workspace, so it is
 * reference-free and simply idempotent.
 */
let registered = false;

/**
 * Registers the input type so JSON block definitions can name it.
 *
 * Called for its side effect when the package is imported. It is exported as
 * well so that a host application bundling several plugins can control the
 * order in which registries are populated.
 *
 * This also installs `Block.prototype.appendIndentedValueInput`. Adding a
 * method to a core prototype is not something to do lightly, and it is done
 * here because the alternative is worse: a free function taking the block as
 * its first argument would read differently from every other input at the one
 * place a block definition is written, which is the place the difference would
 * be most confusing. It is additive, it is guarded against overwriting
 * anything already there, and `new IndentedValueInput(name, block)` passed to
 * the public `block.appendInput()` remains available for anyone who would
 * rather not rely on it.
 */
export function registerIndentedValueInput(): void {
  if (registered) return;
  registered = true;

  // `registry.register` throws on a duplicate key, and a page that loads two
  // copies of this package would otherwise fail at import time.
  if (
    !Blockly.registry.hasItem(
      Blockly.registry.Type.INPUT,
      INDENTED_VALUE_INPUT_TYPE,
    )
  ) {
    Blockly.registry.register(
      Blockly.registry.Type.INPUT,
      INDENTED_VALUE_INPUT_TYPE,
      IndentedValueInput,
    );
  }

  if (!Blockly.Block.prototype.appendIndentedValueInput) {
    Blockly.Block.prototype.appendIndentedValueInput = function (
      this: Blockly.Block,
      name: string,
    ): IndentedValueInput {
      // Exactly `appendValueInput`'s body. `appendStatementInput` also bumps
      // `statementInputCount`; this must not, because that counter means "how
      // many stacks hang off this block" and is read by code that would then
      // look for a next-statement connection that does not exist.
      return this.appendInput(
        new IndentedValueInput(name, this),
      ) as IndentedValueInput;
    };
  }
}
