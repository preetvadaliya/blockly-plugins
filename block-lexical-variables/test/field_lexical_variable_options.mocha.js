// Copyright 2026 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @fileoverview Tests that the dropdown validates its own generated options.
 *
 * FieldDropdown.validateOptions was not exported from field_dropdown.js when
 * this field was written, so a copy of it lived here. Blockly 13 has it as a
 * real method on the prototype, and the copy has been deleted in favour of
 * the inherited one.
 *
 * The inherited version is a superset: it also accepts the SEPARATOR literal
 * and HTMLElement labels, and it checks ARIA labels. This field only ever
 * generates two-element [label, value] pairs, so nothing it produces can pass
 * the old check and fail the new one.
 *
 * These tests exist because deleting a call site is easy to get silently
 * wrong — the branch that validates only runs for dynamic option lists, so a
 * broken call would not show up in any other suite.
 */

import * as Blockly from 'blockly/core';

import '../src/msg';
import '../src/utilities';
import '../src/workspace';
import '../src/procedure_utils';
import '../src/fields/flydown';
import '../src/fields/field_flydown';
import '../src/fields/field_global_flydown';
import '../src/fields/field_nocheck_dropdown';
import '../src/fields/field_parameter_flydown';
import '../src/fields/field_procedurename';
import '../src/blocks/lexical-variables';
import '../src/blocks/controls';
import '../src/blocks/variable-get-set.js';
import '../src/procedure_database';
import '../src/blocks/procedures';
import {FieldLexicalVariable} from '../src/fields/field_lexical_variable';

import chai from 'chai';

suite('FieldLexicalVariableOptions', function () {
  setup(function () {
    this.workspace = new Blockly.Workspace();
    Blockly.common.setMainWorkspace(this.workspace);
    this.block = this.workspace.newBlock('lexical_variable_get');
    this.field = this.block.getField('VAR');
  });

  teardown(function () {
    this.workspace.dispose();
    delete this.workspace;
  });

  test('the field inherits validateOptions from FieldDropdown', function () {
    chai.assert.instanceOf(this.field, FieldLexicalVariable);
    chai.assert.isFunction(this.field.validateOptions);
    chai.assert.equal(
      this.field.validateOptions,
      Blockly.FieldDropdown.prototype.validateOptions,
    );
  });

  test('generating options runs the validator', function () {
    // The validating branch only runs for a dynamic option list, so spy
    // rather than assume the call site is reached.
    let calls = 0;
    const real = this.field.validateOptions;
    this.field.validateOptions = function (options) {
      calls++;
      return real.call(this, options);
    };
    this.field.getOptions(false);
    chai.assert.isAbove(calls, 0, 'validateOptions was never called');
  });

  test('the generated options are well formed pairs', function () {
    const options = this.field.getOptions(false);
    chai.assert.isArray(options);
    chai.assert.isNotEmpty(options);
    for (const option of options) {
      chai.assert.isArray(option);
      chai.assert.isString(option[0], 'label must be a string');
      chai.assert.isString(option[1], 'value must be a string');
    }
  });

  test('malformed options are still rejected', function () {
    chai.assert.throws(
      () => this.field.validateOptions([['ok', 'ok'], 'not-a-tuple']),
      TypeError,
    );
    chai.assert.throws(() => this.field.validateOptions([]), TypeError);
    chai.assert.throws(() => this.field.validateOptions('nope'), TypeError);
  });
});
