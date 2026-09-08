// Copyright 2026 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @license
 * @fileoverview A substitution is an abstract set of input/output name pairs
 *   used for renaming. The inputs form the domain of the substitution; the
 *   outputs form the range. Applying a substitution to a name in its domain
 *   maps it to the associated output; applying it to any other name returns
 *   the name unchanged.
 * @author fturbak@wellesley.edu (Lyn Turbak)
 */

/**
 * History:
 * [lyn, 06/30/14] added to ai2inter (should also add to master)
 * [lyn, 11/16-17/13] created
 */

/** A mapping from old names to new ones. */
export interface Bindings {
  [oldName: string]: string | undefined;
}

/**
 * An abstract set of input/output name pairs used for renaming.
 *
 * This is a direct translation of the previous prototype-based version and
 * keeps its behaviour exactly, including two quirks that callers may depend
 * on: isAllStringsArray reports false for an empty array, and
 * isBindingsObject reports true for null. Both are noted where they occur.
 */
export class Substitution {
  /** The name pairs, keyed by the name being replaced. */
  bindings: Bindings;

  /**
   * Constructs a substitution.
   *
   * Given two equal-length arrays of strings, binds each name in the first to
   * the name at the same index in the second. Given a single bindings object,
   * copies it, so the substitution never shares structure with its argument.
   * In every other case, including no arguments, constructs the empty
   * substitution.
   *
   * @param arg1 Either the input names or a bindings object.
   * @param arg2 The output names, when arg1 is an array.
   */
  constructor(arg1?: string[] | Bindings | null, arg2?: string[] | null) {
    this.bindings = {};
    if (
      Substitution.isAllStringsArray(arg2) &&
      Substitution.isAllStringsArray(arg1) &&
      (arg1 as string[]).length === (arg2 as string[]).length
    ) {
      const inputs = arg1 as string[];
      const outputs = arg2 as string[];
      for (let i = 0; i < inputs.length; i++) {
        this.bindings[inputs[i]] = outputs[i];
      }
    } else if (!arg2 && Substitution.isBindingsObject(arg1)) {
      // Copied so the substitution does not share structure with the
      // argument.
      const source = arg1 as Bindings;
      for (const oldName in source) {
        this.bindings[oldName] = source[oldName];
      }
    }
  }

  /**
   * Whether a value is an array containing only strings.
   *
   * Note this returns false for an empty array, because the original tested
   * for a truthy length rather than for arrayness. Callers rely on it: it is
   * what makes `new Substitution([], [])` fall through to the empty
   * substitution rather than the array branch.
   *
   * @param things The value to test.
   * @return True if it is a non-empty array of strings.
   */
  static isAllStringsArray(things: unknown): boolean {
    const candidate = things as {length?: number} | null | undefined;
    if (typeof things !== 'object' || !candidate || !candidate.length) {
      return false;
    }
    const array = things as unknown[];
    for (let i = 0; i < array.length; i++) {
      if (typeof array[i] !== 'string') {
        return false;
      }
    }
    return true;
  }

  /**
   * Whether a value can be used as a bindings object.
   *
   * Note this returns true for null, since typeof null is 'object' and the
   * loop over its properties then does not run. The constructor is guarded by
   * a falsiness check on the other argument, so the empty substitution is
   * still what comes out.
   *
   * @param thing The value to test.
   * @return True if it is an object.
   */
  static isBindingsObject(thing: unknown): boolean {
    return typeof thing === 'object';
  }

  /**
   * Constructs a substitution of a single name.
   *
   * @param oldName The name to replace.
   * @param newName The name to replace it with.
   * @return The substitution.
   */
  static simpleSubstitution(oldName: string, newName: string): Substitution {
    const bindings: Bindings = {};
    bindings[oldName] = newName;
    return new Substitution(bindings);
  }

  /**
   * Applies this substitution to a name.
   *
   * @param name The name to translate.
   * @return The bound name, or the name unchanged if it is not in the domain.
   */
  apply(name: string): string {
    const output = this.bindings[name];
    return output ? output : name;
  }

  /**
   * Applies this substitution to each of a list of names.
   *
   * @param names The names to translate.
   * @return The translated names.
   */
  map(names: string[]): string[] {
    return names.map((name) => this.apply(name));
  }

  /**
   * @return A string representation of this substitution, bindings sorted.
   */
  toString(): string {
    const bindingStrings = [];
    for (const oldName in this.bindings) {
      bindingStrings.push(oldName + ':' + this.bindings[oldName]);
    }
    return 'Substitution{' + bindingStrings.sort().join(',') + '}';
  }

  /**
   * @return A copy of this substitution, sharing no structure with it.
   */
  copy(): Substitution {
    const newSubst = new Substitution();
    for (const oldName in this.bindings) {
      newSubst.bindings[oldName] = this.bindings[oldName];
    }
    return newSubst;
  }

  /**
   * Narrows this substitution to a set of names.
   *
   * @param names The names to keep in the domain.
   * @return A new substitution bound only for those names that were bound.
   */
  restrictDomain(names: string[]): Substitution {
    const newSubst = new Substitution();
    for (let i = 0; i < names.length; i++) {
      const result = this.bindings[names[i]];
      if (result) {
        newSubst.bindings[names[i]] = result;
      }
    }
    return newSubst;
  }

  /**
   * Drops a set of names from this substitution's domain.
   *
   * @param names The names to remove.
   * @return A new substitution without those names.
   */
  remove(names: string[]): Substitution {
    const newSubst = new Substitution();
    for (const oldName in this.bindings) {
      if (names.indexOf(oldName) === -1) {
        newSubst.bindings[oldName] = this.bindings[oldName];
      }
    }
    return newSubst;
  }

  /**
   * Combines this substitution with another.
   *
   * Bindings from the other substitution win where the two disagree.
   *
   * @param otherSubst The substitution to add.
   * @return A new substitution holding both sets of bindings.
   */
  extend(otherSubst: Substitution): Substitution {
    const newSubst = this.copy();
    for (const oldName in otherSubst.bindings) {
      newSubst.bindings[oldName] = otherSubst.bindings[oldName];
    }
    return newSubst;
  }

  /**
   * @return The names this substitution translates, sorted.
   */
  domain(): string[] {
    const oldNames = [];
    for (const oldName in this.bindings) {
      oldNames.push(oldName);
    }
    return oldNames.sort();
  }

  /**
   * @return A copy of this substitution's bindings.
   */
  getBindings(): Bindings {
    const bindings: Bindings = {};
    for (const oldName in this.bindings) {
      bindings[oldName] = this.bindings[oldName];
    }
    return bindings;
  }
}
