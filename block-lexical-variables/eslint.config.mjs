// Copyright 2026 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

/**
 * @fileoverview ESLint configuration.
 *
 * Blockly publishes `@blockly/eslint-config`, but it is deprecated, still
 * peers on ESLint 7 and pulls in the abandoned `babel-eslint`. This
 * reproduces the house style it encoded — Google-ish source with documented
 * exports — on a current toolchain instead.
 *
 * Until this commit `npm run lint` could not run at all: the script is
 * `eslint .`, no configuration file had ever existed, and ESLint exits with
 * "No ESLint configuration found" rather than linting anything. Nothing here
 * was ever suppressed, because nothing was ever enforced — there is not one
 * eslint-disable comment in the package.
 *
 * Turning linting on therefore reports 405 findings against sources nobody
 * could previously check. Fixing all of that in the commit that adds the
 * configuration would bury the configuration itself, so the rule set is a
 * ratchet instead: a rule the sources already violate starts as a warning,
 * and the commit that clears those violations promotes it to an error. Every
 * commit stays green, and the direction is one-way.
 *
 * Documentation rules stay warnings throughout. Every exported symbol here is
 * already documented, but in Closure style with inline types, so the JSDoc
 * migrates as files move to TypeScript and the types move into signatures.
 *
 * Formatting is left entirely to Prettier. `eslint-config-prettier` goes last
 * and switches off every rule the two would otherwise argue about.
 */

import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'build/**', 'node_modules/**'],
  },

  js.configs.recommended,
  jsdoc.configs['flat/recommended'],

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {jsdoc},
    settings: {
      jsdoc: {
        // Blockly writes @fileoverview in every core file; the plugin's
        // default is to rewrite it to @file. Invert that preference.
        tagNamePreference: {file: 'fileoverview'},
      },
    },
    rules: {
      // Already clean, so these are errors from the start. no-undef is the
      // rule that pays for the whole exercise: its one violation was a
      // genuine ReferenceError, NameSet used without an import in
      // blocks/procedures.js, and fixing that is what lets it ship as an
      // error here.
      'no-throw-literal': 'error',
      'no-undef': 'error',

      // The ratchet. Each is promoted to 'error' by the commit that clears
      // its violations; the counts are what `eslint .` reports today.
      //
      //   no-var               22   mechanical
      'no-var': 'warn',
      //   prefer-const         10   mechanical
      'prefer-const': 'warn',
      //   no-unused-vars       19   needs reading, not a bulk fix
      'no-unused-vars': ['warn', {argsIgnorePattern: '^_'}],
      //   no-cond-assign       18   mostly deliberate `while ((x = next()))`
      'no-cond-assign': 'warn',
      //   no-useless-assignment 4
      'no-useless-assignment': 'warn',
      //   eqeqeq               58   `==` to `===` changes behaviour around
      //                             null and undefined, so it is reviewed
      //                             case by case rather than swept
      eqeqeq: ['warn', 'always', {null: 'ignore'}],

      // Documentation. Warnings for now: the sources are documented, but in
      // Closure style with inline types. These tighten to errors as files
      // move to TypeScript and the types migrate into the signatures.
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-returns-description': 'warn',
      'jsdoc/check-param-names': 'warn',
      'jsdoc/check-tag-names': 'warn',
      'jsdoc/no-undefined-types': 'off',
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/require-description-complete-sentence': 'off',
      'jsdoc/tag-lines': 'off',

      // Blockly's file headers put the licence on its own lines, so @license
      // carries no inline value for this rule to validate.
      'jsdoc/check-values': 'off',
    },
  },

  {
    // The playground and the mocha suites are development-only entry points.
    // They stay JavaScript on purpose: `@blockly/dev-scripts` finds test
    // entries with a literal `.mocha.js` filename filter, so a `.mocha.ts`
    // suite is silently skipped and `npm test` passes having run nothing.
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.mocha,
      },
    },
    rules: {
      // Test callbacks are self-describing; requiring JSDoc on every suite
      // and case would be noise rather than documentation.
      'jsdoc/require-jsdoc': 'off',
    },
  },

  prettier,
];
