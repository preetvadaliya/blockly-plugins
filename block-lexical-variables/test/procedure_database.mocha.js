// Copyright 2026 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @fileoverview Tests for ProcedureDatabase's declaration accessors.
 *
 * These three methods threw a TypeError on every call: two of them reached
 * for `Blockly.utils.values`, which has never existed in any Blockly release,
 * and the third for `Blockly.utils.object.values`, where `utils.object`
 * exposes only `deepMerge`. Nothing inside this package called them, so the
 * breakage was invisible here — but `ProcedureDatabase` is reachable from a
 * host application through `workspace.getProcedureDatabase()`.
 *
 * The suite covers what the accessors are supposed to return so the next
 * rewrite of this file has something to fail against.
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

import chai from 'chai';

suite('ProcedureDatabase', function () {
  setup(function () {
    this.workspace = new Blockly.Workspace();
    Blockly.common.setMainWorkspace(this.workspace);
    this.db = this.workspace.getProcedureDatabase();

    // `addProcedure` reads the block's name field, so build real blocks
    // rather than stubs.
    this.addProcedure = function (type, name) {
      const block = this.workspace.newBlock(type);
      block.setFieldValue(name, 'NAME');
      this.db.addProcedure(name, block);
      return block;
    };
  });

  teardown(function () {
    this.workspace.dispose();
    delete this.workspace;
  });

  suite('getDeclarationBlocks', function () {
    test('returns the void procedures by default', function () {
      const block = this.addProcedure('procedures_defnoreturn', 'p1');
      chai.assert.deepEqual(this.db.getDeclarationBlocks(false), [block]);
    });

    test('returns the returning procedures when asked', function () {
      this.addProcedure('procedures_defnoreturn', 'p1');
      const returning = this.addProcedure('procedures_defreturn', 'p2');
      chai.assert.deepEqual(this.db.getDeclarationBlocks(true), [returning]);
    });

    test('returns an empty list when none are registered', function () {
      chai.assert.deepEqual(this.db.getDeclarationBlocks(false), []);
    });
  });

  suite('getDeclarationsBlocksExcept', function () {
    test('omits the block it is given and keeps the rest', function () {
      const first = this.addProcedure('procedures_defnoreturn', 'p1');
      const second = this.addProcedure('procedures_defnoreturn', 'p2');
      chai.assert.deepEqual(this.db.getDeclarationsBlocksExcept(first), [
        second,
      ]);
    });

    test('keeps every block when the excluded one is not registered', function () {
      const block = this.addProcedure('procedures_defnoreturn', 'p1');
      const other = this.workspace.newBlock('procedures_defnoreturn');
      chai.assert.deepEqual(this.db.getDeclarationsBlocksExcept(other), [
        block,
      ]);
    });
  });

  suite('getAllDeclarationNames', function () {
    test('reads the name off every declaration', function () {
      this.addProcedure('procedures_defnoreturn', 'p1');
      this.addProcedure('procedures_defreturn', 'p2');
      chai.assert.deepEqual(this.db.getAllDeclarationNames().sort(), [
        'p1',
        'p2',
      ]);
    });
  });
});
