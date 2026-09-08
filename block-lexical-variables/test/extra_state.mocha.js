// Copyright 2026 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @fileoverview Tests for JSON extra state on local declaration blocks.
 *
 * serialization.mocha.js covers the invariants that must not change. This
 * file covers what the hooks actually add, and the two ways adding them can
 * go wrong silently.
 *
 * The first is loading. Blockly hands loadExtraState whatever is in the
 * payload without checking its type, so a file saved before these hooks
 * existed arrives as XML text and has to be recognised as such.
 *
 * The second is undo. Events.BlockChange.run parses a recorded mutation with
 * JSON.parse as soon as the block has loadExtraState, so any code that had
 * been recording XML text would start throwing SyntaxError the moment the
 * hooks appeared. renameBound was doing exactly that.
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
import {Substitution} from '../src/substitution';

import chai from 'chai';

/**
 * Blockly flushes its event queue on a macrotask, so undo tests have to wait
 * or they inspect an empty stack and pass for the wrong reason.
 * @return {!Promise<void>} A promise resolving after the queue drains.
 */
function flushEvents() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

suite('ExtraState', function () {
  setup(function () {
    this.workspace = new Blockly.Workspace();
    Blockly.common.setMainWorkspace(this.workspace);
  });

  teardown(function () {
    this.workspace.dispose();
    delete this.workspace;
  });

  suite('saving', function () {
    test('a local declaration saves its names as an object', function () {
      const block = this.workspace.newBlock('local_declaration_statement');
      block.updateDeclarationInputs_(['alpha', 'beta']);
      chai.assert.deepEqual(block.saveExtraState(), {
        localNames: ['alpha', 'beta'],
      });
    });

    test('the expression form saves the same way', function () {
      const block = this.workspace.newBlock('local_declaration_expression');
      block.updateDeclarationInputs_(['gamma']);
      chai.assert.deepEqual(block.saveExtraState(), {localNames: ['gamma']});
    });

    test('workspace JSON now carries an object, not XML text', function () {
      const block = this.workspace.newBlock('local_declaration_statement');
      block.updateDeclarationInputs_(['alpha']);
      const state = Blockly.serialization.workspaces.save(this.workspace);
      const saved = state.blocks.blocks[0];
      chai.assert.isObject(
        saved.extraState,
        'extraState should be an object now that saveExtraState exists',
      );
      chai.assert.deepEqual(saved.extraState, {localNames: ['alpha']});
    });
  });

  suite('loading', function () {
    test('an object round-trips', function () {
      const block = this.workspace.newBlock('local_declaration_statement');
      block.loadExtraState({localNames: ['one', 'two']});
      chai.assert.deepEqual(block.declaredNames(), ['one', 'two']);
    });

    test('legacy XML text is still accepted', function () {
      const block = this.workspace.newBlock('local_declaration_statement');
      block.loadExtraState(
        '<mutation><localname name="old1"></localname>' +
          '<localname name="old2"></localname></mutation>',
      );
      chai.assert.deepEqual(block.declaredNames(), ['old1', 'old2']);
    });

    test('a whole workspace saved the legacy way still loads', function () {
      // Exactly the shape Blockly produced for this block before
      // saveExtraState existed: extraState as a string.
      const legacy = {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'local_declaration_statement',
              id: 'legacyblock1',
              x: 10,
              y: 20,
              extraState:
                '<mutation><localname name="legacyName"></localname></mutation>',
              fields: {VAR0: 'legacyName'},
            },
          ],
        },
      };
      Blockly.serialization.workspaces.load(legacy, this.workspace);
      const block = this.workspace.getBlockById('legacyblock1');
      chai.assert.isNotNull(block, 'the legacy block failed to load');
      chai.assert.deepEqual(block.declaredNames(), ['legacyName']);
    });

    test('empty state keeps the default name', function () {
      const block = this.workspace.newBlock('local_declaration_statement');
      const before = block.declaredNames();
      block.loadExtraState({localNames: []});
      chai.assert.deepEqual(
        block.declaredNames(),
        before,
        'an empty list must not wipe the default declaration',
      );
    });
  });

  suite('procedure definitions', function () {
    test('parameters are saved as an object', function () {
      const block = this.workspace.newBlock('procedures_defnoreturn');
      block.updateParams_(['one', 'two']);
      chai.assert.deepEqual(block.saveExtraState(), {params: ['one', 'two']});
    });

    test('horizontal layout writes no orientation key', function () {
      const block = this.workspace.newBlock('procedures_defnoreturn');
      block.horizontalParameters = true;
      block.updateParams_(['one']);
      chai.assert.notProperty(
        block.saveExtraState(),
        'verticalParameters',
        'absence is what means horizontal, matching the XML',
      );
    });

    test('vertical layout is recorded', function () {
      const block = this.workspace.newBlock('procedures_defnoreturn');
      block.horizontalParameters = false;
      block.updateParams_(['one']);
      chai.assert.deepEqual(block.saveExtraState(), {
        params: ['one'],
        verticalParameters: true,
      });
    });

    test('loading restores the orientation and the parameters', function () {
      const block = this.workspace.newBlock('procedures_defnoreturn');
      block.loadExtraState({params: ['a', 'b'], verticalParameters: true});
      chai.assert.deepEqual(block.arguments_, ['a', 'b']);
      chai.assert.isFalse(block.horizontalParameters);
    });

    test('legacy XML with vertical_parameters is still accepted', function () {
      const block = this.workspace.newBlock('procedures_defnoreturn');
      block.loadExtraState(
        '<mutation vertical_parameters="true">' +
          '<arg name="legacyA"></arg><arg name="legacyB"></arg></mutation>',
      );
      chai.assert.deepEqual(block.arguments_, ['legacyA', 'legacyB']);
      chai.assert.isFalse(block.horizontalParameters);
    });

    test('the returning form saves the same way', function () {
      const block = this.workspace.newBlock('procedures_defreturn');
      block.updateParams_(['q']);
      chai.assert.deepEqual(block.saveExtraState(), {params: ['q']});
    });
  });

  suite('undo', function () {
    test('undoing a bound rename does not throw', async function () {
      const block = this.workspace.newBlock('local_declaration_statement');
      block.updateDeclarationInputs_(['outer']);
      await flushEvents();

      // renameBound records the mutation on a BlockChange event. With
      // loadExtraState present, BlockChange.run JSON.parses that text on
      // undo, so recording XML here would raise SyntaxError.
      block.renameBound(
        new Substitution(['outer'], ['renamed']),
        new Substitution(),
      );
      await flushEvents();

      chai.assert.doesNotThrow(() => this.workspace.undo(false));
      await flushEvents();
    });

    test('the recorded mutation parses as JSON', async function () {
      const block = this.workspace.newBlock('local_declaration_statement');
      block.updateDeclarationInputs_(['outer']);
      await flushEvents();

      const events = [];
      const listener = (event) => {
        if (event.type === Blockly.Events.BLOCK_CHANGE) events.push(event);
      };
      this.workspace.addChangeListener(listener);
      try {
        block.renameBound(
          new Substitution(['outer'], ['renamed']),
          new Substitution(),
        );
        // Blockly delivers events on a macrotask, so the listener has to stay
        // attached across one before it can have seen anything.
        await flushEvents();
      } finally {
        this.workspace.removeChangeListener(listener);
      }

      const mutations = events.filter((e) => e.element === 'mutation');
      chai.assert.isNotEmpty(mutations, 'renameBound recorded no mutation');
      for (const event of mutations) {
        chai.assert.doesNotThrow(
          () => JSON.parse(event.oldValue || '{}'),
          'oldValue is not JSON, so undo would throw',
        );
        chai.assert.doesNotThrow(
          () => JSON.parse(event.newValue || '{}'),
          'newValue is not JSON, so undo would throw',
        );
      }
    });
  });
});
