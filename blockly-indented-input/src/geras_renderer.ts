/**
 * @license
 * Copyright 2026 Preet Vadaliya
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview A Geras renderer that draws an indented input as a body.
 *
 * Blockly's block model is pluggable for inputs — there is a
 * `registry.Type.INPUT` slot, `appendInput` is public, and a JSON block
 * definition can name a registered input type. Its *rendering* is not.
 * `RenderInfo.addInput_` is a closed `if / else if` chain over the four
 * built-in classes with no `else`, so nothing downstream knows what to do with
 * a fifth. Drawing a new input therefore means shipping a renderer, which is
 * what this file is.
 *
 * The trick that makes it small is one line in `addInput_`: mark the row as
 * `hasStatement`. Roughly twenty places across Geras key off that flag — the
 * outline dispatch, the statement edge, row spacing — so setting it buys the
 * entire indented layout rather than a single code path.
 *
 * What it does *not* buy is the outline, and the shape of that outline is the
 * whole point. A statement well is a rounded C with a notch on its top edge.
 * This is a square-cornered well with a **puzzle tab on its inner wall** — the
 * identical profile Geras cuts into a block's right edge for an ordinary value
 * input, just relocated to the statement edge. That is what makes it a socket
 * an output tab can seat in, and it is the shape MIT App Inventor uses.
 *
 * So: **statement indent, value socket.**
 */

import * as Blockly from 'blockly/core';

import {IndentedValueInput} from './indented_value_input';

const svgPaths = Blockly.utils.svgPaths;

/**
 * The name this renderer is registered under.
 *
 * Pass it to `Blockly.inject`:
 *
 * ```js
 * Blockly.inject('blocklyDiv', {renderer: 'geras-indented', toolbox});
 * ```
 */
export const INDENTED_RENDERER_NAME = 'geras-indented';

/**
 * The tab cut into the well's inner wall.
 *
 * Geras's tab is a fixed path, but a renderer may use a shape whose path is a
 * function of the height it has to span, so both are handled — the same test
 * `Drawer.drawValueInput_` makes for the tab on a block's right edge.
 *
 * @param measurable The indented input being drawn.
 * @returns The `pathDown` for the tab.
 */
function tabPathDown(measurable: IndentedValueInputMeasurable): string {
  const shape = measurable.shape as
    Blockly.blockRendering.PuzzleTab | Blockly.blockRendering.DynamicShape;
  return typeof shape.pathDown === 'function'
    ? shape.pathDown(measurable.height)
    : shape.pathDown;
}

/**
 * The length of wall below the tab.
 *
 * The three vertical segments of the wall — down to the tab, the tab, then the
 * rest — must sum to exactly the row height or the outline will not close on
 * the bottom edge.
 *
 * @param row The row holding the indented input.
 * @param measurable The indented input being drawn.
 * @returns The height of the wall below the tab, never negative.
 */
function wallBelowTab(
  row: Blockly.blockRendering.Row,
  measurable: IndentedValueInputMeasurable,
): number {
  // The clamp matters: `alignStatementRow_` raises the measurable to the row
  // height but nothing lowers the row to fit the tab, so a future layout rule
  // that squeezes the row should flatten the wall rather than send the path
  // backwards over itself.
  return Math.max(
    0,
    row.height - measurable.connectionHeight - measurable.connectionOffsetY,
  );
}

/**
 * Sizing for an indented input.
 *
 * Extends the external value measurable — which is what the input would be
 * measured as without this renderer — and changes only the two dimensions, so
 * `connectionWidth`, `connectionHeight` and `connectionOffsetY` still describe
 * an ordinary value socket. Those three fields are what the drawer builds the
 * wall from, and reusing them is what makes the socket the same shape as the
 * one on a block's right edge.
 */
export class IndentedValueInputMeasurable
  extends Blockly.blockRendering.ExternalValueInput
{
  /**
   * @param constants Geras's constants — narrower than the base measurable's
   *     parameter, because `DARK_PATH_OFFSET` is Geras's own and this
   *     measurable is only ever built by the render info below, which holds
   *     exactly this type.
   * @param input The input to measure.
   */
  constructor(constants: Blockly.geras.ConstantProvider, input: Blockly.Input) {
    super(constants, input);

    // An external value input is only as tall as its tab, because the block it
    // holds hangs off the side. A body has to be a well you can drop into, so
    // an empty one takes a statement's height.
    //
    // A filled one is exactly its block, and the two inset by
    // `connectionOffsetY` are why. The tab is cut that far below the top of the
    // well; the child's own output tab is cut the same distance below *its*
    // top, because both come from `TAB_OFFSET_FROM_TOP`. Seating one in the
    // other therefore lines the child's top edge up with the top of the well,
    // and matching the height closes the floor under it.
    this.height = this.connectedBlockHeight
      ? this.connectedBlockHeight
      : constants.EMPTY_STATEMENT_INPUT_HEIGHT;

    // The measurable's width is the distance from the well's inner wall to the
    // block's right edge — `alignStatementRow_` derives the statement edge as
    // `row.width - measurable.width`, then widens the measurable again until
    // the row reaches the block's edge.
    //
    // The floor gives an empty well the same width as a statement's, so the
    // two read as the same kind of socket. The connected block's width is the
    // one place this deliberately parts company with a statement input: a
    // statement child is *meant* to overflow its parent, because a C-block's
    // arms stay narrow while the stack inside runs past them. A value body is
    // not — it reads as part of the enclosing expression, so the block has to
    // grow around it. Adding an indent allowance on top would double-count,
    // since the body already starts *at* the wall — the only thing to add is
    // the one pixel the child is nudged right by, below.
    this.width = Math.max(
      constants.STATEMENT_INPUT_NOTCH_OFFSET + (this.shape.width as number),
      this.connectedBlockWidth + constants.DARK_PATH_OFFSET,
    );
  }
}

/**
 * Adds the 3D highlight for an indented input.
 *
 * Geras is the renderer with a light source, so a new outline needs a matching
 * highlight or the block looks flat exactly where the new shape is. The lit
 * surfaces of this well are the puzzle tab and the well's floor, which is the
 * same pair of surfaces Geras lights on a statement well.
 */
export class IndentedHighlighter extends Blockly.geras.Highlighter {
  /**
   * Adds the highlight for a row holding an indented input.
   *
   * @param row The row to highlight.
   */
  drawIndentedInput(row: Blockly.blockRendering.Row) {
    const measurable = row.getLastInput();
    if (!(measurable instanceof IndentedValueInputMeasurable)) return;

    const wallX = measurable.xPos + measurable.connectionWidth;
    const tabY = row.yPos + measurable.connectionOffsetY;

    if (this.RTL_) {
      // Mirrored, the wall faces the light, so it is highlighted along its
      // whole length rather than just at the floor.
      this.steps_ +=
        svgPaths.moveTo(wallX + this.highlightConstants_.OFFSET - 1, row.yPos) +
        svgPaths.lineOnAxis('v', measurable.connectionOffsetY) +
        this.puzzleTabPaths_.pathDown(this.RTL_) +
        svgPaths.lineOnAxis('v', wallBelowTab(row, measurable));
    } else {
      this.steps_ +=
        svgPaths.moveTo(wallX, tabY) +
        this.puzzleTabPaths_.pathDown(this.RTL_) +
        // The floor of the well. This also leaves the pen at the bottom right
        // of the well, which the following spacer row's `drawRightSideRow`
        // relies on: it emits an absolute `H`, so it takes its y from here.
        svgPaths.moveTo(wallX, row.yPos + row.height) +
        svgPaths.lineOnAxis(
          'H',
          row.xPos + row.width - this.highlightConstants_.OFFSET,
        );
    }
  }
}

/**
 * Measures blocks, recognising the indented input.
 */
export class IndentedRenderInfo extends Blockly.geras.RenderInfo {
  /**
   * Adds an input to the row being measured.
   *
   * Everything except our own input type is left to Geras.
   *
   * @param input The input to add.
   * @param activeRow The row being built.
   */
  override addInput_(
    input: Blockly.Input,
    activeRow: Blockly.blockRendering.Row,
  ) {
    if (!(input instanceof IndentedValueInput)) {
      super.addInput_(input, activeRow);
      return;
    }

    activeRow.elements.push(
      new IndentedValueInputMeasurable(this.constants_, input),
    );
    // Deliberately claiming to be a statement row. This is what earns the
    // indent: Geras computes a `statementEdge` for the row and lays it out as
    // a body. The claim is not free — anything Geras does for statement rows
    // it now does here — but it is what makes the layout work without
    // reimplementing it.
    activeRow.hasStatement = true;
  }

  /**
   * How wide a row should be padded out to.
   *
   * This is the second place the `hasStatement` claim has to be taken back,
   * and it is the more interesting one. Geras caps a statement row on an
   * inline block:
   *
   * ```ts
   * if (this.isInline && row.hasStatement) {
   *   return this.statementEdge + this.constants_.MAX_BOTTOM_WIDTH + this.startX;
   * }
   * ```
   *
   * That is right for a statement: a C-block's arm stays a fixed 30px stub and
   * the stack inside runs past it, which is how a C-block is supposed to look.
   * Applied here it caps the row below the body it contains, so the body
   * overflows on the right and the block's outline jogs inward for the last
   * two rows. Falling back to the base rule — pad to the block's width — keeps
   * the body enclosed and the right edge straight.
   *
   * @param row The row being padded.
   * @returns The width to pad it to.
   */
  override getDesiredRowWidth_(row: Blockly.blockRendering.Row): number {
    if (row.getLastInput() instanceof IndentedValueInputMeasurable) {
      // `RenderInfo.getDesiredRowWidth_`, which Geras's override shadows.
      return this.width - this.startX;
    }
    return super.getDesiredRowWidth_(row);
  }

  /**
   * Decides whether an input begins a new row.
   *
   * Needed because the input is a `ValueInput`, and the base rule only breaks
   * a row before a value input when the block is *not* inline
   * (`return !this.isInline`). A statement input breaks unconditionally. So on
   * an inline block an indented input would share a row with whatever came
   * before it and the well would collapse — the layout equivalent of the
   * `instanceof` problem this whole file exists to work around.
   *
   * It also keeps a row from ever holding both an indented input and a real
   * statement input, which matters because the drawer resolves a row through
   * `getLastInput()` and could otherwise draw only one of the two.
   *
   * @param curr The input being placed.
   * @param prev The input before it, if any.
   * @returns Whether `curr` starts a new row.
   */
  protected override shouldStartNewRow_(
    curr: Blockly.Input,
    prev?: Blockly.Input,
  ): boolean {
    if (!prev) return false;
    if (
      curr instanceof IndentedValueInput ||
      prev instanceof IndentedValueInput
    ) {
      return true;
    }
    return super.shouldStartNewRow_(curr, prev);
  }
}

/**
 * Draws blocks, giving the indented input a value socket on an indented wall.
 */
export class IndentedDrawer extends Blockly.geras.Drawer {
  override highlighter_: IndentedHighlighter;

  /**
   * @param block The block to draw.
   * @param info The measurements for that block.
   */
  constructor(block: Blockly.BlockSvg, info: Blockly.geras.RenderInfo) {
    super(block, info);
    // Replaces the one the base constructor just made. It is a subclass, so
    // every other `this.highlighter_` call in Geras keeps working.
    this.highlighter_ = new IndentedHighlighter(info);
  }

  /**
   * Draws the right-hand side of a row Geras believes holds a statement.
   *
   * Because `addInput_` sets `hasStatement`, the base `drawOutline_` routes
   * indented rows here too, so this is the one place that has to tell them
   * apart.
   *
   * @param row The row to draw.
   */
  override drawStatementInput_(row: Blockly.blockRendering.Row) {
    const measurable = row.getLastInput();
    if (!(measurable instanceof IndentedValueInputMeasurable)) {
      super.drawStatementInput_(row);
      return;
    }

    this.highlighter_.drawIndentedInput(row);

    // Compare `Drawer.drawValueInput_`, which is
    //   H (xPos + width) · pathDown · v (row.height - connectionHeight)
    // — the same three moves against the block's right edge. Here the wall is
    // at the statement edge instead, so the outline has to come in to it and
    // go back out again, and the tab is inset from the top of the well by
    // `connectionOffsetY` rather than sitting flush with the row.
    //
    // `xPos` is the statement edge and `xPos + width` is the block's right
    // edge: `alignStatementRow_` guarantees both. Reading them off the
    // measurable rather than recomputing them is what keeps the outline and
    // the connection below from ever disagreeing.
    this.outlinePath_ +=
      // In along the top of the well, to the wall.
      svgPaths.lineOnAxis('H', measurable.xPos + measurable.connectionWidth) +
      // Down the wall: a little clearance, the socket, then the rest.
      svgPaths.lineOnAxis('v', measurable.connectionOffsetY) +
      tabPathDown(measurable) +
      svgPaths.lineOnAxis('v', wallBelowTab(row, measurable)) +
      // Back out along the floor, to the block's right edge.
      svgPaths.lineOnAxis('H', measurable.xPos + measurable.width);

    this.positionIndentedConnection_(row, measurable);
  }

  /**
   * Places the connection at the mouth of the socket.
   *
   * Geras puts an external value connection at the block's right edge, which
   * is where that outline starts its tab. This does the same thing against the
   * inner wall, so a child seats with its left edge on the wall and its output
   * tab filling the cut.
   *
   * @param row The row holding the indented input.
   * @param measurable The indented input.
   */
  protected positionIndentedConnection_(
    row: Blockly.blockRendering.Row,
    measurable: IndentedValueInputMeasurable,
  ) {
    if (!measurable.connectionModel) return;

    // `DARK_PATH_OFFSET` is Geras's one-pixel shadow allowance; its own value
    // and inline connections both include it so the child sits on the shadow
    // rather than beside it.
    let connX =
      measurable.xPos +
      measurable.connectionWidth +
      this.constants_.DARK_PATH_OFFSET;
    if (this.info_.RTL) {
      connX *= -1;
    }

    measurable.connectionModel.setOffsetInBlock(
      connX,
      row.yPos + measurable.connectionOffsetY,
    );
  }
}

/**
 * Geras, plus the indented input.
 */
export class IndentedGerasRenderer extends Blockly.geras.Renderer {
  /**
   * @param block The block to measure.
   * @returns The measurement pass for this block.
   */
  protected override makeRenderInfo_(
    block: Blockly.BlockSvg,
  ): Blockly.geras.RenderInfo {
    return new IndentedRenderInfo(this, block);
  }

  /**
   * @param block The block to draw.
   * @param info The measurements for that block.
   * @returns The drawing pass for this block.
   */
  protected override makeDrawer_(
    block: Blockly.BlockSvg,
    info: Blockly.blockRendering.RenderInfo,
  ): Blockly.geras.Drawer {
    return new IndentedDrawer(block, info as Blockly.geras.RenderInfo);
  }
}

/**
 * Whether the renderer has been registered.
 */
let registered = false;

/**
 * Registers the renderer under `INDENTED_RENDERER_NAME`.
 *
 * Called for its side effect when the package is imported. Registering does
 * not select it — a workspace opts in through `Blockly.inject`'s `renderer`
 * option, so importing this package cannot change how an existing workspace
 * looks.
 */
export function registerIndentedRenderer(): void {
  if (registered) return;
  registered = true;

  if (
    Blockly.registry.hasItem(
      Blockly.registry.Type.RENDERER,
      INDENTED_RENDERER_NAME,
    )
  ) {
    return;
  }

  Blockly.blockRendering.register(
    INDENTED_RENDERER_NAME,
    IndentedGerasRenderer,
  );
}
