// Copyright 2026 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @license
 * @fileoverview Represent sets of strings as objects with an elements field
 *   that is itself an object mapping each element to true.
 *
 * The original noted that ECMAScript 6 has Set and that this could be
 * rewritten to use it. That is still true and still not done here: this file
 * is a translation, and swapping the representation would change what
 * toList's ordering and the elements field itself expose to callers.
 * @author fturbak@wellesley.edu (Lyn Turbak)
 */

/**
 * History:
 * [lyn, 06/30/14] added to ai2inter (should also add to master)
 * [lyn, 11/16/13] created
 */

import type {Substitution} from './substitution';

/** The backing map, holding true for each member. */
export interface Elements {
  [name: string]: boolean | undefined;
}

/**
 * A set of names.
 */
export class NameSet {
  /** The members, each mapped to true. */
  elements: Elements;

  /**
   * Constructs a set from a list of names, or the empty set if none is given.
   *
   * @param names The initial members.
   */
  constructor(names?: string[]) {
    if (!names) {
      names = [];
    }
    this.elements = {};
    for (let i = 0, name; (name = names[i]); i++) {
      this.elements[name] = true;
    }
  }

  /**
   * @param x The name to look for.
   * @return True if the name is a member.
   */
  isMember(x: string): boolean {
    return !!this.elements[x];
  }

  /**
   * @return True if the set has no members.
   */
  isEmpty(): boolean {
    for (const elt in this.elements) {
      if (elt !== undefined) return false;
    }
    return true;
  }

  /**
   * @return The number of members.
   */
  size(): number {
    let size = 0;
    for (const elt in this.elements) {
      if (elt !== undefined) size++;
    }
    return size;
  }

  /**
   * @return The members, in lexicographic order.
   */
  toList(): string[] {
    const result = [];
    for (const elt in this.elements) {
      result.push(elt);
    }
    return result.sort();
  }

  /**
   * @return A string representation of this set.
   */
  toString(): string {
    return 'NameSet{' + this.toList().join(',') + '}';
  }

  /**
   * @return A copy of this set.
   */
  copy(): NameSet {
    const result = new NameSet();
    for (const elt in this.elements) {
      result.insert(elt);
    }
    return result;
  }

  /**
   * Changes this set to have the same members as another.
   *
   * @param otherSet The set to copy.
   */
  mirror(otherSet: NameSet): void {
    for (const elt in this.elements) {
      delete this.elements[elt];
    }
    for (const elt in otherSet.elements) {
      this.elements[elt] = true;
    }
  }

  /* ***********************************************************
   * DESTRUCTIVE OPERATIONS
   * Change the existing set
   *********************************************************** */

  /**
   * Adds a name. Does not complain if it is already a member.
   *
   * @param x The name to add.
   */
  insert(x: string): void {
    this.elements[x] = true;
  }

  /**
   * Removes a name. Does not complain if it is not a member.
   *
   * Named deleteName rather than delete because delete is reserved.
   *
   * @param x The name to remove.
   */
  deleteName(x: string): void {
    delete this.elements[x];
  }

  /**
   * Changes this set to its union with another.
   *
   * @param otherSet The set to unite with.
   */
  unite(otherSet: NameSet): void {
    for (const elt in otherSet.elements) {
      this.elements[elt] = true;
    }
  }

  /**
   * Changes this set to its intersection with another.
   *
   * @param otherSet The set to intersect with.
   */
  intersect(otherSet: NameSet): void {
    for (const elt in this.elements) {
      if (!otherSet.elements[elt]) {
        delete this.elements[elt];
      }
    }
  }

  /**
   * Changes this set to its difference with another.
   *
   * @param otherSet The set to subtract.
   */
  subtract(otherSet: NameSet): void {
    for (const elt in this.elements) {
      if (otherSet.elements[elt]) {
        delete this.elements[elt];
      }
    }
  }

  /**
   * Renames this set's members in place.
   *
   * Several members can rename to the same name, so this may shrink the set.
   *
   * @param substitution The renaming to apply.
   */
  rename(substitution: Substitution): void {
    this.mirror(this.renamed(substitution));
  }

  /* ***********************************************************
   * NONDESTRUCTIVE OPERATIONS
   * Return new sets
   *********************************************************** */

  /**
   * @param x The name to add.
   * @return A new set with the name added.
   */
  insertion(x: string): NameSet {
    const result = this.copy();
    result.insert(x);
    return result;
  }

  /**
   * @param x The name to remove.
   * @return A new set without the name.
   */
  deletion(x: string): NameSet {
    const result = this.copy();
    result.deleteName(x);
    return result;
  }

  /**
   * @param otherSet The set to unite with.
   * @return A new set that is the union of the two.
   */
  union(otherSet: NameSet): NameSet {
    const result = this.copy();
    result.unite(otherSet);
    return result;
  }

  /**
   * @param otherSet The set to intersect with.
   * @return A new set that is the intersection of the two.
   */
  intersection(otherSet: NameSet): NameSet {
    const result = this.copy();
    result.intersect(otherSet);
    return result;
  }

  /**
   * @param otherSet The set to subtract.
   * @return A new set that is the difference of the two.
   */
  difference(otherSet: NameSet): NameSet {
    const result = this.copy();
    result.subtract(otherSet);
    return result;
  }

  /**
   * @param substitution The renaming to apply.
   * @return A new set with the members renamed. A member the substitution
   *     does not bind is carried over unchanged.
   */
  renamed(substitution: Substitution): NameSet {
    const result = new NameSet();
    for (const elt in this.elements) {
      const renamedElt = substitution.apply(elt);
      if (renamedElt) {
        result.insert(renamedElt);
      } else {
        result.insert(elt);
      }
    }
    return result;
  }

  /**
   * @param setList The sets to unite.
   * @return A new set that is the union of all of them.
   */
  static unionAll(setList: NameSet[]): NameSet {
    const result = new NameSet();
    for (let i = 0, oneSet; (oneSet = setList[i]); i++) {
      result.unite(oneSet);
    }
    return result;
  }

  /**
   * @param setList The sets to intersect.
   * @return A set that is the intersection of all of them.
   *
   *     Note this modifies the first set in the list rather than copying it,
   *     and returns that same object. Preserved as it was, since callers may
   *     rely on either the aliasing or the mutation.
   */
  static intersectAll(setList: NameSet[]): NameSet {
    if (setList.length === 0) {
      return new NameSet();
    } else {
      const result = setList[0];
      for (let i = 1, oneSet; (oneSet = setList[i]); i++) {
        result.intersect(oneSet);
      }
      return result;
    }
  }
}
