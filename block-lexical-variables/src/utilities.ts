// Copyright 2026 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @license
 * @fileoverview Block utilities for Blockly, modified for App Inventor.
 * @author mckinney@mit.edu (Andrew F. McKinney)
 * @author hal@mit.edu (Hal Abelson)
 * @author fraser@google.com (Neil Fraser)
 * Due to the frequency of long strings, the 80-column wrap rule need not apply
 * to language files.
 */

import * as Blockly from 'blockly/core';
import './msg';
import './types';

/**
 * A compatibility test used in place of a type name in a connection check.
 *
 * App Inventor's connection checker accepts these alongside plain strings;
 * stock Blockly does not, which is why the check arrays below are typed here
 * rather than as Blockly's string arrays.
 */
export type TypeCheckFunction = (
  myConn: Blockly.Connection,
  otherConn: Blockly.Connection,
) => boolean;

/** One entry of a connection check list. */
export type TypeCheck = string | TypeCheckFunction;

/**
 * Checks that the given otherConnection is compatible with an InstantInTime
 * connection. If the workspace is currently loading (eg the blocks are not
 * yet rendered) this always returns true for backwards compatibility.
 *
 * @param myConn The parent connection.
 * @param otherConn The child connection.
 * @return Whether the connection is allowed.
 */
export const InstantInTime: TypeCheckFunction = function (myConn, otherConn) {
  if (
    !myConn.getSourceBlock().rendered ||
    !otherConn.getSourceBlock().rendered
  ) {
    const check = otherConn.getCheck();
    if (check && !check.includes('InstantInTime')) {
      // Defined by App Inventor, absent when the plugin runs standalone.
      otherConn.getSourceBlock().badBlock?.();
    }
    return true;
  }
  const check = otherConn.getCheck();
  return !check || check.includes('InstantInTime');
};

/** The Blockly checks a Yail type maps to, per connection direction. */
export interface BlocklyTypeEntry {
  input: TypeCheck[] | null;
  output: TypeCheck[] | null;
}

// Convert Yail types to Blockly types
// Yail types are represented by strings: number, text, list, any, ...
// Blockly types are represented by objects: Number, String, ...
// and by the string "COMPONENT"
// The Yail type 'any' is repsented by Javascript null, to match
// Blockly's convention
export const YailTypeToBlocklyTypeMap: {
  [yailType: string]: BlocklyTypeEntry;
} = {
  'number': {
    'input': ['Number'],
    'output': ['Number', 'String', 'Key'],
  },
  'text': {
    'input': ['String'],
    'output': ['Number', 'String', 'Key'],
  },
  'boolean': {
    'input': ['Boolean'],
    'output': ['Boolean', 'String'],
  },
  'list': {
    'input': ['Array'],
    'output': ['Array', 'String'],
  },
  'component': {
    'input': ['COMPONENT'],
    'output': ['COMPONENT', 'Key'],
  },
  'InstantInTime': {
    'input': ['InstantInTime', InstantInTime],
    'output': ['InstantInTime', InstantInTime],
  },
  'any': {
    'input': null,
    'output': null,
  },
  'dictionary': {
    'input': ['Dictionary'],
    'output': ['Dictionary', 'String', 'Array'],
  },
  'pair': {
    'input': ['Pair'],
    'output': ['Pair', 'String', 'Array'],
  },
  'key': {
    'input': ['Key'],
    'output': ['String', 'Key'],
  },
};

export const OUTPUT = 'output';
export const INPUT = 'input';

/**
 * Gets the equivalent Blockly type for a given Yail type.
 *
 * An unknown Yail type throws from the indexing itself, as it always has;
 * only a known type with an unknown direction reaches the explicit throw.
 *
 * @param yail The Yail type.
 * @param inputOrOutput Either OUTPUT or INPUT.
 * @return The Blockly check list, or null for the 'any' type.
 */
export const yailTypeToBlocklyType = function (
  yail: string,
  inputOrOutput: 'input' | 'output',
): TypeCheck[] | null {
  const type = YailTypeToBlocklyTypeMap[yail][inputOrOutput];
  if (type === undefined) {
    throw new Error('Unknown Yail type: ' + yail + ' -- YailTypeToBlocklyType');
  }
  return type;
};

// Blockly doesn't wrap tooltips, so these can get too wide.  We'll create our
// own tooltip setter that wraps to length 60.

/**
 * Sets a block's tooltip, wrapped to a readable width.
 *
 * @param block The block to set the tooltip on.
 * @param tooltip The tooltip text.
 */
export const setTooltip = function (
  block: Blockly.Block,
  tooltip: string,
): void {
  block.setTooltip(wrapSentence(tooltip, 60));
};

// Wrap a string by splitting at spaces. Permit long chunks if there
// are no spaces.

/**
 * Wraps a string at spaces, allowing long runs without spaces to overflow.
 *
 * @param str The string to wrap.
 * @param len The column to wrap at.
 * @return The wrapped string.
 */
export const wrapSentence = function (str: string, len: number): string {
  str = str.trim();
  if (str.length < len) return str;
  const place = str.lastIndexOf(' ', len);
  if (place == -1) {
    return str.substring(0, len).trim() + wrapSentence(str.substring(len), len);
  } else {
    return (
      str.substring(0, place).trim() +
      '\n' +
      wrapSentence(str.substring(place), len)
    );
  }
};

/**
 * Returns an array containing just the element children of the given element.
 *
 * @param element The element whose element children we want.
 * @return An array or array-like list of just the element children.
 */
export const getChildren = function (
  element: Element,
): HTMLCollection | Element[] {
  // We check if the children attribute is supported for child elements
  // since IE8 misuses the attribute by also including comments.
  if (element.children !== undefined) {
    return element.children;
  }
  // Fall back to manually filtering the element's child nodes.
  return Array.prototype.filter.call(element.childNodes, function (node: Node) {
    return node.nodeType == Blockly.utils.dom.NodeType.ELEMENT_NODE;
  });
};
