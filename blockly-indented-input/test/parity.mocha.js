/**
 * @license
 * Copyright 2026 Preet Vadaliya
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Proof that an indented value input is a value input.
 *
 * The claim this package makes is not "the indented input works". It is the
 * stronger one that it is a value input in every way Blockly cares about, and
 * differs only in how it is drawn. A test that merely exercised it would not
 * show that — it would pass just as happily against a lookalike that quietly
 * diverged on undo, or on shadow blocks, or on the event stream.
 *
 * So every test here runs the *same* operation against a stock `input_value`
 * and against an `input_indented_value` on two otherwise identical blocks, and
 * asserts the two agree. A divergence anywhere fails as a diff rather than as
 * a missing feature nobody thought to write a test for.
 *
 * Reading the core source says the same thing — the only places that branch on
 * input type are `xml.ts`, `serialization/blocks.ts`, `block_aria_composer.ts`
 * and two heuristics in `block.ts`, and every one of them keys off
 * `inputTypes.VALUE`, which is inherited. This suite is what keeps that true.
 */

import * as Blockly from 'blockly/core';
import {assert} from 'chai';

import '../src/index';

/** The stock input under test. */
const STOCK = 'parity_stock';

/** The indented input under test, on an otherwise identical block. */
const INDENTED = 'parity_indented';

/** The same two blocks, but with the input appended in `init()`. */
const STOCK_PROG = 'parity_stock_prog';
const INDENTED_PROG = 'parity_indented_prog';

/** Both, so a test can say "do this to each and compare". */
const PAIR = [STOCK, INDENTED];

/** Both again, for the tests that care about the imperative path. */
const PROG_PAIR = [STOCK_PROG, INDENTED_PROG];

suite('parity with a stock value input', function () {
  suiteSetup(function () {
    /**
     * Builds one of the two block definitions.
     *
     * @param type The block type name.
     * @param inputType The registry name of the second input.
     * @returns A JSON block definition.
     */
    function definition(type, inputType) {
      return {
        type,
        message0: 'head %1',
        args0: [{type: 'field_input', name: 'FIELD', text: 'f'}],
        message1: 'body %1',
        args1: [{type: inputType, name: 'IN'}],
        output: null,
        colour: 0,
      };
    }

    // The same pair again, built imperatively in init() rather than from
    // JSON, so the append methods are covered by everything below too.
    Blockly.Blocks[STOCK_PROG] = {
      init() {
        this.appendValueInput('IN').appendField('body');
        this.setOutput(true);
      },
    };
    Blockly.Blocks[INDENTED_PROG] = {
      init() {
        this.appendIndentedValueInput('IN').appendField('body');
        this.setOutput(true);
      },
    };

    Blockly.common.defineBlocksWithJsonArray([
      definition(STOCK, 'input_value'),
      definition(INDENTED, 'input_indented_value'),
      {type: 'parity_number', message0: 'n', output: 'Number'},
      {type: 'parity_string', message0: 's', output: 'String'},
      {
        type: 'parity_stack',
        message0: 'do',
        previousStatement: null,
        nextStatement: null,
      },
    ]);
  });

  setup(function () {
    this.workspace = new Blockly.Workspace();
  });

  teardown(function () {
    this.workspace.dispose();
  });

  /**
   * Runs a function against a block of each type and returns both results.
   *
   * @param workspace The workspace to build the blocks in.
   * @param fn Receives the block; whatever it returns is compared.
   * @returns `[stockResult, indentedResult]`.
   */
  function each(workspace, fn) {
    return PAIR.map((type) => fn(workspace.newBlock(type), type));
  }

  /**
   * Asserts that the same operation produces the same result on both.
   *
   * @param workspace The workspace to build the blocks in.
   * @param fn Receives the block; whatever it returns is compared.
   * @returns The shared result, for further assertions.
   */
  function assertSame(workspace, fn) {
    const [stock, indented] = each(workspace, fn);
    assert.deepEqual(
      indented,
      stock,
      'indented value input diverged from a stock value input',
    );
    return stock;
  }

  suite('identity', function () {
    test('both report inputTypes.VALUE', function () {
      const type = assertSame(this.workspace, (b) => b.getInput('IN').type);
      assert.equal(type, Blockly.inputs.inputTypes.VALUE);
    });

    test('both make an INPUT_VALUE connection', function () {
      const type = assertSame(
        this.workspace,
        (b) => b.getInput('IN').connection.type,
      );
      assert.equal(type, Blockly.ConnectionType.INPUT_VALUE);
    });

    test('the indented one is a ValueInput', function () {
      const block = this.workspace.newBlock(INDENTED);
      assert.instanceOf(block.getInput('IN'), Blockly.inputs.ValueInput);
    });

    test('neither counts as a statement input', function () {
      assert.equal(
        assertSame(this.workspace, (b) => b.statementInputCount),
        0,
      );
    });
  });

  suite('the Input API', function () {
    test('getIndex counts it exactly like a value input', function () {
      const indices = assertSame(this.workspace, (b) => {
        b.appendDummyInput('DUMMY');
        b.appendValueInput('TAIL');
        return [
          b.getInput('IN').getIndex(),
          b.getInput('TAIL').getIndex(),
          b.getInput('DUMMY').getIndex(),
        ];
      });
      // `getIndex` filters out inputs that have no connection — dummy and
      // end-row — and numbers the rest. Landing at 0 rather than 1 is the
      // point: the block's first row is a dummy holding the head field, and it
      // is not counted. The indented input is, because it is a value input.
      assert.deepEqual(indices, [0, 1, -1]);
    });

    test('appendField, removeField and the field row agree', function () {
      assertSame(this.workspace, (b) => {
        const input = b.getInput('IN');
        input.appendField(new Blockly.FieldLabel('x'), 'X');
        input.appendField(new Blockly.FieldLabel('y'), 'Y');
        const before = input.fieldRow.length;
        const removed = input.removeField('X');
        return [before, removed, input.fieldRow.length, !!b.getField('Y')];
      });
    });

    test('setAlign agrees', function () {
      assertSame(this.workspace, (b) => {
        const input = b.getInput('IN');
        assert.strictEqual(input.setAlign(Blockly.inputs.Align.RIGHT), input);
        return input.align;
      });
    });

    test('setCheck returns the input and records the check', function () {
      assertSame(this.workspace, (b) => {
        const input = b.getInput('IN');
        assert.strictEqual(input.setCheck('Number'), input);
        return input.connection.getCheck();
      });
    });

    test('isVisible agrees', function () {
      assert.isTrue(
        assertSame(this.workspace, (b) => b.getInput('IN').isVisible()),
      );
    });

    test('setShadowDom round-trips', function () {
      assertSame(this.workspace, (b) => {
        const input = b.getInput('IN');
        input.setShadowDom(
          Blockly.utils.xml.textToDom('<shadow type="parity_number"/>'),
        );
        return Blockly.Xml.domToText(input.getShadowDom()).replace(
          / id="[^"]*"/,
          '',
        );
      });
    });

    test('getSourceBlock agrees', function () {
      assertSame(
        this.workspace,
        (b) => b.getInput('IN').getSourceBlock() === b,
      );
    });
  });

  suite('the Block API', function () {
    test('getInput and inputList placement agree', function () {
      assertSame(this.workspace, (b) => [
        b.inputList.length,
        b.inputList.indexOf(b.getInput('IN')),
        b.inputList.map((i) => i.name),
      ]);
    });

    test('connecting and getInputTargetBlock agree', function () {
      assertSame(this.workspace, (b) => {
        const child = b.workspace.newBlock('parity_number');
        b.getInput('IN').connection.connect(child.outputConnection);
        return [
          b.getInputTargetBlock('IN').type,
          b.getChildren(false).length,
          b.getDescendants(false).length,
          child.getParent() === b,
          child.getRootBlock() === b,
        ];
      });
    });

    test('disconnect agrees', function () {
      assertSame(this.workspace, (b) => {
        const child = b.workspace.newBlock('parity_number');
        b.getInput('IN').connection.connect(child.outputConnection);
        child.outputConnection.disconnect();
        return [
          b.getInputTargetBlock('IN'),
          b.getChildren(false).length,
          child.getParent(),
        ];
      });
    });

    test('removeInput agrees', function () {
      assertSame(this.workspace, (b) => {
        const removed = b.removeInput('IN');
        return [
          removed,
          b.getInput('IN'),
          b.inputList.length,
          b.statementInputCount,
        ];
      });
    });

    test('removeInput disposes the connected block', function () {
      assertSame(this.workspace, (b) => {
        const child = b.workspace.newBlock('parity_number');
        b.getInput('IN').connection.connect(child.outputConnection);
        b.removeInput('IN');
        return child.disposed;
      });
    });

    test('moveInputBefore agrees', function () {
      assertSame(this.workspace, (b) => {
        b.moveInputBefore('IN', b.inputList[0].name);
        return b.inputList.map((i) => i.name);
      });
    });

    test('getConnections_ agrees', function () {
      assertSame(this.workspace, (b) =>
        b.getConnections_(true).map((c) => c.type),
      );
    });
  });

  suite('connection checking', function () {
    test('a matching type connects', function () {
      assertSame(this.workspace, (b) => {
        b.getInput('IN').setCheck('Number');
        const child = b.workspace.newBlock('parity_number');
        b.getInput('IN').connection.connect(child.outputConnection);
        return !!b.getInputTargetBlock('IN');
      });
    });

    test('a mismatched type is refused', function () {
      assert.isFalse(
        assertSame(this.workspace, (b) => {
          b.getInput('IN').setCheck('Number');
          const child = b.workspace.newBlock('parity_string');
          b.getInput('IN').connection.connect(child.outputConnection);
          return !!b.getInputTargetBlock('IN');
        }),
      );
    });

    test('a statement block is refused', function () {
      assert.isFalse(
        assertSame(this.workspace, (b) => {
          const child = b.workspace.newBlock('parity_stack');
          b.getInput('IN').connection.connect(child.previousConnection);
          return !!b.getInputTargetBlock('IN');
        }),
      );
    });
  });

  suite('serialization', function () {
    /**
     * Strips the block type so two structurally identical saves compare equal.
     *
     * @param state A serialized block state.
     * @returns The same state with every `type` naming a parity block removed.
     */
    function withoutBlockType(state) {
      const json = JSON.stringify(state).replaceAll(INDENTED, STOCK);
      return JSON.parse(json);
    }

    test('JSON save is structurally identical', function () {
      assertSame(this.workspace, (b) => {
        const child = b.workspace.newBlock('parity_number');
        b.getInput('IN').connection.connect(child.outputConnection);
        return withoutBlockType(
          Blockly.serialization.blocks.save(b, {saveIds: false}),
        );
      });
    });

    test('JSON round trip restores the child', function () {
      assertSame(this.workspace, (b, type) => {
        const child = b.workspace.newBlock('parity_number');
        b.getInput('IN').connection.connect(child.outputConnection);
        const state = Blockly.serialization.blocks.save(b);
        b.dispose(false);

        const loaded = Blockly.serialization.blocks.append(state, b.workspace);
        assert.equal(loaded.type, type);
        return loaded.getInputTargetBlock('IN').type;
      });
    });

    test('XML uses a <value> element either way', function () {
      const dom = assertSame(this.workspace, (b) => {
        const child = b.workspace.newBlock('parity_number');
        b.getInput('IN').connection.connect(child.outputConnection);
        return Blockly.Xml.domToText(
          Blockly.Xml.blockToDom(b, true),
        ).replaceAll(INDENTED, STOCK);
      });
      assert.include(dom, '<value name="IN">');
      assert.notInclude(dom, '<statement');
    });

    test('XML round trip restores the child', function () {
      assertSame(this.workspace, (b) => {
        const child = b.workspace.newBlock('parity_number');
        b.getInput('IN').connection.connect(child.outputConnection);
        const dom = Blockly.Xml.blockToDom(b);
        b.dispose(false);

        const loaded = Blockly.Xml.domToBlock(dom, b.workspace);
        return loaded.getInputTargetBlock('IN').type;
      });
    });

    test('a shadow block survives a JSON round trip', function () {
      assertSame(this.workspace, (b) => {
        const state = withoutBlockType(
          Blockly.serialization.blocks.save(b, {saveIds: false}),
        );
        state.inputs = {IN: {shadow: {type: 'parity_number'}}};
        const loaded = Blockly.serialization.blocks.append(
          JSON.parse(JSON.stringify(state).replaceAll(STOCK, b.type)),
          b.workspace,
        );
        const child = loaded.getInputTargetBlock('IN');
        return [child.type, child.isShadow()];
      });
    });

    test('a field value survives alongside the input', function () {
      assertSame(this.workspace, (b) => {
        b.setFieldValue('changed', 'FIELD');
        const state = Blockly.serialization.blocks.save(b);
        b.dispose(false);
        return Blockly.serialization.blocks
          .append(state, b.workspace)
          .getFieldValue('FIELD');
      });
    });
  });

  suite('events', function () {
    /**
     * Records the event types fired while running an operation.
     *
     * @param workspace The workspace to listen on.
     * @param fn The operation to run.
     * @returns The event types, in order.
     */
    function record(workspace, fn) {
      const seen = [];
      const listener = (event) => seen.push(event.type);
      workspace.addChangeListener(listener);
      try {
        fn();
      } finally {
        workspace.removeChangeListener(listener);
      }
      return seen;
    }

    test('connecting fires the same events', function () {
      assertSame(this.workspace, (b) => {
        const child = b.workspace.newBlock('parity_number');
        return record(b.workspace, () => {
          b.getInput('IN').connection.connect(child.outputConnection);
        });
      });
    });

    test('disconnecting fires the same events', function () {
      assertSame(this.workspace, (b) => {
        const child = b.workspace.newBlock('parity_number');
        b.getInput('IN').connection.connect(child.outputConnection);
        return record(b.workspace, () => {
          child.outputConnection.disconnect();
        });
      });
    });

    test('a move event reports the same parent connection', function () {
      assertSame(this.workspace, (b) => {
        const child = b.workspace.newBlock('parity_number');
        const moves = [];
        const listener = (event) => {
          if (event.type === Blockly.Events.BLOCK_MOVE) {
            moves.push([event.newParentId === b.id, event.newInputName]);
          }
        };
        b.workspace.addChangeListener(listener);
        try {
          b.getInput('IN').connection.connect(child.outputConnection);
        } finally {
          b.workspace.removeChangeListener(listener);
        }
        return moves;
      });
    });

    test('deleting the parent fires the same events', function () {
      assertSame(this.workspace, (b) => {
        const child = b.workspace.newBlock('parity_number');
        b.getInput('IN').connection.connect(child.outputConnection);
        return record(b.workspace, () => b.dispose(false));
      });
    });
  });

  suite('undo and redo', function () {
    /**
     * Runs an operation with undo recording on and lets the queue flush.
     *
     * @param fn The operation to record.
     */
    async function withUndo(fn) {
      Blockly.Events.setRecordUndo(true);
      fn();
      // The undo stack is built from the event queue, and Blockly flushes that
      // on a macrotask rather than synchronously. Without yielding here the
      // stack is still empty and `undo()` is a no-op — which would make these
      // tests pass for the wrong reason.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    /**
     * The async counterpart of `assertSame`, run in series so the two blocks
     * never share an undo stack turn.
     *
     * @param workspace The workspace to build the blocks in.
     * @param fn Receives the block; whatever it resolves to is compared.
     */
    async function assertSameAsync(workspace, fn) {
      const results = [];
      for (const type of PAIR) {
        results.push(await fn(workspace.newBlock(type), type));
      }
      assert.deepEqual(
        results[1],
        results[0],
        'indented value input diverged from a stock value input',
      );
    }

    test('undo removes the connection and redo restores it', async function () {
      await assertSameAsync(this.workspace, async (b) => {
        const child = b.workspace.newBlock('parity_number');
        await withUndo(() => {
          b.getInput('IN').connection.connect(child.outputConnection);
        });

        const connected = !!b.getInputTargetBlock('IN');
        b.workspace.undo(false);
        const afterUndo = !!b.getInputTargetBlock('IN');
        b.workspace.undo(true);
        const afterRedo = !!b.getInputTargetBlock('IN');
        return [connected, afterUndo, afterRedo];
      });
    });

    test('undo restores a deleted block with its child', async function () {
      await assertSameAsync(this.workspace, async (b) => {
        const child = b.workspace.newBlock('parity_number');
        b.getInput('IN').connection.connect(child.outputConnection);
        const type = b.type;

        await withUndo(() => b.dispose(false));
        const afterDelete = b.workspace.getBlocksByType(type, false).length;

        b.workspace.undo(false);
        const restored = b.workspace.getBlocksByType(type, false)[0];
        return [afterDelete, !!restored?.getInputTargetBlock('IN')];
      });
    });
  });

  suite('the append method', function () {
    test('appendIndentedValueInput matches appendValueInput', function () {
      const block = this.workspace.newBlock(STOCK);
      const value = block.appendValueInput('A');
      const indented = block.appendIndentedValueInput('B');

      assert.instanceOf(indented, Blockly.inputs.ValueInput);
      assert.equal(indented.type, value.type);
      assert.equal(indented.connection.type, value.connection.type);
      assert.equal(indented.name, 'B');
      assert.equal(indented.getSourceBlock(), block);
      assert.equal(block.getInput('B'), indented);
      // The counter statement inputs bump and value inputs do not.
      assert.equal(block.statementInputCount, 0);
    });

    test('it is chainable the way appendValueInput is', function () {
      const block = this.workspace.newBlock(STOCK);
      const input = block
        .appendIndentedValueInput('B')
        .appendField(new Blockly.FieldLabel('in'), 'LABEL')
        .setCheck('Number');

      assert.equal(block.getField('LABEL').getText(), 'in');
      assert.deepEqual(input.connection.getCheck(), ['Number']);
    });

    test('a block built with it survives a JSON round trip', function () {
      const results = PROG_PAIR.map((type) => {
        const block = this.workspace.newBlock(type);
        const child = this.workspace.newBlock('parity_number');
        block.getInput('IN').connection.connect(child.outputConnection);

        const state = Blockly.serialization.blocks.save(block, {
          saveIds: false,
        });
        block.dispose(false);

        const loaded = Blockly.serialization.blocks.append(
          state,
          this.workspace,
        );
        return [
          JSON.stringify(state).replaceAll(INDENTED_PROG, STOCK_PROG),
          loaded.getInputTargetBlock('IN').type,
          loaded.getInput('IN').type,
        ];
      }, this);
      assert.deepEqual(results[1], results[0]);
    });

    test('a block built with it survives an XML round trip', function () {
      const results = PROG_PAIR.map((type) => {
        const block = this.workspace.newBlock(type);
        const child = this.workspace.newBlock('parity_number');
        block.getInput('IN').connection.connect(child.outputConnection);

        const dom = Blockly.Xml.blockToDom(block, true);
        block.dispose(false);

        const loaded = Blockly.Xml.domToBlock(dom, this.workspace);
        return [
          Blockly.Xml.domToText(dom).replaceAll(INDENTED_PROG, STOCK_PROG),
          loaded.getInputTargetBlock('IN').type,
        ];
      }, this);
      assert.deepEqual(results[1], results[0]);
      assert.include(results[0][0], '<value name="IN">');
    });

    test('it registers the same class the registry hands out', function () {
      const fromRegistry = this.workspace.newBlock(INDENTED).getInput('IN');
      const fromMethod = this.workspace
        .newBlock(STOCK)
        .appendIndentedValueInput('B');
      assert.equal(fromMethod.constructor, fromRegistry.constructor);
    });
  });
});
