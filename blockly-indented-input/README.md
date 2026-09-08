<h1 align="center">
  blockly-indented-input
  <br />
  <img src="https://badge.ttsalpha.com/api?icon=typescript&label=TypeScript&status=5.9.3&color=3178C6&iconColor=3178C6" alt="TypeScript" />
  <img src="https://badge.ttsalpha.com/api?icon=nodedotjs&label=Node.js&status=20&color=5FA04E&iconColor=5FA04E" alt="Node.js" />
  <img src="https://badge.ttsalpha.com/api?icon=npm&label=NPM&status=10&color=CB3837&iconColor=CB3837" alt="NPM" />
  <br />
  <img src="https://badge.ttsalpha.com/api?label=Blockly&status=13.2.1&color=4285F4" alt="Blockly" />
  <img src="https://badge.ttsalpha.com/api?label=License&status=Apache--2.0&color=D22128" alt="License" />
</h1>

**blockly-indented-input** adds a new kind of Blockly input: a socket that accepts a **value** block but is **indented into the block**, the way a statement body is. The well is cut where a statement's would be, and its inner wall carries the same puzzle tab an ordinary value input has — so any block with an output plugs straight in. Statement indent, value socket. It is for languages with expression bodies — `let x = 1 in <expr>`, or a function whose body is a single expression — where the body must _connect_ like a value because it produces one, but should _read_ like a block of code.

The idea comes from MIT App Inventor, whose `local_declaration_expression` block uses exactly this to render "initialize local x to \[ \] **in** \[ \]" with the "in" socket indented.

## Core Dependencies

Before setting up the project, ensure you have the following installed:

1. **Node.js** — `v20+` &nbsp; [Download Node.js](https://nodejs.org/)
2. **NPM** — `v10+` &nbsp; [Learn about NPM](https://www.npmjs.com/)
3. **Blockly** — `v13.2.1` (peer dependency) &nbsp; [Blockly docs](https://developers.google.com/blockly)

> [!IMPORTANT]
> **It is a value input, not a lookalike.**
>
> The input extends Blockly's own `ValueInput` and reports `inputTypes.VALUE`,
> so serialization, events, undo, copy and paste, connection checking and the
> whole `Input` API reach it through the same code paths as `input_value` —
> there is no parallel implementation of any of them to drift out of step.
> `test/parity.mocha.js` runs each of those operations against a stock
> `input_value` and an `input_indented_value` on otherwise identical blocks and
> asserts the two agree.
>
> Two consequences worth knowing. In a generator, use `valueToCode`, not
> `statementToCode` — it looks like a body but it yields a value. And
> `block.statementInputCount` stays `0`, because only `appendStatementInput`
> increments it.

> [!IMPORTANT]
> **The indented look needs the bundled renderer; the input does not.**
>
> Blockly's block model is pluggable for inputs, but its rendering is not —
> `RenderInfo.addInput_` is a closed `instanceof` chain with no fallback. So
> drawing a new input means shipping a renderer, and this package ships one.
>
> The input extends `ValueInput` rather than `Input` precisely so that this
> stays a matter of appearance. Without the renderer selected, the socket is
> still created, still connects, still saves and still loads — it is simply
> drawn as an ordinary external value socket on the right edge. Degraded, never
> broken.

## Repository Structure

```plaintext
|
├── 📁 .github                    # CI and publish workflows
├── 📁 src                          # Plugin source, TypeScript
│   ├── 📄 indented_value_input.ts  # The input type and its registration
│   ├── 📄 geras_renderer.ts        # The Geras stack that draws it
│   └── 📄 index.ts                 # Public exports
├── 📁 test                         # Mocha suites and the playground
│   ├── 📄 parity.mocha.js          # Asserts it matches a stock value input
│   └── 📄 index.js                 # The playground
├── 📄 .gitignore
├── 📄 .prettierrc.json           # Format config
├── 📄 eslint.config.mjs          # Lint config
├── 📄 tsconfig.json              # TypeScript config
├── 📄 package.json
└── 📄 README.md                  # Project overview
|
```

## Getting Started

### Use it in an application

```bash
npm install @mit-app-inventor/blockly-indented-input
```

```js
import * as Blockly from 'blockly';
import {INDENTED_RENDERER_NAME} from '@mit-app-inventor/blockly-indented-input';

const workspace = Blockly.inject('blocklyDiv', {
  toolbox,
  renderer: INDENTED_RENDERER_NAME,
});
```

Then name `input_indented_value` in any JSON block definition, alongside Blockly's own `input_value` and `input_statement`:

```js
Blockly.Blocks['let_expression'] = {
  init: function () {
    this.jsonInit({
      message0: 'initialize local %1 to %2',
      args0: [
        {type: 'field_input', name: 'NAME', text: 'name'},
        {type: 'input_value', name: 'VALUE'},
      ],
      message1: 'in %1',
      args1: [{type: 'input_indented_value', name: 'RETURN'}],
      output: null,
    });
  },
};
```

Or build it imperatively — the package adds `appendIndentedValueInput` to `Block`, so it reads exactly like `appendValueInput`:

```js
Blockly.Blocks['let_expression'] = {
  init: function () {
    this.appendValueInput('VALUE').appendField('initialize local');
    this.appendIndentedValueInput('RETURN').appendField('in');
    this.setOutput(true);
  },
};
```

### Work on it locally

```bash
git clone https://github.com/mit-cml/blockly-plugins.git
cd blockly-plugins/blockly-indented-input
npm install
npm start
```

`npm start` opens the playground, which carries the `let_expression` block above, a minimal single-input block, an inline block, and the stock `input_value` + `input_statement` equivalent — worth putting side by side, since the difference between the two sockets is the whole point. Switch the renderer to plain `geras` in the Options panel to see the fallback. Other scripts:

```bash
npm test               # typecheck, then the mocha suites
npm run build          # bundle and .d.ts into dist/
npm run lint           # ESLint
npm run format         # Prettier
```

<p align="center">Built with :heart: for <b>Blockly</b></p>
