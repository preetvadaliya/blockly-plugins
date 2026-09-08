// Copyright 2026 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @fileoverview Helpers for blocks that carry both XML and JSON extra state.
 *
 * These blocks have always serialized through mutationToDom and domToMutation.
 * Adding saveExtraState and loadExtraState beside them is safe for .bky files,
 * because Blockly reads XML exclusively through the XML pair. But two things
 * about the JSON side are easy to get wrong, and both are silent.
 *
 * First, loadExtraState is not handed a guaranteed object. Blockly's block
 * loader does no type check at all:
 *
 *   state.extraState && (block.loadExtraState
 *       ? block.loadExtraState(state.extraState)
 *       : block.domToMutation && block.domToMutation(textToDom(state.extraState)))
 *
 * Any workspace JSON saved before these hooks existed took the second branch,
 * so its extraState is an XML *string*. The moment loadExtraState exists that
 * same payload is handed to it verbatim. Every loadExtraState here therefore
 * has to recognise a string and route it back to domToMutation, or every file
 * saved by an earlier version of this plugin fails to load.
 *
 * Second, an undo record of a mutation is text, and how it is parsed depends
 * on which hooks the block has. Blockly.Events.BlockChange.run does:
 *
 *   block.loadExtraState
 *       ? block.loadExtraState(JSON.parse(text || '{}'))
 *       : block.domToMutation && block.domToMutation(textToDom(text || '<mutation/>'))
 *
 * so once a block gains loadExtraState, anything that fired a BlockChange
 * event carrying XML mutation text will throw a SyntaxError when undone. Code
 * that builds such an event by hand has to switch to extraStateText below at
 * the same moment the block gains its hooks, not afterwards.
 */

import * as Blockly from 'blockly/core';

/**
 * Whether a payload is extra state written by an older version of a block.
 *
 * Legacy payloads are the XML text of a mutation element; current ones are
 * plain objects.
 *
 * @param {?} state The extra state handed to loadExtraState.
 * @return {boolean} True if the state is legacy XML text.
 */
export function isLegacyExtraState(state) {
  return typeof state === 'string';
}

/**
 * Applies extra state that was written as XML text.
 *
 * @param {!Blockly.Block} block The block to apply the state to.
 * @param {string} xmlText The mutation element as text.
 */
export function loadLegacyExtraState(block, xmlText) {
  block.domToMutation(Blockly.utils.xml.textToDom(xmlText));
}

/**
 * Serializes a block's extra state the way Blockly records it on an event.
 *
 * This mirrors Blockly.Events.BlockChange.getExtraBlockState_, which is not
 * part of the public API. Matching it is the whole point: the text produced
 * here is what BlockChange.run will later parse back, so the two have to agree
 * on the format or undo breaks.
 *
 * @param {!Blockly.Block} block The block whose state to serialize.
 * @return {string} The state as text, or the empty string if there is none.
 */
export function extraStateText(block) {
  if (block.saveExtraState) {
    const state = block.saveExtraState(true);
    return state ? JSON.stringify(state) : '';
  }
  if (block.mutationToDom) {
    const dom = block.mutationToDom();
    return dom ? Blockly.Xml.domToText(dom) : '';
  }
  return '';
}
