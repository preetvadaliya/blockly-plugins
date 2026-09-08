/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview The development playground for block-lexical-variables.
 *
 * The mocha suites run headlessly, where Blockly.inject does not exist, so
 * nothing they assert can cover how these blocks look or behave under a
 * pointer. Everything about the flydowns — hovering a parameter to get its
 * getter and setter, dragging one out — lives here and nowhere else.
 *
 * The round-trip actions matter for a second reason. This plugin serializes
 * exclusively through the legacy XML mutator hooks, and those live in the same
 * blocks that a JSON save has to agree with. The two buttons below make a
 * disagreement between the formats visible in one click rather than in a bug
 * report from someone whose project failed to reload.
 */

import * as Blockly from 'blockly/core';
import * as En from 'blockly/msg/en';
import {createPlayground} from '@blockly/dev-tools';
import {LexicalVariablesPlugin} from '../src/index';
import '../src/blocks';

/**
 * Blocks shown in the catch-all category.
 *
 * The four procedure blocks are deliberately absent: they are supplied by the
 * Functions category below, which uses Blockly's PROCEDURE callback so that
 * caller blocks appear for procedures that actually exist.
 */
const allBlocks = [
  'global_declaration',
  'controls_for',
  'controls_forRange',
  'controls_forEach',
  'local_declaration_statement',
  'simple_local_declaration_statement',
  'local_declaration_expression',
  'controls_do_then_return',
];

/**
 * A workspace worth looking at on load.
 *
 * Two locals nested one inside the other, both named `name`, with a getter in
 * the inner body. Opening that getter's dropdown is the quickest way to see
 * that scope resolution works: the inner declaration shadows the outer, so the
 * menu offers one `name`, not two.
 */
const START_STATE = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="local_declaration_statement" x="40" y="40">
    <mutation><localname name="outer"></localname></mutation>
    <field name="VAR0">outer</field>
    <statement name="STACK">
      <block type="local_declaration_statement">
        <mutation><localname name="inner"></localname></mutation>
        <field name="VAR0">inner</field>
        <statement name="STACK">
          <block type="lexical_variable_set">
            <field name="VAR">inner</field>
            <value name="VALUE">
              <block type="lexical_variable_get">
                <field name="VAR">outer</field>
              </block>
            </value>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`;

/**
 * Create a workspace.
 * @param {HTMLElement} blocklyDiv The blockly container div.
 * @param {!Blockly.BlocklyOptions} options The Blockly options.
 * @return {!Blockly.WorkspaceSvg} The created workspace.
 */
function createWorkspace(blocklyDiv, options) {
  const workspace = Blockly.inject(blocklyDiv, options);
  LexicalVariablesPlugin.init(workspace, {disableInvalidBlocks: true});

  // The playground restores whatever was on the workspace last time, and it
  // does so after this function returns. Seeding the start state here
  // unconditionally would either be overwritten immediately or throw away
  // work from the previous session, so wait for the restore to happen and
  // only fill the workspace if it turns out to be empty.
  setTimeout(() => {
    if (!workspace.getAllBlocks().length) {
      Blockly.Xml.domToWorkspace(
        Blockly.utils.xml.textToDom(START_STATE),
        workspace,
      );
    }
  }, 0);

  // Parked so the workspace can be poked at from the console.
  globalThis.workspace = workspace;
  return workspace;
}

/**
 * Reload a workspace from XML and report whether the text survived.
 * @param {!Blockly.WorkspaceSvg} workspace The workspace to round-trip.
 */
function roundTripXml(workspace) {
  const before = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
  workspace.clear();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(before), workspace);
  const after = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
  if (before === after) {
    console.log(
      'XML round trip OK,',
      workspace.getAllBlocks().length,
      'blocks',
    );
  } else {
    console.warn('XML round trip MISMATCH');
    console.warn('before:', before);
    console.warn('after: ', after);
  }
}

/**
 * Reload a workspace through JSON and report whether the XML still matches.
 *
 * Going out through JSON and back, then comparing the XML, is what catches a
 * block whose mutator hooks disagree with each other.
 * @param {!Blockly.WorkspaceSvg} workspace The workspace to round-trip.
 */
function roundTripJson(workspace) {
  const beforeXml = Blockly.Xml.domToText(
    Blockly.Xml.workspaceToDom(workspace),
  );
  const state = Blockly.serialization.workspaces.save(workspace);
  workspace.clear();
  Blockly.serialization.workspaces.load(state, workspace);
  const afterXml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
  if (beforeXml === afterXml) {
    console.log(
      'JSON round trip OK,',
      workspace.getAllBlocks().length,
      'blocks',
    );
  } else {
    console.warn('JSON round trip MISMATCH');
    console.warn('before:', beforeXml);
    console.warn('after: ', afterXml);
  }
}

Blockly.setLocale(En);
document.addEventListener('DOMContentLoaded', function () {
  const defaultOptions = {
    toolbox: `<xml xmlns="https://developers.google.com/blockly/xml">
      <category  colour="370" name="Misc. Blocks">
        ${allBlocks.map((b) => `<block type="${b}"></block>`).join('\n        ')}
      </category>
      <sep></sep>
      <category id="catVariables" colour="330" name="Variables">
        <block type="initialize_global"></block>
        <block type="global_declaration_entry"></block>
        <block type="global_declaration"></block>
        <block type="simple_local_declaration_statement"></block>
        <block type="local_declaration_statement"></block>
        <block type="local_declaration_expression"></block>
        <block type="lexical_variable_get"></block>
        <block type="lexical_variable_set"></block>
      </category>
      <category
        id="catFunctions" colour="290" custom="PROCEDURE" name="Functions"
      ></category>
    </xml>`,
    collapse: true,
  };
  createPlayground(
    document.getElementById('root'),
    createWorkspace,
    defaultOptions,
  ).then((playground) => {
    playground.addAction('Round-trip through XML', roundTripXml);
    playground.addAction('Round-trip through JSON', roundTripJson);
  });
});
