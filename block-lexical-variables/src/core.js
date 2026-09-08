// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2024 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

'use strict';

import {registerCss} from '../src/css';
import './utilities';
import './workspace';
import './inputs/indented_input';
import './procedure_utils';
import {Flydown} from './fields/flydown';
import {FieldFlydown} from "./fields/field_flydown";
import {FieldGlobalFlydown} from "./fields/field_global_flydown";
import './fields/field_nocheck_dropdown';
import {FieldLexicalVariable, LexicalVariable} from './fields/field_lexical_variable';
import {FieldParameterFlydown} from './fields/field_parameter_flydown';
import {FieldProcedureName} from './fields/field_procedurename';
import {FieldNoCheckDropdown} from './fields/field_nocheck_dropdown';
import {NameSet} from './nameSet';
import * as Shared from './shared';
import {Substitution} from './substitution';
import './procedure_database';
import * as Blockly from 'blockly/core';
import {GerasRenderer} from './renderers/geras';
import {lexicalVariableScopeMixin} from './mixins'

export class LexicalVariablesPlugin {

    /**
     * @param workspace
     * @param options
     */
    static init(workspace, options) {
        // TODO(ewpatton): We need to make sure this is reentrant.
        const rendererName = workspace.getRenderer().getClassName();
        const themeName = workspace.getTheme().getClassName();
        const selector = `.${rendererName}.${themeName}`;
        registerCss(selector);

        // TODO: Might need the next line
        // Blockly.DropDownDiv.createDom();
        const flydown = new Flydown(
            new Blockly.Options({
                scrollbars: false,
                rtl: workspace.RTL,
                renderer: workspace.options.renderer,
                rendererOverrides: workspace.options.rendererOverrides,
                parentWorkspace: workspace,
            })
        );
        // ***** [lyn, 10/05/2013] NEED TO WORRY ABOUT MULTIPLE BLOCKLIES! *****
        workspace.flydown_ = flydown;
        Blockly.utils.dom.insertAfter(flydown.createDom('g'),
            workspace.svgBubbleCanvas_);
        flydown.init(workspace);
        flydown.autoClose = true; // Flydown closes after selecting a block
        workspace.disableInvalidBlocks = options?.disableInvalidBlocks || false;
    }

    static Flydown = Flydown;
    static FieldFlydown = FieldFlydown;
    static FieldGlobalFlydown = FieldGlobalFlydown;
    static FieldParameterFlydown = FieldParameterFlydown;
    static lexicalVariableScopeMixin= lexicalVariableScopeMixin;
    static LexicalVariable = LexicalVariable;
    static FieldLexicalVariable = FieldLexicalVariable;
    static FieldProcedureName = FieldProcedureName;
    static FieldNoCheckDropdown = FieldNoCheckDropdown;
    static NameSet = NameSet;
    static Shared = Shared;
    static Substitution = Substitution;
}

Blockly.blockRendering.register('geras2_renderer', GerasRenderer);
