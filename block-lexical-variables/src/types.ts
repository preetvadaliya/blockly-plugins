// Copyright 2026 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @license
 * @fileoverview Declarations for the host application's half of the contract.
 *
 * This plugin is written to run inside MIT App Inventor as well as on its
 * own, and it calls into things App Inventor defines that Blockly does not.
 * None of them are declared anywhere in this package, so under TypeScript
 * every call site would be an error even though the code is correct as it
 * stands.
 *
 * They are declared optional rather than required, which is the honest shape:
 * outside App Inventor they are genuinely absent, and the call sites already
 * guard for that — `if (this.workspace.loadCompleted)` is exactly such a
 * guard. Declaring them required would let new code call them unguarded and
 * break the standalone case.
 *
 * This file adds no runtime code. It exists so that the augmentation is
 * written down in one place instead of being spread across casts.
 */

import type * as Blockly from 'blockly/core';

declare module 'blockly/core' {
  interface Block {
    /**
     * Marks a block as bad, so App Inventor renders it with an error.
     *
     * Defined by the host application, and called from the InstantInTime
     * connection check when a workspace is still loading. Absent when the
     * plugin runs outside App Inventor.
     */
    badBlock?(): void;

    /**
     * Marks a getter or setter as referring to an event parameter.
     *
     * Written by FieldLexicalVariable when it resolves a name inside a
     * component_event block. Undefined means not an event parameter, and
     * null is written deliberately to distinguish "checked, and it is not"
     * from "never looked".
     */
    eventparam?: string | null;
  }

  interface Workspace {
    /**
     * Whether the host has finished loading a project into this workspace.
     *
     * Set by App Inventor's BlocklyPanel. While it is falsey, procedure
     * blocks skip mutating their callers, because the callers may not exist
     * yet. Always absent outside App Inventor, which is why every read of it
     * is a truthiness check.
     */
    loadCompleted?: boolean;

    /**
     * Whether blocks that fail their own validity checks should be disabled.
     *
     * Set from the options passed to LexicalVariablesPlugin.init.
     */
    disableInvalidBlocks?: boolean;
  }
}

// `export {}` is what makes this a module, so the declare block above
// augments 'blockly/core' rather than declaring a new global.
export {};

// Referenced so the Blockly import is not elided as unused; the augmentation
// above needs the module in scope.
export type BlocklyModule = typeof Blockly;
