// Copyright 2026 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @fileoverview Tests that IndentedInput is a value input in every respect.
 *
 * The constructor used to call makeConnection a second time after super() had
 * already built the connection, which left the first RenderedConnection
 * orphaned, and reassigned `type`, which ValueInput declares readonly. Both
 * were redundant rather than useful: ValueInput's constructor sets name, type
 * and connection already.
 *
 * These assertions are about what must stay true after removing them — the
 * input still reports itself as a value input and still carries exactly one
 * INPUT_VALUE connection, so serialization, connection checking and the whole
 * Input API continue to reach it through the ordinary value-input paths.
 */

import * as Blockly from 'blockly/core';

import {IndentedInput} from '../src/inputs/indented_input.js';

import chai from 'chai';

suite('IndentedInput', function () {
  setup(function () {
    Blockly.Blocks['indented_input_host'] = {
      init: function () {
        this.appendDummyInput().appendField('host');
      },
    };
    this.workspace = new Blockly.Workspace();
    this.block = this.workspace.newBlock('indented_input_host');
    this.input = this.block.appendInput(
      new IndentedInput('IN', this.block),
    );
  });

  teardown(function () {
    this.workspace.dispose();
    delete this.workspace;
    delete Blockly.Blocks['indented_input_host'];
  });

  test('is registered under the indented_input key', function () {
    chai.assert.equal(
      Blockly.registry.getClass(Blockly.registry.Type.INPUT, 'indented_input'),
      IndentedInput,
    );
  });

  test('reports itself as a value input', function () {
    chai.assert.equal(this.input.type, Blockly.inputs.inputTypes.VALUE);
    chai.assert.instanceOf(this.input, Blockly.inputs.ValueInput);
  });

  test('carries an INPUT_VALUE connection', function () {
    chai.assert.isNotNull(this.input.connection);
    chai.assert.equal(
      this.input.connection.type,
      Blockly.ConnectionType.INPUT_VALUE,
    );
  });

  test('the connection belongs to the input and to the block', function () {
    // The orphaned-connection symptom: the block must know about exactly the
    // connection the input is holding, not a discarded earlier one.
    chai.assert.equal(this.input.connection.getSourceBlock(), this.block);
    chai.assert.include(
      this.block.getConnections_(true),
      this.input.connection,
    );
  });

  test('does not count as a statement input', function () {
    chai.assert.equal(this.block.statementInputCount, 0);
  });

  test('accepts a value block', function () {
    Blockly.Blocks['indented_input_value'] = {
      init: function () {
        this.setOutput(true);
      },
    };
    const value = this.workspace.newBlock('indented_input_value');
    this.input.connection.connect(value.outputConnection);
    chai.assert.equal(this.block.getInputTargetBlock('IN'), value);
    delete Blockly.Blocks['indented_input_value'];
  });
});
