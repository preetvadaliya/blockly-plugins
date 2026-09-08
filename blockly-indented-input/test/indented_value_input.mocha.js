/**
 * @license
 * Copyright 2026 Preet Vadaliya
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Tests for the indented input's block-model half.
 *
 * These run headless, so nothing here can check how the input *looks* — that
 * is the playground's job. What can be checked is everything the renderer
 * depends on and everything that would break silently: that the type is
 * registered, that all three ways of creating one agree, that the connection
 * is a value connection, and that a block sitting in one survives a save and
 * load.
 *
 * The serialization tests are the important ones. Blockly's `blockToDom`
 * switches on `input.type`, and a custom input reporting `inputTypes.CUSTOM`
 * reaches a branch that leaves its container undefined — a TypeError on save.
 * Inheriting `VALUE` from `ValueInput` is what avoids that, and these tests are
 * what would notice if that ever stopped being true.
 */

import * as Blockly from 'blockly/core';
import {assert} from 'chai';

import {
  INDENTED_VALUE_INPUT_TYPE,
  IndentedValueInput,
  registerIndentedValueInput,
} from '../src/indented_value_input';
import '../src/index';

suite('IndentedValueInput', function () {
  suiteSetup(function () {
    Blockly.common.defineBlocksWithJsonArray([
      {
        type: 'test_number',
        message0: 'a number',
        output: 'Number',
      },
      {
        type: 'test_statement',
        message0: 'do something',
        previousStatement: null,
        nextStatement: null,
      },
      {
        // Built through JSON, which exercises the registry lookup rather than
        // the programmatic path.
        type: 'test_let',
        message0: 'initialize local %1 to %2',
        args0: [
          {type: 'field_input', name: 'NAME', text: 'name'},
          {type: 'input_value', name: 'VALUE'},
        ],
        message1: 'in %1',
        args1: [{type: 'input_indented_value', name: 'RETURN'}],
        output: null,
      },
    ]);
  });

  setup(function () {
    this.workspace = new Blockly.Workspace();
  });

  teardown(function () {
    this.workspace.dispose();
  });

  suite('registration', function () {
    test('is registered under its own type name', function () {
      assert.isTrue(
        Blockly.registry.hasItem(
          Blockly.registry.Type.INPUT,
          INDENTED_VALUE_INPUT_TYPE,
        ),
      );
    });

    test('registering twice is harmless', function () {
      // Two copies of the package on one page must not throw at import time.
      assert.doesNotThrow(() => registerIndentedValueInput());
    });
  });

  suite('construction', function () {
    test('Block.appendIndentedValueInput adds one', function () {
      const block = this.workspace.newBlock('test_number');
      const input = block.appendIndentedValueInput('BODY');

      assert.instanceOf(input, IndentedValueInput);
      assert.equal(block.getInput('BODY'), input);
    });

    test('a JSON definition resolves it through the registry', function () {
      const block = this.workspace.newBlock('test_let');
      assert.instanceOf(block.getInput('RETURN'), IndentedValueInput);
    });

    test('the JSON block keeps its ordinary value input too', function () {
      const block = this.workspace.newBlock('test_let');
      const value = block.getInput('VALUE');

      assert.isNotNull(value);
      assert.notInstanceOf(value, IndentedValueInput);
    });
  });

  suite('it behaves as a value input', function () {
    test('reports the VALUE type, not CUSTOM', function () {
      // Load-bearing: `CUSTOM` breaks XML serialization. See the file header.
      const block = this.workspace.newBlock('test_let');
      assert.equal(
        block.getInput('RETURN').type,
        Blockly.inputs.inputTypes.VALUE,
      );
    });

    test('its connection is an input-value connection', function () {
      const block = this.workspace.newBlock('test_let');
      assert.equal(
        block.getInput('RETURN').connection.type,
        Blockly.ConnectionType.INPUT_VALUE,
      );
    });

    test('a value block connects to it', function () {
      const block = this.workspace.newBlock('test_let');
      const number = this.workspace.newBlock('test_number');

      block.getInput('RETURN').connection.connect(number.outputConnection);

      assert.equal(block.getInputTargetBlock('RETURN'), number);
    });

    test('a statement block does not connect to it', function () {
      const block = this.workspace.newBlock('test_let');
      const statement = this.workspace.newBlock('test_statement');

      // Blockly's `connect` is a silent no-op across incompatible connection
      // types rather than a throw, so the check is that nothing landed.
      block.getInput('RETURN').connection.connect(statement.previousConnection);

      assert.isNull(block.getInputTargetBlock('RETURN'));
      assert.isNull(statement.previousConnection.targetBlock());
    });

    test('an inline block still resolves it through the registry', function () {
      // The renderer has to force a row break for this case, because the base
      // rule only breaks before a value input when the block is not inline.
      // The model half is unaffected, which is what this pins.
      Blockly.common.defineBlocksWithJsonArray([
        {
          type: 'test_inline',
          message0: 'inline %1 body %2',
          args0: [
            {type: 'input_value', name: 'HEAD'},
            {type: 'input_indented_value', name: 'BODY'},
          ],
          inputsInline: true,
          output: null,
        },
      ]);

      const block = this.workspace.newBlock('test_inline');
      assert.instanceOf(block.getInput('BODY'), IndentedValueInput);
      assert.isTrue(block.inputsInline);
    });

    test('it is not counted as a statement input', function () {
      // A known limit rather than a bug: `statementInputCount` is bumped only
      // by `appendStatementInput`, and Zelos reads it. Pinned so the Zelos
      // port starts from a stated fact.
      const block = this.workspace.newBlock('test_let');
      assert.equal(block.statementInputCount, 0);
    });
  });

  suite('serialization', function () {
    /**
     * Builds a let block with a number sitting in its indented input.
     *
     * @param workspace The workspace to build in.
     * @returns The let block.
     */
    function seed(workspace) {
      const block = workspace.newBlock('test_let');
      const number = workspace.newBlock('test_number');
      block.getInput('RETURN').connection.connect(number.outputConnection);
      return block;
    }

    test('survives a JSON round trip', function () {
      seed(this.workspace);
      const state = Blockly.serialization.workspaces.save(this.workspace);

      const other = new Blockly.Workspace();
      Blockly.serialization.workspaces.load(state, other);

      const loaded = other.getTopBlocks(false)[0];
      assert.equal(loaded.type, 'test_let');
      assert.equal(loaded.getInputTargetBlock('RETURN').type, 'test_number');
      other.dispose();
    });

    test('survives an XML round trip', function () {
      // This is the regression test for the CUSTOM-type TypeError.
      seed(this.workspace);
      const dom = Blockly.Xml.workspaceToDom(this.workspace);

      const other = new Blockly.Workspace();
      Blockly.Xml.domToWorkspace(dom, other);

      const loaded = other.getTopBlocks(false)[0];
      assert.equal(loaded.getInputTargetBlock('RETURN').type, 'test_number');
      other.dispose();
    });

    test('writes the connected block under a <value> element', function () {
      seed(this.workspace);
      const xml = Blockly.Xml.domToText(
        Blockly.Xml.workspaceToDom(this.workspace),
      );

      // A value connection, so <value> — not <statement>.
      assert.include(xml, '<value name="RETURN">');
      assert.notInclude(xml, '<statement name="RETURN">');
    });
  });
});
