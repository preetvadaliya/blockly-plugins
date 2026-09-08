// Copyright 2026 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @fileoverview Tests for freeVariables on procedure declaration blocks.
 *
 * `procedures_defnoreturn.freeVariables` builds a `new NameSet(...)`, but
 * NameSet was never imported into `blocks/procedures.js`, so every call threw
 * a ReferenceError. It is not dead code: `renameBound` calls `freeVariables`
 * to assert its own invariant, so the throw was reachable from renaming.
 *
 * A procedure body is a closed scope — every name it uses is either a
 * parameter or a global — so the free set is always empty and the method
 * returns it. A non-empty result means the invariant is violated and the
 * method throws deliberately; that is a different error from the one this
 * suite guards against.
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
import '../src/blocks/variable-get-set';
import '../src/procedure_database';
import '../src/blocks/procedures';

import chai from 'chai';

suite('ProcedureFreeVariables', function () {
  setup(function () {
    this.workspace = new Blockly.Workspace();
    Blockly.common.setMainWorkspace(this.workspace);
  });

  teardown(function () {
    this.workspace.dispose();
    delete this.workspace;
  });

  test('an empty procedure body has no free variables', function () {
    const block = this.workspace.newBlock('procedures_defnoreturn');
    chai.assert.isTrue(block.freeVariables().isEmpty());
  });

  test('a returning procedure body has no free variables', function () {
    const block = this.workspace.newBlock('procedures_defreturn');
    chai.assert.isTrue(block.freeVariables().isEmpty());
  });

  test('a parameter used in the body is bound, not free', function () {
    // procedures_defreturn is used rather than defnoreturn because its body
    // input (RETURN) takes a value. defnoreturn's body is a statement input,
    // and connecting a value block to it silently does nothing — the connect
    // call reports success while getInputTargetBlock stays null, which would
    // make this assertion pass against an empty body.
    const proc = this.workspace.newBlock('procedures_defreturn');
    proc.setFieldValue('p', 'NAME');
    proc.updateParams_(['x']);

    const getter = this.workspace.newBlock('lexical_variable_get');
    getter.setFieldValue('x', 'VAR');
    proc
      .getInput(proc.bodyInputName)
      .connection.connect(getter.outputConnection);

    // Guard against the vacuous version of this test.
    chai.assert.equal(
      proc.getInputTargetBlock(proc.bodyInputName),
      getter,
      'the getter must actually be inside the body for this to mean anything',
    );
    chai.assert.isTrue(proc.freeVariables().isEmpty());
  });
});
