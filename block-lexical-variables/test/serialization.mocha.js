// Copyright 2026 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @fileoverview Round-trip tests for every block that carries extra state.
 *
 * This suite is written to pass against the plugin as it is today, before any
 * JSON serialization hooks exist, so that it can prove the hooks change
 * nothing when they arrive. It is the guard on App Inventor's .bky files.
 *
 * Two invariants, for each of the six blocks with a mutator:
 *
 *   1. XML is stable. Loading a workspace from XML and saving it again
 *      produces the same text. This is the one that protects existing
 *      projects.
 *   2. XML survives a trip through JSON. Save the workspace with
 *      serialization.workspaces.save, load it into a fresh workspace, and the
 *      XML still matches. Today that works because Blockly falls back to
 *      mutationToDom and stores the mutation as an XML string in extraState;
 *      once saveExtraState exists it must keep working with a real object.
 *
 * Blocks are built programmatically rather than from hand-written fixtures so
 * the expected XML is whatever the plugin actually emits, not whatever was
 * guessed here. Literal legacy fixtures live in legacy_extra_state.mocha.js,
 * where being hand-written is the point.
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

/**
 * Serializes a whole workspace to XML text.
 * @param {!Blockly.Workspace} workspace The workspace to serialize.
 * @return {string} The XML text.
 */
function toXmlText(workspace) {
  return Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
}

/**
 * The blocks that carry extra state, and how to put each into a state worth
 * serializing. Each builder returns the block it created.
 */
const CASES = [
  {
    name: 'local_declaration_statement',
    build(workspace) {
      const block = workspace.newBlock('local_declaration_statement');
      block.updateDeclarationInputs_(['alpha', 'beta']);
      return block;
    },
  },
  {
    name: 'local_declaration_expression',
    build(workspace) {
      const block = workspace.newBlock('local_declaration_expression');
      block.updateDeclarationInputs_(['gamma']);
      return block;
    },
  },
  {
    name: 'procedures_defnoreturn',
    build(workspace) {
      const block = workspace.newBlock('procedures_defnoreturn');
      block.setFieldValue('doThing', 'NAME');
      block.updateParams_(['one', 'two']);
      return block;
    },
  },
  {
    name: 'procedures_defnoreturn with vertical parameters',
    build(workspace) {
      const block = workspace.newBlock('procedures_defnoreturn');
      block.setFieldValue('vertical', 'NAME');
      block.horizontalParameters = false;
      block.updateParams_(['one', 'two']);
      return block;
    },
  },
  {
    name: 'procedures_defreturn',
    build(workspace) {
      const block = workspace.newBlock('procedures_defreturn');
      block.setFieldValue('giveThing', 'NAME');
      block.updateParams_(['x']);
      return block;
    },
  },
  {
    name: 'procedures_callnoreturn',
    build(workspace) {
      const def = workspace.newBlock('procedures_defnoreturn');
      def.setFieldValue('called', 'NAME');
      def.updateParams_(['a', 'b']);
      const call = workspace.newBlock('procedures_callnoreturn');
      call.setFieldValue('called', 'PROCNAME');
      call.setProcedureParameters(['a', 'b'], null, true);
      return call;
    },
  },
  {
    name: 'procedures_callreturn',
    build(workspace) {
      const def = workspace.newBlock('procedures_defreturn');
      def.setFieldValue('asked', 'NAME');
      def.updateParams_(['q']);
      const call = workspace.newBlock('procedures_callreturn');
      call.setFieldValue('asked', 'PROCNAME');
      call.setProcedureParameters(['q'], null, true);
      return call;
    },
  },
];

suite('Serialization', function () {
  setup(function () {
    this.workspace = new Blockly.Workspace();
    Blockly.common.setMainWorkspace(this.workspace);
  });

  teardown(function () {
    this.workspace.dispose();
    delete this.workspace;
  });

  // A round trip is trivially stable for a block carrying no extra state, so
  // assert first that every case actually produces a mutation. Without this
  // the whole suite could pass against blocks that were never configured.
  suite('every case carries extra state', function () {
    CASES.forEach((testCase) => {
      test(testCase.name, function () {
        testCase.build(this.workspace);
        chai.assert.include(
          toXmlText(this.workspace),
          '<mutation',
          'this case serializes no mutation, so round-tripping it proves nothing',
        );
      });
    });
  });

  suite('XML is stable across a reload', function () {
    CASES.forEach((testCase) => {
      test(testCase.name, function () {
        testCase.build(this.workspace);
        const before = toXmlText(this.workspace);

        const reloaded = new Blockly.Workspace();
        Blockly.common.setMainWorkspace(reloaded);
        try {
          Blockly.Xml.domToWorkspace(
            Blockly.utils.xml.textToDom(before),
            reloaded,
          );
          chai.assert.equal(toXmlText(reloaded), before);
        } finally {
          reloaded.dispose();
          Blockly.common.setMainWorkspace(this.workspace);
        }
      });
    });
  });

  suite('XML survives a trip through JSON', function () {
    CASES.forEach((testCase) => {
      test(testCase.name, function () {
        testCase.build(this.workspace);
        const before = toXmlText(this.workspace);
        const state = Blockly.serialization.workspaces.save(this.workspace);

        const reloaded = new Blockly.Workspace();
        Blockly.common.setMainWorkspace(reloaded);
        try {
          Blockly.serialization.workspaces.load(state, reloaded);
          chai.assert.equal(toXmlText(reloaded), before);
        } finally {
          reloaded.dispose();
          Blockly.common.setMainWorkspace(this.workspace);
        }
      });
    });
  });
});
