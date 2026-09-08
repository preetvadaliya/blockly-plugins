// Copyright © 2017 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0
/**
 * @license
 * @fileoverview Specialization of Blockly's FieldDropdown to allow setting
 * the value even if it's not one of the dynamically generated options.  We use
 * this in situations where we know that the value will eventually be in the
 * generated set.  This can occur, for example, when we are loading from XML and
 * we have procedure call blocks being created before their respective
 * procedure definition block.
 *
 * @author mark.friedman@gmail.com (Mark Friedman)
 */

import * as Blockly from 'blockly/core';
import '../msg';

/**
 * FieldDropdown keeps its cached option list private, and this field has
 * always reached into it. The comment below the cast is the original's, kept
 * because it is still the accurate warning.
 */
interface WithGeneratedOptions {
  generatedOptions: Blockly.MenuOption[];
}

/**
 * A dropdown that accepts a value which is not yet among its options.
 */
export class FieldNoCheckDropdown extends Blockly.FieldDropdown {
  /**
   * Accepts any value, adding it to the cached options if it is not already
   * there.
   *
   * @param opt_newValue The value being set.
   * @return The value, unchanged.
   */
  protected doClassValidation_(opt_newValue?: string): string | null {
    let isValueValid = false;
    const options = this.getOptions(true);
    for (let i = 0, option; (option = options[i]); i++) {
      // Options are tuples of human-readable text and language-neutral values.
      if (option[1] === opt_newValue) {
        isValueValid = true;
        break;
      }
    }
    if (!isValueValid) {
      // Add the value to the cached options array.  Note that this is
      // potentially fragile, as it depends on knowledge of the
      // Blockly.FieldDropdown implementation.
      (this as unknown as WithGeneratedOptions).generatedOptions.push([
        opt_newValue as string,
        opt_newValue as string,
      ]);
    }
    return opt_newValue as string;
  }

  /**
   * Construct a FieldNoCheckDropdown from a JSON arg object.
   *
   * @param options A JSON object with options (options).
   * @return The new field instance.
   */
  static fromJson(
    options: Blockly.FieldDropdownFromJsonConfig,
  ): FieldNoCheckDropdown {
    return new FieldNoCheckDropdown(
      options['options'] as Blockly.MenuGenerator,
      undefined,
      options,
    );
  }
}

Blockly.fieldRegistry.register('field_nocheck_dropdown', FieldNoCheckDropdown);
