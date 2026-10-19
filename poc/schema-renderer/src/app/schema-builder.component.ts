import {Component,EventEmitter,Input,Output,OnChanges,SimpleChanges} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Schema} from './schema-engine';

type NodeRow={path:string;label:string;depth:number;schema:Schema;required:boolean};
@Component({
 selector:'app-schema-builder',
 standalone:true,
 imports:[CommonModule,FormsModule],
 styles:[`
 .builder.simplified:not(.developer-mode){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}
 .builder.simplified:not(.developer-mode) .palette.desktop-palette{display:block;grid-column:1/-1;grid-row:1;order:unset;position:static}
 .builder.simplified:not(.developer-mode) .palette .palette-item{display:inline-flex;width:auto;min-width:0;flex:1 1 125px;margin:0}
 .builder.simplified:not(.developer-mode) .palette{display:flex;flex-wrap:wrap;gap:9px;align-items:center}
 .builder.simplified:not(.developer-mode) .palette>strong,.builder.simplified:not(.developer-mode) .palette>.builder-help{flex:0 0 100%;margin:0}
 .builder.simplified:not(.developer-mode) .canvas{grid-column:1;grid-row:2;order:unset}
 .builder.simplified:not(.developer-mode) .inspector{grid-column:2;grid-row:2;order:unset;position:static;transform:none;width:100%;max-height:none;overflow:visible;box-shadow:none}
 .builder.simplified:not(.developer-mode):not(:has(.inspector)) .canvas{grid-column:1}
 @media(max-width:760px){.builder.simplified:not(.developer-mode) .palette.desktop-palette{grid-template-columns:repeat(2,minmax(0,1fr))}.builder.simplified:not(.developer-mode){grid-template-columns:1fr}.builder.simplified:not(.developer-mode) .palette.desktop-palette{grid-column:1;grid-row:1;display:flex}.builder.simplified:not(.developer-mode) .canvas{grid-column:1;grid-row:2}.builder.simplified:not(.developer-mode) .inspector{grid-column:1;grid-row:3}}
 .builder.simplified:has(.canvas):has(.inspector){grid-template-columns:minmax(330px,1fr) minmax(320px,1fr)}
 .builder.simplified:not(.developer-mode){display:grid;grid-template-columns:minmax(0,1.3fr) minmax(240px,.7fr);gap:16px;align-items:start}
 .builder.simplified{display:flex;flex-direction:column;gap:16px}
 .builder.simplified.developer-mode{grid-template-columns:minmax(260px,.8fr) minmax(360px,1.2fr)}
 .builder.simplified.developer-mode .palette{grid-column:1;grid-row:1}
 .builder.simplified.developer-mode .inspector{grid-column:2;grid-row:1}

 .builder-stepper{display:flex;align-items:center;gap:14px;padding:16px 20px;border:1px solid #dce4ef;border-radius:12px;background:#f8fafc;width:100%;box-sizing:border-box}
 .builder-step{display:flex;align-items:center;gap:12px;color:#64748b;min-width:0;flex:1}
 .builder-step.active{color:#003399}
 .builder-step.completed{color:#206342}
 .builder-step .step-number{flex-shrink:0;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#e2e8f0;color:#334155;font-weight:700}
 .builder-step.active .step-number{background:#2455b5;color:#fff}
 .builder-step.completed .step-number{background:#d9efe0;color:#206342}
 .builder-step strong{display:block;font-size:15px}.builder-step small{display:block;font-size:12px;margin-top:3px}
 .step-connector{width:55px;height:2px;background:#cbd5e1;flex-shrink:0}
 .workflow-navigation{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;padding:16px 4px;border-top:1px solid #e2e8f0}
 .workflow-navigation button{border:1px solid #2455b5;border-radius:9px;padding:12px 18px;cursor:pointer;font-weight:700;font-size:14px}
 .workflow-next{background:#2455b5;color:#fff}.workflow-back{background:#fff;color:#2455b5}
 .builder.simplified .rules-canvas .builder-actions .canvas-add-top{background:#2455b5;color:white}
 @media(max-width:640px){.builder-stepper{padding:12px;gap:8px}.step-connector{width:15px}.builder-step{gap:6px}.builder-step strong{font-size:12px}.builder-step small{font-size:10px}.builder-step .step-number{width:28px;height:28px}.workflow-navigation button{width:100%}}
 .rules-canvas{min-height:320px}
 .rules-canvas label{display:grid;gap:6px;font-weight:600;margin:8px 0}
 .rules-canvas input,.rules-canvas select{padding:9px;border:1px solid #b8c9df;border-radius:7px;max-width:100%}
 .enum-editor{display:grid;gap:10px;margin:12px 0}.enum-table{width:100%;border-collapse:collapse}.enum-table th{text-align:left;color:#475569;font-size:13px}.enum-table td,.enum-table th{padding:7px;border-bottom:1px solid #e2e8f0}.enum-table input{width:100%;min-width:0}.enum-table button,.enum-add{border:1px solid #cbd8ea;border-radius:7px;background:white;padding:8px 12px;cursor:pointer;color:#2455b5}.enum-add{justify-self:start}
 .oneof-mode-choice{display:flex;flex-direction:column;text-align:left;gap:10px;padding:19px!important;background:#f6f8ff!important;border:1px solid #b9c9e7!important;color:#173d82!important;border-radius:12px!important;cursor:pointer}.oneof-mode-choice strong{font-size:17px}.oneof-mode-choice span{font-size:13px;color:#536580}.oneof-mode-choice:hover{border-color:#285ab8!important;background:#ebf1ff!important}
 .oneof-alternatives-strip{display:flex;flex-direction:column;gap:16px;padding:3px 2px 12px;align-items:stretch;overflow:visible}
 .oneof-alternative{width:100%;min-width:0;box-sizing:border-box}
 .oneof-alternative-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}
 .oneof-alternative-heading .oneof-remove-option{font-size:13px;color:#ad2435!important}
 .oneof-alternatives-actions{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:12px}
 .oneof-rule-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}
 .oneof-rule-column{min-width:0}.oneof-rule-column .oneof-add-control{display:flex;align-items:stretch;gap:8px;width:100%}
 .oneof-add-control select{flex:1;min-width:0;width:auto!important}
 .condition-card .oneof-add-icon{display:grid;place-items:center;flex:0 0 42px;width:42px;min-height:42px;padding:0!important;border:1px solid #b8c9df;border-radius:8px;background:#eaf1ff;color:#2455b5;font-size:23px;font-weight:700;line-height:1;cursor:pointer}
 .condition-card .oneof-add-icon:hover{background:#d8e6ff}
 .oneof-rule-list{min-height:100px}
 .oneof-rule-column select{width:100%}
 @media(max-width:700px){.oneof-rule-columns{grid-template-columns:1fr}}
 .oneof-rule-list{display:grid;gap:9px;margin:14px 0;padding:12px;border:1px solid;border-radius:10px}
 .oneof-required{background:#eff8f1;border-color:#b6dfc1}
 .oneof-forbidden{background:#fff3f2;border-color:#ebc2bf}
 .oneof-rule-heading{display:flex;align-items:center;gap:8px;font-size:14px}
 .oneof-required .oneof-rule-heading{color:#18623c}
 .oneof-forbidden .oneof-rule-heading{color:#a3242b}
 .oneof-rule-symbol{display:grid;place-items:center;width:23px;height:23px;border-radius:50%;font-size:17px;font-weight:800;background:#fff}
 .oneof-rule-count{margin-left:auto;font-size:12px;border-radius:20px;padding:2px 8px;background:#fff;border:1px solid currentColor}
 .oneof-rule-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 11px;background:#fff;border:1px solid #dce4ef;border-radius:8px}
 .oneof-required .oneof-rule-row{border-left:3px solid #27925d}
 .oneof-forbidden .oneof-rule-row{border-left:3px solid #d24b50}
 .oneof-rule-row span{font-weight:650;overflow-wrap:anywhere;color:#27364d}
 .oneof-rule-row button{color:#b42333!important;border-color:#e0d4d5!important}
 .logic-palette-title{display:none}
 .condition-add{border:2px solid #2455b5!important;background:#eaf1ff!important;color:#003399!important}
 .condition-card{border:1px solid #cbd8ed;border-radius:12px;padding:16px;margin:14px 0;background:#fff}
 .condition-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;color:#001f5b}
 .condition-if,.condition-branch{border-radius:10px;padding:14px;margin-top:10px;background:#f7f9fd;border:1px solid #dbe3ef}
 .condition-branch.true{border-left:3px solid #16804a}.condition-branch.false{border-left:3px solid #64748b}
 .condition-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
 .condition-grid label,.condition-branch-field label{display:grid;gap:5px;font-size:13px;color:#334155;font-weight:600}
 .condition-grid input,.condition-grid select,.condition-branch-field input,.condition-branch-field select{width:100%;box-sizing:border-box;border:1px solid #bcc9dc;padding:10px;border-radius:7px;background:#fff}
 .condition-branch-field{display:flex;align-items:center;gap:16px;margin:10px 0;padding:10px 0 14px;border-bottom:1px solid #dfe6f0}
 .condition-field-name{display:flex;align-items:baseline;gap:10px;flex:1;min-width:0;color:#334155}
 .condition-field-name span{font-size:13px;font-weight:600;color:#64748b}
 .condition-field-name strong{font-size:16px;font-weight:750;overflow-wrap:anywhere}
 .condition-branch-field .condition-delete-button{border:1px solid #d4ddeb!important;background:#fff!important;color:#a52332!important;border-radius:8px!important;min-width:104px;height:36px;padding:0 12px!important;font-size:13px;font-weight:600}
 .condition-branch-field .condition-delete-button:hover{background:#fff0ef!important;border-color:#e7b5b5!important}
 .condition-branch-field .condition-required{display:flex;align-items:center;gap:5px;white-space:nowrap}
 .condition-branch-field .condition-required input{width:auto}
 .condition-card button{border:1px solid #b8c9df;border-radius:7px;background:#fff;color:#2455b5;padding:9px;cursor:pointer}
 .condition-card .condition-add-field{margin-top:10px;background:#ecf2ff}
 .condition-branches{display:grid;grid-template-columns:1fr 1fr;gap:12px}
 @media(max-width:950px){.condition-branches,.condition-grid{grid-template-columns:1fr}} @media(max-width:550px){.condition-branch-field{flex-wrap:wrap}.condition-field-name{flex-basis:100%}.condition-branch-field .condition-delete-button{margin-left:auto}}

 .builder.simplified .palette{order:2;position:static;width:100%;box-sizing:border-box}
 .builder.simplified:not(.developer-mode) .palette{grid-column:2;grid-row:1}
 .builder.simplified .canvas{order:1;min-height:0;width:100%;box-sizing:border-box}
 .builder.simplified:not(.developer-mode) .canvas{grid-column:1;grid-row:1}
 .builder.simplified .inspector{order:3;position:static;max-height:none;width:100%;box-sizing:border-box}
 @media(min-width:761px){.builder.simplified:not(.developer-mode) .palette.desktop-palette{display:block}}
 @media(max-width:760px){.builder.simplified.developer-mode{grid-template-columns:1fr}.builder.simplified.developer-mode .palette,.builder.simplified.developer-mode .inspector{grid-column:1;grid-row:auto}.builder.simplified{grid-template-columns:1fr}.builder.simplified .palette,.builder.simplified .canvas,.builder.simplified .inspector{grid-column:1;grid-row:auto}.builder.simplified .palette.desktop-palette{display:none}.builder.simplified .canvas-header{position:sticky;top:0;z-index:8;padding:8px;background:#fbfcff;border-bottom:1px solid #e3e9f2}.builder.simplified .canvas-header>.builder-actions{justify-content:flex-end}.builder.simplified .canvas-header .builder-help{display:none}.builder.simplified .canvas-add-top{white-space:nowrap}.builder.simplified .mobile-palette{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:0 0 12px;padding:10px;border:1px solid #d9dfe9;border-radius:10px;background:#fff}.builder.simplified .mobile-palette .palette-item{margin:0;min-width:0;padding:9px 7px;font-size:13px}}
 .builder{display:grid;grid-template-columns:minmax(180px,.72fr) minmax(300px,1.4fr) minmax(280px,1.12fr);gap:16px;align-items:start}
 .palette,.canvas{border:1px solid #d9dfe9;border-radius:12px;padding:18px;background:#fff;min-width:0}
 .palette{position:sticky;top:12px}
 .palette-item{display:flex;align-items:center;gap:9px;width:100%;text-align:left;background:#f7f9fd;color:#17315c;border:1px solid #e0e7f3;border-radius:9px;padding:11px;margin:7px 0;cursor:pointer;font-weight:600}
 .palette-item:hover{background:#e8efff;border-color:#7fa5e9}
 .canvas{min-height:420px;background:#fbfcff}
 .canvas-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
 .mobile-palette{display:none}
 .canvas-header p{font-size:12px;color:#586477;margin:5px 0}
 .canvas-fields{display:flex;flex-direction:column;gap:10px}
 .canvas-field{display:block;width:100%;padding:14px 16px;border:1px solid #dce4ef;background:#fff;color:#26354d;border-radius:10px;text-align:left;cursor:pointer;box-shadow:0 2px 5px rgba(20,40,80,.035)}
 .canvas-field:hover{border-color:#88a9e7;background:#f8faff}
 .canvas-field.active{border:2px solid #2455b5;background:#f0f5ff;padding:13px 15px}
 .canvas-field-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:700}
 .canvas-field-meta{display:block;margin-top:5px;font-size:12px;color:#68778f}
 .canvas-field-placeholder{display:block;margin-top:10px;padding:9px 12px;border:1px solid #dce4ef;border-radius:7px;background:#f8fafc;color:#8793a6;font-size:13px}
 .canvas-empty{border:2px dashed #c7d5e9;border-radius:12px;padding:32px 15px;text-align:center;color:#65758d}
 .canvas-add{margin-top:14px;width:100%;border:1px dashed #7d9ed8;background:#f4f8ff;color:#17448c;border-radius:9px;padding:12px;cursor:pointer}
 .structure-toggle{margin:12px 0 0;background:transparent;color:#2455b5;border:0;cursor:pointer;text-align:left;padding:6px}
 .structure-panel{margin-top:10px;border-top:1px solid #e3e9f2;padding-top:12px}
 .inspector{max-height:calc(100vh - 110px);overflow-y:auto;position:sticky;top:12px}
 .modal-backdrop{position:fixed;inset:0;background:rgba(10,24,48,.58);z-index:99}
 .builder.simplified .inspector.field-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(680px,calc(100vw - 32px));max-height:calc(100vh - 40px);overflow-y:auto;z-index:100;box-shadow:0 24px 80px rgba(10,24,48,.25);box-sizing:border-box;grid-column:auto;grid-row:auto}
 @media(max-width:1100px){.builder{grid-template-columns:minmax(170px,.65fr) minmax(260px,1fr)}.inspector{grid-column:1/-1;position:static;max-height:none}}
 @media(max-width:760px){.builder{grid-template-columns:1fr}.palette{position:static}.inspector{grid-column:auto}}
 .tree,.inspector{border:1px solid #d9dfe9;border-radius:10px;padding:18px;min-width:0;background:#fff}
 .tree{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:4px;align-self:start}
 .tree>strong{margin-bottom:4px}
 .tree>.builder-help{margin:0 0 12px;line-height:1.5}
 .inspector{align-self:start}
 .tree-row{display:flex;flex:0 0 auto;align-items:center;justify-content:flex-start;gap:8px;width:100%;min-height:38px;height:auto;margin:0;text-align:left;border:0;background:transparent;color:#26354d;padding:9px;border-radius:6px;cursor:pointer;font:inherit;line-height:1.3;box-shadow:none}
 .tree-row span,.tree-row small{color:inherit}
 .tree-row small{font-size:12px;opacity:.75}
 .tree-row:focus-visible{outline:2px solid #1455c0;outline-offset:2px}
 .tree-row.selected{background:#e8efff;color:#003399;font-weight:700}
 .tree-row:hover{background:#f2f5fa;color:#003399}
 .inspector label{display:grid;gap:5px;margin-bottom:12px;font-weight:600}
 .inspector input,.inspector select{width:100%;box-sizing:border-box;padding:9px;border:1px solid #b8c4d4;border-radius:6px;background:white}
 .builder-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
 .canvas-add-top{border:1px solid #2455b5;background:#2455b5;color:#fff;border-radius:8px;padding:8px 11px;cursor:pointer;font-weight:600}
 .builder-actions button{padding:8px 12px;cursor:pointer}
 .inspector>strong{display:block;margin-bottom:12px}
 .inspector label{line-height:1.4}
 .inspector .builder-actions{margin:0 0 14px}
 .inspector .builder-actions button{border-radius:7px}
 .inspector input:focus-visible,.inspector select:focus-visible,.inspector textarea:focus-visible{outline:2px solid #1455c0;outline-offset:1px}
 .builder-help{font-size:12px;color:#586477}
 .builder-error{color:#b42318}
 .composition-actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}
 .composition-actions input{flex:1 1 180px;min-width:0}
 .composition-row{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid #edf0f5}
 .composition-row button{cursor:pointer}
 .rule-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .rule-grid label{min-width:0}
 .rule-heading{margin:20px 0 12px;border-top:1px solid #e0e5ef;padding-top:14px}
 .inspector textarea{width:100%;box-sizing:border-box;min-height:84px;border:1px solid #b8c4d4;border-radius:6px;padding:9px}
 .inspector .checkline{display:flex;align-items:center;gap:8px;font-weight:500}
 .inspector .checkline input{width:auto}
 @media(max-width:760px){.builder{grid-template-columns:1fr}.tree,.inspector{padding:14px}.rule-grid{grid-template-columns:1fr}}

 .editor-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 18px;border-bottom:1px solid #dce4ef;padding-bottom:10px}
 .editor-tabs button{border:1px solid #dce4ef;border-radius:8px;padding:11px 8px;background:#f7f9fd;color:#40536d;cursor:pointer;font-weight:600}
 .editor-tabs button.active{background:#eaf1ff;border-color:#86a9e6;color:#16468e}
 .canvas-close{border:0;background:transparent;color:#64748b;font-size:24px;line-height:1;padding:3px 8px;border-radius:6px;cursor:pointer}
 .canvas-close:hover,.canvas-close:focus-visible{background:#eaf1ff;color:#17448c}
 .inspector-disabled{background:#f8fafc!important;border-color:#e2e8f0!important}
 .inspector-disabled .editor-heading{opacity:.55}
 .editor-empty{color:#8090a5;font-size:14px;line-height:1.6;padding:24px 6px;text-align:center}
 .field-editor-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
 .field-editor-heading .editor-field-type{margin:0 0 0 auto;justify-content:flex-end}
 .editor-field-type{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0 16px;font-size:13px;color:#64748b}
 .editor-field-type strong{padding:4px 9px;border-radius:7px;background:#eef2f8;color:#40516a;font-size:12px}
 .editor-field-type small{flex-basis:100%;color:#94a3b8;font-size:11px}

 .canvas-field-card{position:relative;border:1px solid #d6e1ee;border-radius:12px;background:#fff;overflow:hidden}
 .canvas-field-card.active{border:2px solid #2455b5;background:#eff4ff}
 .canvas-field-card .canvas-field{display:block;width:100%;border:0!important;border-radius:0!important;background:transparent!important;text-align:left;padding-right:50px;box-shadow:none!important}
 .canvas-field-card .canvas-field.active{border:0!important}
 .canvas-field-card .canvas-field-delete{position:absolute;right:12px;top:12px;display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:0;border-radius:7px;background:transparent;color:#94a3b8;font-size:22px;cursor:pointer}
 .canvas-field-card .canvas-field-delete:hover,.canvas-field-card .canvas-field-delete:focus-visible{background:#fff0ef;color:#b42318}

 .canvas-field-card .canvas-field{padding-right:16px}
 .canvas-field-card .canvas-field-footer{display:flex;justify-content:flex-end;padding:0 14px 12px}
 .canvas-field-card .canvas-field-delete{position:static;display:inline-flex;align-items:center;justify-content:center;width:auto;height:auto;padding:5px 7px;border:0;border-radius:6px;background:transparent;color:#b42318;font-size:13px;font-weight:500;cursor:pointer}
 .canvas-field-card .canvas-field-delete:hover,.canvas-field-card .canvas-field-delete:focus-visible{background:#fff0ef;color:#912018}

 .editor-type-required{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:14px 0}
 .editor-type-required .editor-field-type{margin:0;flex:1 1 auto}
 .field-options-card{display:flex;flex-direction:column;gap:13px;border:1px solid #dce4ef;border-radius:12px;background:#f8fbff;padding:15px;margin:12px 0}
 .field-options-title{font-size:13px;color:#243b59;margin-bottom:2px}
 .field-options-card .required-switch-label{display:flex!important;justify-content:space-between;width:100%}
 .required-switch-label{display:inline-flex!important;align-items:center;gap:9px;margin:0!important;white-space:nowrap;cursor:pointer;font-size:13px;color:#40516a}
 .required-switch-input{position:absolute;opacity:0;width:1px;height:1px}
 .required-switch-track{position:relative;display:inline-block;width:38px;height:22px;border-radius:999px;background:#cbd5e1;transition:background .15s}
 .required-switch-track:after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0002;transition:transform .15s}
 .required-switch-input:checked+.required-switch-track{background:#2455b5}
 .required-switch-input:checked+.required-switch-track:after{transform:translateX(16px)}
 .required-switch-input:focus-visible+.required-switch-track{outline:3px solid #93c5fd;outline-offset:2px}
 .validation-switch{display:flex!important;justify-content:space-between;width:100%;margin:14px 0!important}
 .schema-group{border:1px solid #cbd8ea;border-radius:12px;padding:12px;background:#f8fbff;margin-bottom:12px}.schema-group.active{border-color:#2455b5}.schema-group-header{display:flex;align-items:center;gap:8px}.schema-group-select{flex:1;display:flex;justify-content:space-between;align-items:center;border:0;background:transparent;color:#243b59;text-align:left;padding:8px;cursor:pointer;font-weight:650}.schema-group-select small{color:#64748b;font-weight:400}.schema-group-toggle{border:0;background:transparent;color:#243b59;font-size:20px;cursor:pointer;padding:5px 12px}.schema-group-fields{display:grid;gap:10px;padding:10px 4px 2px 18px}.schema-group-add{border:1px dashed #94a3b8;border-radius:8px;padding:10px;background:white;color:#2455b5;cursor:pointer;text-align:left}.schema-group .canvas-field-card{background:white}
 .inline-object{margin:8px 12px 12px;padding:12px;border:1px solid #dce4ef;border-radius:10px;background:#f8fbff}
 .inline-object-heading{display:flex;justify-content:space-between;gap:10px;margin-bottom:9px;font-size:13px}
 .inline-object-heading span{color:#64748b}
 .builder.simplified:not(.developer-mode) .schema-group-fields{display:block;padding:4px 8px 0}
 .builder.simplified:not(.developer-mode) .group-field-row{border-bottom:1px solid #dfe6f0;padding:6px 0}
 .builder.simplified:not(.developer-mode) .group-field-row:last-of-type{border-bottom:0}
 .group-field-main{display:flex;align-items:center;gap:10px;min-height:46px}
 .group-field-select{display:flex;align-items:center;justify-content:space-between;gap:12px;flex:1;min-width:0;border:0;background:transparent;color:#243b59;text-align:left;cursor:pointer;padding:8px 4px}
 .group-field-select small{font-size:12px;color:#475569}
 .group-field-main .field-card-tools{padding:0;flex-shrink:0}
 .group-nested-object{margin:4px 0 8px}
 /* Keep grouped fields visually consistent with object attribute rows. */
 .builder.simplified .group-field-select,
 .builder.simplified .group-field-select:hover,
 .builder.simplified .group-field-select:focus,
 .builder.simplified .group-field-select:active{background:transparent!important;color:#243b59!important;border:0!important;box-shadow:none!important;outline-offset:2px}
 .builder.simplified .group-field-row:hover{background:#edf4ff}
 .builder.simplified .group-field-main .field-card-tools button[aria-label^="Subir"],
 .builder.simplified .group-field-main .field-card-tools button[aria-label^="Descer"],
 .builder.simplified .inline-object-child .field-card-tools button[aria-label^="Subir"],
 .builder.simplified .inline-object-child .field-card-tools button[aria-label^="Descer"]{min-width:36px!important;width:36px!important;height:36px!important;padding:0!important}
 .builder.simplified .group-field-main .field-card-tools button:disabled,
 .builder.simplified .inline-object-child .field-card-tools button:disabled{opacity:.35;cursor:not-allowed}
 .object-heading-select{flex:1;min-width:0;text-align:left;border:0!important;background:transparent!important;color:#243b59!important;cursor:pointer;padding:4px 0}
 .object-toggle{border:0!important;background:transparent!important;color:#243b59!important;font-size:20px;cursor:pointer;padding:3px 10px}
 .builder.simplified .inline-object-heading{display:flex;align-items:center;gap:12px;min-height:38px;margin-bottom:0}
 .builder.simplified .object-contents{padding-top:8px}
 .builder.simplified .inline-object{padding:10px 12px}


 .builder.simplified:not(.developer-mode) .schema-group{padding:10px 12px;margin-bottom:10px}
 .builder.simplified:not(.developer-mode) .schema-group-header{min-height:44px;gap:10px}
 .builder.simplified:not(.developer-mode) .schema-group-select{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;flex:1;padding:6px 8px!important}
 .builder.simplified:not(.developer-mode) .schema-group-select span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .builder.simplified:not(.developer-mode) .schema-group-select small{white-space:nowrap}
 .builder.simplified:not(.developer-mode) .schema-group-fields{padding:6px 4px 2px 8px;gap:8px}
 .builder.simplified:not(.developer-mode) .schema-group .canvas-field-card{margin:0}
 .builder.simplified:not(.developer-mode) .schema-group .inline-object-actions{margin-top:8px}
 .inline-object-child{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #e3e9f2}
 .inline-object-child button:first-child{display:flex;justify-content:space-between;gap:12px;flex:1;border:0;background:transparent;text-align:left;cursor:pointer;color:#243b59}
 .inline-object-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
 .inline-object-actions button{padding:7px 9px;border:1px solid #cbd8ea;border-radius:7px;background:white;color:#2455b5;cursor:pointer}
 .form-settings-button{margin-top:8px;padding:7px 10px;border:1px solid #cbd8ea;border-radius:8px;background:#fff;color:#2455b5;cursor:pointer;font-size:12px}
 .visual-group-list{display:grid;gap:8px;grid-column:1/-1}.visual-group-choice{display:flex;justify-content:space-between;align-items:center;text-align:left;border:1px solid #cbd8ea;border-radius:10px;background:#f8fbff;padding:12px;cursor:pointer}.visual-group-choice.active{border-color:#2455b5;background:#edf4ff}.visual-group-inspector{display:grid;gap:12px}.visual-group-members{display:flex;justify-content:space-between;gap:8px}.visual-group-members button,.visual-group-actions button{cursor:pointer;border:1px solid #cbd8ea;background:white;border-radius:8px;padding:8px}.visual-group-actions{display:flex;justify-content:space-between;gap:8px}
 .visual-groups{grid-column:1/-1;display:grid;gap:12px;margin-bottom:12px}
 .visual-group-card{border:1px solid #cbd8ea;border-radius:12px;padding:16px;background:#f8fbff}
 .visual-group-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
 .visual-group-heading button{border:0;background:transparent;color:#b42318;cursor:pointer;font-size:13px}
 .visual-group-members{padding:5px 0}
 .visual-group-members .required-switch-label{display:flex!important;justify-content:space-between}
 .validation-help{font-size:12px;line-height:1.5;color:#718096;margin:0 0 14px}
 /* Construction layout: component palette full width, fields and editor in equal columns. */
 .builder.simplified:not(.developer-mode){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}
 .builder.simplified:not(.developer-mode) .palette.desktop-palette{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;grid-column:1/-1;grid-row:1;order:unset;position:static}
 .builder.simplified:not(.developer-mode) .palette.desktop-palette>strong,.builder.simplified:not(.developer-mode) .palette.desktop-palette>.builder-help{grid-column:1/-1;margin:0}
 .builder.simplified:not(.developer-mode) .palette.desktop-palette .palette-item{width:100%;margin:0;box-sizing:border-box}
 .builder.simplified:not(.developer-mode) .canvas{grid-column:1;grid-row:2;order:unset}
 .builder.simplified:not(.developer-mode) .inspector{grid-column:2;grid-row:2;order:unset;position:static;transform:none;width:100%;max-height:none;overflow:visible;box-shadow:none}
 .builder.simplified:not(.developer-mode):not(:has(.inspector)) .canvas{grid-column:1/-1}
 @media(max-width:760px){.builder.simplified:not(.developer-mode){grid-template-columns:1fr}.builder.simplified:not(.developer-mode) .palette.desktop-palette{grid-column:1;grid-row:1;display:flex}.builder.simplified:not(.developer-mode) .canvas{grid-column:1;grid-row:2}.builder.simplified:not(.developer-mode) .inspector{grid-column:1;grid-row:3}}

 .builder.simplified:not(.developer-mode) .editor-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
 .builder.simplified:not(.developer-mode) .editor-heading strong{font-size:18px}
 .builder.simplified:not(.developer-mode) .editor-close{background:transparent;border:0;color:#63738b;font-size:26px;line-height:1;padding:4px 8px;cursor:pointer;border-radius:6px}
 .builder.simplified:not(.developer-mode) .editor-close:hover{background:#f1f4f9}
 .builder.simplified:not(.developer-mode) .editor-tabs{display:flex;gap:18px;padding:0;border:0;border-bottom:1px solid #dce4ef;margin:0 0 18px}
 .builder.simplified:not(.developer-mode) .editor-tabs button{background:transparent;border:0;border-bottom:2px solid transparent;border-radius:0;padding:11px 3px;font-size:14px;font-weight:500;color:#64748b;cursor:pointer}
 .builder.simplified:not(.developer-mode) .editor-tabs button.active{background:transparent;border-bottom-color:#2455b5;color:#17448c;font-weight:700}
 .builder.simplified:not(.developer-mode) .inspector{padding:20px}
 .builder.simplified:not(.developer-mode) .inspector label{font-size:13px}
 .builder.simplified:not(.developer-mode) .editor-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px solid #e5eaf2;padding-top:14px;margin-top:22px}
 .builder.simplified:not(.developer-mode) .editor-footer span{font-size:12px;color:#718096}
 .builder.simplified:not(.developer-mode) .editor-delete{background:transparent;border:0;padding:5px;color:#b42318;font-size:13px;cursor:pointer}

 .confirm-overlay{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.52)}
 .confirm-dialog{width:min(420px,100%);box-sizing:border-box;border:1px solid #dce4ef;border-radius:16px;padding:28px;background:#fff;box-shadow:0 24px 75px rgba(15,23,42,.22);text-align:left}
 .confirm-icon{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:#fff1f0;color:#b42318;font-size:22px;font-weight:700;margin-bottom:16px}
 .confirm-dialog h3{font-size:20px;margin:0 0 10px;color:#1f2937}
 .confirm-dialog p{font-size:14px;line-height:1.6;color:#5b6678;margin:0 0 24px}
 .confirm-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
 .confirm-actions button{border-radius:9px;padding:10px 16px;cursor:pointer;font-size:14px;font-weight:600}
 .confirm-cancel{border:1px solid #d6deeb;background:#fff;color:#40516a}
 .confirm-danger{border:1px solid #b42318;background:#b42318;color:#fff}
 .confirm-cancel:hover{background:#f5f7fb}
 .confirm-danger:hover{background:#912018}

 .builder.simplified .schema-group .schema-group-add,.builder.simplified .visual-group-inspector .visual-group-add-button{appearance:none!important;background:#f8fbff!important;color:#2455b5!important;border:1px dashed #a5b9d5!important;border-radius:9px!important;box-shadow:none!important;font-weight:600!important;font-size:14px!important;line-height:1.35!important;padding:12px 14px!important;text-align:left!important;min-height:44px!important;width:100%!important;cursor:pointer!important}
 .builder.simplified .schema-group .schema-group-add:hover,.builder.simplified .visual-group-inspector .visual-group-add-button:hover{background:#edf4ff!important;border-color:#2455b5!important}
 .builder.simplified .visual-group-inspector .visual-group-actions{display:flex!important;align-items:center;gap:12px;flex-wrap:wrap}
 .builder.simplified .visual-group-inspector .visual-group-add-button{flex:1 1 230px;width:auto!important}
 .builder.simplified .visual-group-inspector .visual-group-delete-button{appearance:none!important;background:transparent!important;color:#b42318!important;border:1px solid #e4c6c6!important;border-radius:9px!important;box-shadow:none!important;padding:12px 14px!important;font-weight:600!important;min-height:44px!important;cursor:pointer!important}
 .builder.simplified .visual-group-inspector .visual-group-delete-button:hover{background:#fff3f2!important}

 .builder.simplified .schema-group .schema-group-select{appearance:none!important;background:transparent!important;color:#243b59!important;border:0!important;box-shadow:none!important;border-radius:8px!important;min-height:44px!important;padding:8px 10px!important;text-align:left!important;font-weight:650!important}
 .builder.simplified .schema-group .schema-group-select small{color:#64748b!important}
 .builder.simplified .schema-group .schema-group-select:hover{background:#eaf1fb!important}
 /* Group header follows the same name/type/description hierarchy as object cards. */
 .builder.simplified .schema-group .schema-group-header{display:flex;align-items:flex-start;gap:10px}
 .builder.simplified .schema-group .schema-group-select{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px;min-height:68px!important;padding:8px 10px!important}
 .builder.simplified .schema-group .group-heading-copy{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:6px;min-width:0;white-space:normal!important}
 .builder.simplified .schema-group .group-heading-copy strong{font-size:16px;color:#243b59}
 .builder.simplified .schema-group .group-heading-description{font-size:13px;font-weight:400;color:#68778f;white-space:normal!important}
 .builder.simplified .schema-group .group-heading-type{flex-shrink:0;color:#243b59;font-weight:700;font-size:13px}
 .builder.simplified .schema-group .group-inner-panel{margin-top:16px;padding:12px 14px;border:1px solid #dce4ef;border-radius:10px;background:#f8fbff}
 .builder.simplified .canvas-field-card:has(> .inline-object){padding:12px;background:#f8fbff;border-color:#cbd8ea;overflow:visible}
 .builder.simplified .canvas-field-card:has(> .inline-object).active{border-color:#2455b5}
 .builder.simplified .canvas-field-card:has(> .inline-object) > .canvas-field{padding:8px 10px 12px!important;min-height:68px}
 .builder.simplified .canvas-field-card:has(> .inline-object) > .inline-object{margin:16px 0 0;padding:12px 14px;background:#f8fbff}
 .builder.simplified .canvas-field-card:has(> .inline-object) > .field-card-tools{display:flex;justify-content:flex-end;gap:8px;margin-top:12px;padding:6px 4px}
 .builder.simplified .canvas-field-card:has(> .inline-object) > .canvas-field .canvas-field-meta:last-child{display:none}
 .builder.simplified .canvas-field-card.schema-group{margin-bottom:12px}
 .builder.simplified .canvas-field-card.schema-group.active{border:1px solid #2455b5;background:#f8fbff}
 .builder.simplified .canvas-field-card.schema-group:not(.active){border:1px solid #cbd8ea;background:#f8fbff}
 .builder.simplified .canvas-field-card.schema-group > .group-inner-panel{background:#f8fbff}

 .builder.simplified .canvas-field-card.schema-group > .schema-group-header{display:flex;align-items:flex-start;gap:10px}
 .builder.simplified .canvas-field-card.schema-group > .schema-group-header .schema-group-select{display:flex!important;flex:1;min-width:0;align-items:flex-start!important;justify-content:flex-start!important;padding:8px 10px!important;min-height:68px!important}
 .builder.simplified .canvas-field-card.schema-group > .schema-group-header .group-heading-copy{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0;white-space:normal}
 .builder.simplified .canvas-field-card.schema-group > .schema-group-header .group-heading-description{font-size:13px;font-weight:400;color:#68778f;white-space:normal}
 .builder.simplified .canvas-field-card.schema-group > .schema-group-header .group-heading-type{padding:8px 10px}

 .builder.simplified .canvas-field-card.schema-group > .canvas-field{display:block!important;width:100%;border:0!important;background:transparent!important;box-shadow:none!important}
 .builder.simplified .canvas-field-card.schema-group > .group-inner-panel{margin:16px 0 0!important;padding:12px 14px!important;border:1px solid #dce4ef!important;border-radius:10px!important;background:#f8fbff!important}
 .builder.simplified .canvas-field-card.schema-group > .group-inner-panel .inline-object-heading{display:flex;align-items:center;gap:12px}
 .builder.simplified .canvas-field-card.schema-group > .group-inner-panel .inline-object-heading .object-heading-select{flex:1;text-align:left}
 .builder.simplified .canvas-field-card.schema-group > .field-card-tools{display:flex;justify-content:flex-end;gap:8px;margin-top:12px;padding:6px 4px}


 .builder.simplified .schema-group .group-inner-panel .inline-object-heading{display:flex;align-items:center;gap:12px}
 .builder.simplified .schema-group .group-inner-panel .inline-object-heading,
 .builder.simplified .canvas-field-card.schema-group > .group-inner-panel .inline-object-heading{justify-content:flex-end}

 .builder.simplified .schema-group .group-inner-panel .inline-object-heading .object-heading-select{flex:1;text-align:left}
 .builder.simplified .schema-group .group-inner-panel .schema-group-fields{padding:12px 0 0}

 .builder.simplified .schema-group .group-heading-controls{display:flex;align-items:center;gap:8px;flex-shrink:0;min-height:44px}
 .builder.simplified .schema-group .group-heading-controls .schema-group-toggle{display:inline-flex;align-items:center;justify-content:center;width:32px;height:36px;padding:0!important;line-height:1}
 .builder.simplified .schema-group .schema-group-select{justify-content:flex-start!important;flex:1;min-width:0}

 .builder.simplified .schema-group .group-footer-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px;padding:6px 4px}
 .builder.simplified .schema-group .group-footer-actions button[aria-label^="Subir"],
 .builder.simplified .schema-group .group-footer-actions button[aria-label^="Descer"]{min-width:36px!important;width:36px!important;height:36px!important;padding:0!important;background:#fff!important;color:#24446c!important;border:1px solid #d4ddeb!important}
 .builder.simplified .schema-group .group-footer-actions button:disabled{opacity:.35;cursor:not-allowed}

 .builder.simplified .schema-group .schema-group-select:hover{background:transparent!important}
 .builder.simplified .schema-group .order-actions button{background:#fff!important;color:#24446c!important;border:1px solid #d4ddeb!important;border-radius:8px!important;min-width:36px!important;height:36px!important;cursor:pointer}
 .builder.simplified .schema-group .order-actions button:hover:not(:disabled){background:#edf4ff!important}
 .builder.simplified .schema-group .order-actions button:disabled{opacity:.35;cursor:not-allowed}

 .builder.simplified .schema-group .schema-group-toggle{appearance:none!important;background:transparent!important;color:#243b59!important;border:0!important;box-shadow:none!important}
 .group-add-picker{grid-column:1/-1;border:1px solid #cbd8ea;border-radius:12px;padding:16px;background:#fff;margin:0 0 14px}
 .group-add-picker-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
 .group-add-picker-header button{background:transparent!important;color:#64748b!important;border:0!important;cursor:pointer}
 .group-add-picker-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:8px}
 .builder.simplified .group-add-picker-options button{display:flex;justify-content:space-between;gap:8px;align-items:center;background:#f8fbff!important;color:#243b59!important;border:1px solid #dce4ef!important;border-radius:8px!important;padding:12px!important;cursor:pointer!important;box-shadow:none!important;font-weight:600!important}
 .builder.simplified .group-add-picker-options button:hover{background:#edf4ff!important;border-color:#2455b5!important}

 .schema-drop-root{border:1px dashed #a5b9d5;border-radius:9px;padding:12px;text-align:center;color:#64748b;background:#f8fbff;font-size:13px;margin-top:12px}
 .schema-group[draggable],.canvas-field-card[draggable]{cursor:grab}
 .schema-group[draggable]:active,.canvas-field-card[draggable]:active{cursor:grabbing}
 .schema-group-fields{min-height:36px}
 
 .builder.simplified:not(.developer-mode){display:flex!important;flex-direction:column!important;gap:16px!important}
 .builder.simplified:not(.developer-mode) .palette,.builder.simplified:not(.developer-mode) .canvas{width:100%!important;grid-column:1/-1!important;grid-row:auto!important}
 .editor-modal-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(15,23,42,.6)}
 .builder.simplified:not(.developer-mode) .editor-modal-shell{position:fixed;z-index:1001;left:50%;top:4vh;transform:translateX(-50%);width:min(800px,94vw);max-height:92vh;overflow-y:auto;background:white;border-radius:16px;box-shadow:0 24px 75px rgba(0,0,0,.3);padding:22px;box-sizing:border-box}
 .builder.simplified:not(.developer-mode) .editor-modal-shell .inspector{position:static!important;transform:none!important;width:100%!important;max-height:none!important;overflow:visible!important;box-shadow:none!important;grid-column:auto!important;grid-row:auto!important}
 .editor-modal-actions{display:flex;justify-content:flex-end;gap:10px;position:sticky;bottom:0;background:white;padding:14px 0;border-top:1px solid #d9dfe9}
 .field-card-tools{display:flex;justify-content:flex-end;gap:8px;padding:6px 12px}
 .field-card-tools button{border:1px solid #d4ddeb;background:#fff;border-radius:8px;padding:7px 11px;cursor:pointer}
 .order-actions{display:inline-flex;gap:6px;margin-left:auto}
 .order-actions button,.field-card-tools button[aria-label^="Subir"],.field-card-tools button[aria-label^="Descer"]{min-width:36px;width:36px;padding:0;font-size:19px}
 .order-actions button:disabled,.field-card-tools button:disabled{opacity:.35;cursor:not-allowed}
 .field-card-tools button:last-child{color:#a52332}
 .field-card-tools button{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;line-height:1}
 .field-card-tools button{width:auto;min-width:104px;height:36px;padding:0 12px;gap:7px;font-size:13px;font-weight:600;color:#24446c}
 .field-card-tools .action-icon{font-size:18px;line-height:1;font-weight:700}
 .field-card-tools button:last-child{color:#a52332}
`],
 template:`
 <div class="builder simplified">
  <div class="builder-stepper" *ngIf="mode==='construction'" aria-label="Etapas do builder">
    <div class="builder-step" [class.active]="builderStep==='components'" [class.completed]="builderStep==='rules'"><span class="step-number">1</span><span><strong>Componentes</strong><small>Estrutura e campos</small></span></div>
    <span class="step-connector" aria-hidden="true"></span>
    <div class="builder-step" [class.active]="builderStep==='rules'"><span class="step-number">2</span><span><strong>Regras e condições</strong><small>Comportamento e validação</small></span></div>
   </div>
  <aside class="palette" [class.desktop-palette]="mode==='construction'" *ngIf="mode==='dev' || (mode==='construction' && builderStep==='components')">
   <strong>{{mode==='dev'?'Estrutura técnica':'Adicionar componentes'}}</strong>
   <p class="builder-help">Escolha um tipo para adicionar ao formulário ou ao objeto selecionado.</p>
   <button type="button" class="palette-item" *ngFor="let item of palette" (click)="addTypedProperty(item.type)" [class.condition-add]="item.type==='condition'"><span>{{item.icon}}</span> {{item.label}} <span style="margin-left:auto">+</span></button>
   <p class="builder-help logic-palette-title">A condição cria os ramos SE / ENTÃO / SENÃO.</p>
   <button type="button" class="structure-toggle" *ngIf="mode==='dev'" (click)="showStructure=!showStructure">{{showStructure?'▾ Ocultar':'▸ Mostrar'}} estrutura completa</button>
   <div class="structure-panel tree" *ngIf="mode==='dev' && showStructure">
   <strong>Estrutura do schema</strong>
   <p class="builder-help">Selecione qualquer nó, inclusive definições e regras.</p>
   <button *ngFor="let row of rows" type="button" class="tree-row" [class.selected]="selectedPath===row.path" [style.padding-left.px]="9+row.depth*12" (click)="select(row.path)">
    <span>{{row.depth ? '↳' : '▣'}}</span><span>{{row.label}}</span><small>({{typeLabel(row.schema)}})</small>
   </button>
   </div>
  </aside>
  <section class="canvas" *ngIf="mode==='construction' && builderStep==='components'">
   <div class="canvas-header">
    <div><strong>{{canvasHeaderTitle}}</strong><p>{{canvasHeaderDescription}}</p><button type="button" *ngIf="!activeContainerPath" class="form-settings-button" (click)="openFormEditor()">✎ Configurar formulário</button></div>
    <div class="builder-actions" style="margin:0">
     <button type="button" *ngIf="activeContainerPath" (click)="goToParentContainer()">← Voltar</button>

     <button type="button" *ngIf="selected && selected.type==='array' && arrayItemType(selected)==='object'" (click)="openArrayItems()">Abrir lista de objetos</button>

     <span class="builder-help">{{canvasFields.length}} campos</span>
     
    </div>
   </div>
   <div class="mobile-palette" *ngIf="false">
    <button type="button" class="palette-item" *ngFor="let item of palette" (click)="addTypedProperty(item.type)" [class.condition-add]="item.type==='condition'"><span>{{item.icon}}</span> {{item.label}} <span style="margin-left:auto">+</span></button>
   </div>
   <div class="canvas-fields">
<div class="canvas-field-card" [class.schema-group]="isObjectSchema(field.schema)" *ngFor="let field of ungroupedCanvasFields" [style.order]="canvasPosition('field:'+propertyKey(field.path))" [class.active]="selectedPath===field.path">
 <div class="schema-group-header" *ngIf="isObjectSchema(field.schema); else regularFieldHeader">
   <button type="button" class="schema-group-select" (click)="openFieldEditor(field.path)"><span class="group-heading-copy"><strong>{{field.schema.title||field.label}} <span *ngIf="field.required">*</span></strong><span class="group-heading-description">{{field.schema.description||''}}</span></span></button>
   <div class="group-heading-controls"><span class="group-heading-type">object</span><button type="button" class="schema-group-toggle" (click)="toggleObjectExpanded(field.path)" [attr.aria-expanded]="!collapsedObjects.has(field.path)" [attr.aria-label]="collapsedObjects.has(field.path)?'Mostrar atributos':'Ocultar atributos'">{{collapsedObjects.has(field.path)?'▸':'▾'}}</button></div>
 </div>
 <ng-template #regularFieldHeader>
   <button type="button" class="canvas-field" (click)="openFieldEditor(field.path)">
     <span class="canvas-field-title"><span>{{field.schema.title||field.label}} <span *ngIf="field.required">*</span></span><small>{{typeLabel(field.schema)}}</small></span>
     <span class="canvas-field-meta">{{field.schema.description||field.label}}</span>
     <span class="canvas-field-meta">{{field.required?'Obrigatório':'Opcional'}} · Clique para configurar</span>
   </button>
 </ng-template>
  <div class="inline-object group-inner-panel" *ngIf="isObjectSchema(field.schema) || isArrayOfObjects(field.schema)">
  <div class="inline-object-heading"><span>{{objectChildren(objectAttributesPath(field.path)).length}} atributo(s)</span></div>
  <div class="object-contents" *ngIf="!collapsedObjects.has(field.path)">
  <div class="inline-object-child" *ngFor="let child of objectChildren(objectAttributesPath(field.path))">
   <button type="button" (click)="openFieldEditor(child.path)"><strong>{{child.schema.title||child.label}}</strong><small>{{typeLabel(child.schema)}}</small></button>
   <button type="button" *ngIf="isObjectSchema(child.schema) || isArrayOfObjects(child.schema)" (click)="openContainer(objectAttributesPath(child.path))" aria-label="Abrir atributos do objeto">Abrir atributos →</button>
   <div class="field-card-tools"><button type="button" (click)="moveObjectAttribute(child.path,-1)" [disabled]="!canMoveObjectAttribute(child.path,-1)" aria-label="Subir atributo">↑</button><button type="button" (click)="moveObjectAttribute(child.path,1)" [disabled]="!canMoveObjectAttribute(child.path,1)" aria-label="Descer atributo">↓</button><button type="button" (click)="confirmDeleteField(child.path)" aria-label="Excluir atributo" title="Excluir"><span class="action-icon" aria-hidden="true">×</span><span>Excluir</span></button></div>
  </div>
  <div class="inline-object-actions"><button type="button" *ngFor="let kind of inlineTypes" (click)="addInlineAttribute(objectAttributesPath(field.path),kind.type)">+ {{kind.label}}</button></div>
  </div>
 </div>

 <div class="field-card-tools"><button type="button" (click)="moveCanvasField(field.path,-1)" [disabled]="!canMoveCanvasField(field.path,-1)" aria-label="Subir campo">↑</button><button type="button" (click)="moveCanvasField(field.path,1)" [disabled]="!canMoveCanvasField(field.path,1)" aria-label="Descer campo">↓</button><button type="button" (click)="confirmDeleteField(field.path)" title="Excluir campo" aria-label="Excluir campo"><span>Excluir</span></button></div>
</div>
   </div>


   <div class="canvas-empty" *ngIf="!canvasFields.length && !canvasConditions.length && !visualGroups.length">{{activeContainerPath ? "Este agrupador está vazio. Toque em Adicionar campo para incluir uma propriedade." : "Seu formulário está vazio. Toque em Adicionar campo para começar."}}</div>
  </section>


  <div class="workflow-navigation" *ngIf="mode==='construction' && builderStep==='components'"><span class="builder-help">Etapa 1 de 2 · Configure os campos antes das regras.</span><button type="button" class="workflow-next" (click)="goToBuilderStep('rules')">Próximo: Regras e condições →</button></div>
  <section class="canvas rules-canvas" *ngIf="mode==='construction' && builderStep==='rules'">
   <div class="canvas-header"><div><strong>Regras e condições</strong><p>Selecione campos existentes e configure as restrições. O Builder gera JSON Schema Draft 2020-12.</p></div></div>
   <p class="builder-error" *ngIf="!conditionAvailableFields.length">Crie primeiro os campos na etapa Componentes.</p>
   <div class="builder-actions">
    <button type="button" class="canvas-add-top" (click)="addCondition()" [disabled]="!conditionAvailableFields.length">+ Condição SE / ENTÃO / SENÃO</button>
    <button type="button" class="canvas-add-top" (click)="openOneOfModePicker()" [disabled]="!conditionAvailableFields.length">+ Alternativas exclusivas (oneOf)</button>
   </div>
   <p class="builder-help">Cada condição é combinada com as demais automaticamente por allOf (todas as regras).</p>
   <section class="condition-card" *ngFor="let rule of canvasConditions; trackBy:trackConditionIndex">
    <div class="condition-title"><strong>⑂ Condição {{rule.index+1}}</strong><button type="button" (click)="removeCondition(rule.index)">Excluir condição</button></div>
    <div class="condition-if">
     <strong>SE (IF)</strong><p class="builder-help">Quando a regra abaixo for atendida:</p><p class="builder-error" *ngIf="!conditionAvailableFields.length">Adicione um campo ao formulário para configurar esta condição.</p><p class="builder-error" *ngIf="conditionAvailableFields.length && !conditionField(rule.schema)">Selecione o campo que controla a condição.</p>
     <div class="condition-grid">
      <label>Campo<select [ngModel]="conditionField(rule.schema)" (ngModelChange)="setConditionField(rule.index,$event)"><option value="" disabled>Selecione um campo</option><option *ngFor="let field of conditionAvailableFields" [value]="field">{{field}}</option></select></label>
      <label>Operador<select [ngModel]="conditionOperator(rule.schema)" (ngModelChange)="setConditionOperator(rule.index,$event)"><option value="equals">É igual a</option><option value="different">É diferente de</option></select></label>
      <label>Valor esperado<input [ngModel]="conditionExpected(rule.schema)" (ngModelChange)="setConditionExpected(rule.index,$event)" placeholder="Ex.: EXPRESSION"></label>
     </div>
    </div>
    <div class="condition-branches">
     <div class="condition-branch true"><strong>✓ ENTÃO (THEN) — Verdadeiro</strong><p class="builder-help">Componentes aplicados quando verdadeiro.</p>
      <div class="condition-branch-field" *ngFor="let field of conditionBranchFields(rule.schema,'then'); trackBy:trackConditionFieldKey">
        <div class="condition-field-name"><span>Campo</span><strong>{{field.key}}</strong></div>
        <label class="required-switch-label condition-required">Obrigatório
          <input class="required-switch-input" type="checkbox" role="switch" [checked]="conditionFieldRequired(rule.schema,'then',field.key)" (change)="setConditionFieldRequired(rule.index,'then',field.key,$any($event.target).checked)"/>
          <span class="required-switch-track" aria-hidden="true"></span>
         </label>
        <button type="button" class="condition-delete-button" (click)="removeConditionField(rule.index,'then',field.key)" [attr.aria-label]="'Excluir regra do campo '+field.key">Excluir</button>
       </div>
       <label>Tornar campo obrigatório quando verdadeiro
        <select [ngModel]="''" (ngModelChange)="addExistingConditionField(rule.index,'then',$event)">
         <option value="">Selecione um campo...</option><option *ngFor="let field of conditionAvailableFields" [value]="field">{{field}}</option>
        </select>
       </label>
       <p class="builder-help">Ao selecionar, a regra é aplicada automaticamente.</p>
     </div>
     <div class="condition-branch false"><strong>✕ SENÃO (ELSE) — Falso</strong><p class="builder-help">Componentes aplicados quando falso.</p>
      <div class="condition-branch-field" *ngFor="let field of conditionBranchFields(rule.schema,'else'); trackBy:trackConditionFieldKey">
        <div class="condition-field-name"><span>Campo</span><strong>{{field.key}}</strong></div>
        <label class="required-switch-label condition-required">Obrigatório
          <input class="required-switch-input" type="checkbox" role="switch" [checked]="conditionFieldRequired(rule.schema,'else',field.key)" (change)="setConditionFieldRequired(rule.index,'else',field.key,$any($event.target).checked)"/>
          <span class="required-switch-track" aria-hidden="true"></span>
         </label>
        <button type="button" class="condition-delete-button" (click)="removeConditionField(rule.index,'else',field.key)" [attr.aria-label]="'Excluir regra do campo '+field.key">Excluir</button>
       </div>
       <label>Tornar campo obrigatório quando falso
        <select [ngModel]="''" (ngModelChange)="addExistingConditionField(rule.index,'else',$event)">
         <option value="">Selecione um campo...</option><option *ngFor="let field of conditionAvailableFields" [value]="field">{{field}}</option>
        </select>
       </label>
       <p class="builder-help">Ao selecionar, a regra é aplicada automaticamente.</p>
     </div>
    </div>
   </section>

   <section class="condition-card oneof-mode-picker" *ngIf="oneOfModePickerOpen">
    <div class="condition-title"><strong>Como deseja definir as alternativas?</strong><button type="button" (click)="oneOfModePickerOpen=false">Cancelar</button></div>
    <div class="condition-branches">
     <button type="button" class="oneof-mode-choice" (click)="addOneOfRule('fields')"><strong>Por conjunto de campos</strong><span>Ex.: Cartão ou Pix — defina campos obrigatórios e proibidos</span></button>
     <button type="button" class="oneof-mode-choice" (click)="addOneOfRule('value')"><strong>Por valor de um campo</strong><span>Ex.: EMAIL ou SMS — selecione um campo e seus valores</span></button>
    </div>
   </section>
   <section class="condition-card" *ngFor="let alternative of canvasOneOfRules; trackBy:trackOneOfRule">
    <div class="condition-title"><strong>Alternativas exclusivas — oneOf</strong><button type="button" (click)="removeOneOfRule(alternative.index)">Excluir</button></div>
    <p class="builder-help">Exatamente uma alternativa deve ser válida. As regras originais são preservadas.</p>
    <p class="builder-help" *ngIf="!oneOfUsesSelector(alternative.schema)">Alternativas baseadas na presença ou ausência de campos, sem campo discriminador.</p>
    <label *ngIf="oneOfUsesSelector(alternative.schema)">Campo de escolha<select [ngModel]="oneOfField(alternative.schema)" (ngModelChange)="setOneOfField(alternative.index,$event)"><option *ngFor="let field of conditionAvailableFields" [value]="field">{{field}}</option></select></label>
    <div class="oneof-alternatives-strip">
     <div class="condition-branch oneof-alternative" *ngFor="let option of oneOfOptions(alternative.schema); let i=index; trackBy:trackIndex">
      <div class="oneof-alternative-heading"><strong>Alternativa {{i+1}}</strong><button type="button" class="oneof-remove-option" (click)="removeOneOfAlternative(i)" [disabled]="oneOfOptions(alternative.schema).length<=2">Excluir alternativa</button></div>
      <label>Nome da alternativa<input [ngModel]="option.title || 'Alternativa '+(i+1)" (change)="renameOneOfAlternative(i,$any($event.target).value)"></label>
      <label *ngIf="oneOfUsesSelector(alternative.schema)">Valor que identifica a alternativa<input [ngModel]="oneOfOptionValue(option)" (change)="setOneOfValue(alternative.index,i,$any($event.target).value)"></label>
      <div class="oneof-rule-columns">
       <div class="oneof-rule-column">
        <label>Exigir campo</label>
        <div class="oneof-add-control"><select #requiredAlternative [attr.aria-label]="'Exigir campo na alternativa '+(i+1)"><option value="">Selecione...</option><option *ngFor="let field of conditionAvailableFields" [value]="field">{{field}}</option></select><button type="button" class="oneof-add-icon" (click)="addOneOfRequired(alternative.index,i,requiredAlternative.value);requiredAlternative.value=''" title="Adicionar campo" [attr.aria-label]="'Exigir campo selecionado'">+</button></div>
        <div class="oneof-rule-list oneof-required"><div class="oneof-rule-heading"><span class="oneof-rule-symbol">✓</span><strong>Obrigatórios</strong><span class="oneof-rule-count">{{oneOfRequired(option).length}}</span></div>
         <div class="oneof-rule-row" *ngFor="let field of oneOfRequired(option)"><span>{{field}}</span><button type="button" (click)="removeOneOfRequired(i,field)">Excluir</button></div>
         <p class="builder-help" *ngIf="!oneOfRequired(option).length">Nenhum</p>
        </div>
       </div>
       <div class="oneof-rule-column" *ngIf="!oneOfUsesSelector(alternative.schema)">
        <label>Proibir campo</label>
        <div class="oneof-add-control"><select #forbiddenAlternative [attr.aria-label]="'Proibir campo na alternativa '+(i+1)"><option value="">Selecione...</option><option *ngFor="let field of conditionAvailableFields" [value]="field">{{field}}</option></select><button type="button" class="oneof-add-icon" (click)="addOneOfForbidden(alternative.index,i,forbiddenAlternative.value);forbiddenAlternative.value=''" title="Adicionar campo" [attr.aria-label]="'Proibir campo selecionado'">+</button></div>
        <div class="oneof-rule-list oneof-forbidden"><div class="oneof-rule-heading"><span class="oneof-rule-symbol">×</span><strong>Proibidos</strong><span class="oneof-rule-count">{{oneOfForbidden(option).length}}</span></div>
         <div class="oneof-rule-row" *ngFor="let field of oneOfForbidden(option)"><span>{{field}}</span><button type="button" (click)="removeOneOfForbidden(i,field)">Excluir</button></div>
         <p class="builder-help" *ngIf="!oneOfForbidden(option).length">Nenhum</p>
        </div>
       </div>
      </div>
     </div>
    </div>
    <div class="oneof-alternatives-actions"><button type="button" (click)="addOneOfAlternative()">+ Adicionar alternativa</button><span class="builder-help">Mínimo de duas alternativas. Cada alternativa possui suas próprias regras.</span></div>
   </section>
   <p class="builder-help" *ngIf="!canvasConditions.length&&!canvasOneOfRules.length">Ainda não há regras. Crie uma condição ou uma alternativa.</p>
  </section>
  <div class="workflow-navigation" *ngIf="mode==='construction' && builderStep==='rules'"><button type="button" class="workflow-back" (click)="goToBuilderStep('components')">← Anterior: Componentes</button><span class="builder-help">Etapa 2 de 2 · Regras configuradas no schema.</span></div>
  <div class="editor-modal-backdrop" *ngIf="mode==='construction' && editorModalOpen" (click)="cancelEditor()"></div>
  <div class="editor-modal-shell" *ngIf="mode==='dev' || editorModalOpen" role="dialog" [attr.aria-modal]="mode==='construction' ? 'true' : null" aria-label="Configuração do campo">
  <div class="inspector" [class.field-modal]="false" [class.inspector-disabled]="mode==='construction' && !selectedPath && !editingForm" *ngIf="!selectedGroupId"><ng-container *ngIf="selected as node">
   <div class="editor-heading field-editor-heading"><strong>{{editingForm ? 'Configurar formulário' : 'Editar campo'}}</strong><div class="editor-field-type" *ngIf="mode==='construction' && selectedPath"><span>Tipo do campo</span><strong>{{typeLabel(node)}}</strong></div></div>
   <p class="editor-empty" *ngIf="mode==='construction' && !selectedPath && !editingForm">Selecione um campo em Campos do schema para editar suas propriedades e validações.</p>
   <div *ngIf="mode==='dev' || selectedPath || editingForm">
   <div class="builder-actions" *ngIf="mode==='dev'">
    <button type="button" *ngIf="this.isObjectSchema(node)" (click)="addProperty()">+ Propriedade</button>
    <button type="button" *ngIf="node.type==='array'" (click)="addItems()">+ Definir items</button>
    <button type="button" *ngIf="selectedPath!==''" (click)="removeSelected()">Excluir nó</button>
   </div>
   <nav class="editor-tabs" *ngIf="mode==='construction' && !editingForm" aria-label="Seções do editor"><button type="button" [class.active]="editorTab==='property'" (click)="editorTab='property'">Propriedade</button><button type="button" [class.active]="editorTab==='validation'" (click)="editorTab='validation'">Validações</button></nav>
   <div *ngIf="mode==='dev' || editingForm || editorTab==='property'">
   <label *ngIf="isPropertySelected">Nome da propriedade
    <input [ngModel]="propertyNameDraft ?? selectedName" (ngModelChange)="onPropertyNameInput($event)" (blur)="validatePropertyName()" (keydown.enter)="$event.preventDefault(); validatePropertyName()" [attr.aria-invalid]="propertyNameError ? 'true' : null"/>
    <small class="builder-error" *ngIf="propertyNameError">{{propertyNameError}}</small>
   </label>
   <label>Título<input [ngModel]="node.title||''" (ngModelChange)="setAttribute('title',$event)"/></label>
   <label>Descrição<input [ngModel]="node.description||''" (ngModelChange)="setAttribute('description',$event)"/></label>
   <label *ngIf="mode==='dev'">Tipo
    <select [ngModel]="node.type||'object'" (ngModelChange)="setType($event)">
     <option *ngFor="let t of types" [value]="t">{{t}}</option>
    </select>
   </label>
   <div class="field-options-card" *ngIf="selectedPath!=='' && (mode==='dev' || editorTab==='property')">
    <strong class="field-options-title">Opções do campo</strong>
    <label class="required-switch-label" *ngIf="!selectedPath.endsWith('/items')"><span>Obrigatório</span><input type="checkbox" class="required-switch-input" [ngModel]="selectedRequired" (ngModelChange)="setRequired($event)" role="switch" [attr.aria-checked]="selectedRequired"/><span class="required-switch-track" aria-hidden="true"></span></label>
    <label class="required-switch-label"><span>Permitir nulo</span><input type="checkbox" class="required-switch-input" [ngModel]="isNullableField(node)" (ngModelChange)="setNullableField($event)" role="switch" [attr.aria-checked]="isNullableField(node)"/><span class="required-switch-track" aria-hidden="true"></span></label>
   </div>
   </div>
   <div *ngIf="mode==='dev' || (!editingForm && editorTab==='validation')">
   <h4 class="rule-heading">Validações de {{typeLabel(node)}}</h4>
   <p class="validation-help" *ngIf="mode==='construction'">Configure apenas as regras aplicáveis a este tipo de campo.</p>
   <ng-container *ngIf="node.type==='string'">
    <label>Formato
     <select [ngModel]="node.format||''" (ngModelChange)="setOptional('format',$event)">
      <option value="">Sem formato</option>
      <option *ngFor="let format of formats" [value]="format">{{format}}</option>
     </select>
    </label>
    <div class="rule-grid">
     <label>Tamanho mínimo<input type="number" min="0" step="1" [ngModel]="node.minLength" (ngModelChange)="setNumber('minLength',$event,0,true)"/></label>
     <label>Tamanho máximo<input type="number" min="0" step="1" [ngModel]="node.maxLength" (ngModelChange)="setNumber('maxLength',$event,0,true)"/></label>
    </div>
    <label>Expressão regular (pattern)<input [ngModel]="node.pattern||''" (ngModelChange)="setPattern($event)" placeholder="^[A-Za-z]+$"/></label>
   </ng-container>
   <div class="rule-grid" *ngIf="node.type==='integer'||node.type==='number'">
    <label>Mínimo<input type="number" [step]="node.type==='integer'?1:'any'" [ngModel]="node.minimum" (ngModelChange)="setNumber('minimum',$event,undefined,node.type==='integer')"/></label>
    <label>Máximo<input type="number" [step]="node.type==='integer'?1:'any'" [ngModel]="node.maximum" (ngModelChange)="setNumber('maximum',$event,undefined,node.type==='integer')"/></label>
    <label>Exclusivo mínimo<input type="number" [step]="node.type==='integer'?1:'any'" [ngModel]="node.exclusiveMinimum" (ngModelChange)="setNumber('exclusiveMinimum',$event,undefined,node.type==='integer')"/></label>
    <label>Exclusivo máximo<input type="number" [step]="node.type==='integer'?1:'any'" [ngModel]="node.exclusiveMaximum" (ngModelChange)="setNumber('exclusiveMaximum',$event,undefined,node.type==='integer')"/></label>
    <label>Múltiplo de<input type="number" min="0" [step]="node.type==='integer'?1:'any'" [ngModel]="node.multipleOf" (ngModelChange)="setNumber('multipleOf',$event,0,node.type==='integer',true)"/></label>
   </div>
   <div class="rule-grid" *ngIf="node.type==='array'">
    <label>Mínimo de itens<input type="number" min="0" step="1" [ngModel]="node.minItems" (ngModelChange)="setNumber('minItems',$event,0,true)"/></label>
    <label>Máximo de itens<input type="number" min="0" step="1" [ngModel]="node.maxItems" (ngModelChange)="setNumber('maxItems',$event,0,true)"/></label>
   </div>
   <label *ngIf="node.type==='array'">Tipo dos itens
    <select [ngModel]="arrayItemType(node)" (ngModelChange)="setArrayItemType($event)">
     <option value="string">Texto</option><option value="integer">Inteiro</option><option value="number">Decimal</option><option value="boolean">Sim / Não</option><option value="object">Objeto / agrupador</option><option value="array">Lista</option>
    </select>
   </label>
   <div class="field-options-card" *ngIf="node.type==='array'">
    <label>Modo de preenchimento
     <select [ngModel]="arrayWidget(node)" (ngModelChange)="setArrayWidget($event)">
      <option value="list">Lista dinâmica — adicionar/remover itens</option>
      <option value="checkboxes" *ngIf="arrayItemType(node)==='string'||arrayItemType(node)==='integer'||arrayItemType(node)==='number'">Múltipla seleção — opções predefinidas</option>
      
     </select>
    </label>
    <ng-container *ngIf="arrayWidget(node)!=='list'">
     <strong>Opções disponíveis</strong>
     <table class="enum-table"><thead><tr><th>Valor</th><th>Label</th><th>Ações</th></tr></thead><tbody>
      <tr *ngFor="let entry of arrayOptionEntries(node);let i=index;trackBy:trackEnumIndex">
       <td><input [ngModel]="entry.value" (change)="updateArrayOption(i,'value',$any($event.target).value)" [attr.aria-label]="'Valor '+(i+1)"/></td>
       <td><input [ngModel]="entry.label" (change)="updateArrayOption(i,'label',$any($event.target).value)" [attr.aria-label]="'Label '+(i+1)"/></td>
       <td><button type="button" (click)="removeArrayOption(i)">Excluir</button></td>
      </tr>
     </tbody></table>
     <button type="button" class="enum-add" (click)="addArrayOption()">+ Adicionar opção</button>
    </ng-container>
   </div>
   <label *ngIf="node.type==='array'" class="required-switch-label validation-switch"><span>Itens únicos</span><input type="checkbox" class="required-switch-input" [ngModel]="!!node.uniqueItems" (ngModelChange)="setBoolean('uniqueItems',$event)" role="switch" [attr.aria-checked]="!!node.uniqueItems"/><span class="required-switch-track" aria-hidden="true"></span></label>
   <div class="rule-grid" *ngIf="this.isObjectSchema(node)">
    <label>Mínimo de propriedades<input type="number" min="0" step="1" [ngModel]="node.minProperties" (ngModelChange)="setNumber('minProperties',$event,0,true)"/></label>
    <label>Máximo de propriedades<input type="number" min="0" step="1" [ngModel]="node.maxProperties" (ngModelChange)="setNumber('maxProperties',$event,0,true)"/></label>
   </div>
   <p class="validation-help" *ngIf="node.type==='array' && arrayItemType(node)==='object'">Para adicionar propriedades aos objetos, selecione a lista e clique em Abrir lista de objetos.</p>
   <label *ngIf="this.isObjectSchema(node)" class="required-switch-label validation-switch"><span>Permitir propriedades adicionais</span><input type="checkbox" class="required-switch-input" [ngModel]="node.additionalProperties!==false" (ngModelChange)="setBoolean('additionalProperties',$event)" role="switch" [attr.aria-checked]="node.additionalProperties!==false"/><span class="required-switch-track" aria-hidden="true"></span></label>
   <p class="validation-help" *ngIf="node.type==='boolean'">Este campo aceita apenas verdadeiro ou falso. Não há restrições adicionais necessárias para validar o tipo.</p>
   <h4 class="rule-heading" *ngIf="node.type==='string' || node.type==='integer' || node.type==='number'">Valores permitidos</h4>
   <div class="enum-editor" *ngIf="node.type==='string' || node.type==='integer' || node.type==='number'">
    <p class="builder-help">Informe os valores aceitos e os nomes apresentados no formulário. O valor será enviado no JSON.</p>
    <table class="enum-table"><thead><tr><th>Valor</th><th>Label</th><th>Ações</th></tr></thead><tbody>
     <tr *ngFor="let entry of enumEntries(node);let i=index;trackBy:trackEnumIndex">
      <td><input [ngModel]="enumValueText(entry.value,node)" (change)="updateEnumEntry(i,'value',$any($event.target).value)" [attr.aria-label]="'Valor '+(i+1)"/></td>
      <td><input [ngModel]="entry.label" (change)="updateEnumEntry(i,'label',$any($event.target).value)" [attr.aria-label]="'Label '+(i+1)"/></td>
      <td><button type="button" (click)="removeEnumEntry(i)" [attr.aria-label]="'Remover valor '+(i+1)">Excluir</button></td>
     </tr>
    </tbody></table>
    <button type="button" class="enum-add" (click)="addEnumEntry()">+ Adicionar valor</button>
   </div>

   </div>
   <ng-container *ngIf="mode==='dev'">
   <h4 class="rule-heading">Composições visuais</h4>
   <div *ngFor="let kind of compositionKinds">
    <strong>{{kind}}</strong>
    <div class="composition-actions"><button type="button" (click)="addComposition(kind)">+ Alternativa</button></div>
    <div *ngFor="let branch of node[kind];let i=index" class="composition-row">
     <button type="button" class="tree-row" (click)="select(selectedPath+'/'+kind+'/'+i)">Editar {{kind}} #{{i+1}}</button>
     <button type="button" (click)="removeComposition(kind,i)">Excluir</button>
    </div>
   </div>
   <h4 class="rule-heading">Condicionais</h4>
   <div class="composition-actions">
    <button type="button" *ngFor="let kind of conditionalKinds" (click)="toggleConditional(kind)">{{node[kind]===undefined?'Adicionar':'Remover'}} {{kind}}</button>
   </div>
   <div class="composition-actions">
    <button type="button" *ngFor="let kind of conditionalKinds" [disabled]="node[kind]===undefined" (click)="select(selectedPath+'/'+kind)">Editar {{kind}}</button>
   </div>
   <h4 class="rule-heading">Definições reutilizáveis</h4>
   <div class="composition-actions"><input aria-label="Nome da definição" placeholder="Nome da definição" [(ngModel)]="newDefinitionName"/><button type="button" (click)="addNamedSchema('$defs')">+ Definição ($defs)</button></div>
   <div *ngFor="let entry of entries(node['$defs'])" class="composition-row">
    <button type="button" class="tree-row" (click)="select(selectedPath+'/$defs/'+escapePath(entry[0]))">{{entry[0]}}</button>
    <button type="button" (click)="removeNamedSchema('$defs',entry[0])">Excluir</button>
   </div>
   <label>Referência ($ref)
    <select [ngModel]="node['$ref']||''" (ngModelChange)="setReference($event)">
     <option value="">Sem referência</option>
     <option *ngFor="let name of definitionNames" [value]="'#/$defs/'+escapePath(name)">{{name}}</option>
     <option *ngIf="node['$ref'] && !isLocalDefinitionRef(node['$ref'])" [value]="node['$ref']">{{node['$ref']}} (externa ou personalizada)</option>
    </select>
   </label>
   <p class="builder-help">Referências externas existentes são preservadas. Para criá-las, use o editor avançado.</p>
   <h4 class="rule-heading" *ngIf="this.isObjectSchema(node)">Propriedades dinâmicas</h4>
   <ng-container *ngIf="this.isObjectSchema(node)">
    <div class="composition-actions"><input aria-label="Expressão regular da chave" placeholder="Ex.: ^custom_" [(ngModel)]="newPatternName"/><button type="button" (click)="addNamedSchema('patternProperties')">+ Padrão de chave</button></div>
    <div *ngFor="let entry of entries(node.patternProperties)" class="composition-row">
     <button type="button" class="tree-row" (click)="select(selectedPath+'/patternProperties/'+escapePath(entry[0]))">{{entry[0]}}</button>
     <button type="button" (click)="removeNamedSchema('patternProperties',entry[0])">Excluir</button>
    </div>
    <label>Schema de propriedades adicionais
     <select [ngModel]="additionalMode(node)" (ngModelChange)="setAdditionalMode($event)">
      <option value="allow">Permitir qualquer valor</option>
      <option value="deny">Não permitir</option>
      <option value="schema">Validar por schema</option>
     </select>
    </label>
    <button type="button" *ngIf="additionalMode(node)==='schema'" (click)="select(selectedPath+'/additionalProperties')">Editar schema adicional</button>
   </ng-container>
   <h4 class="rule-heading">Regras avançadas</h4>
   <p class="builder-help">Edite as regras JSON deste nó para usar if/then/else, allOf, oneOf, anyOf, not, $defs, $ref, patternProperties e dependências. O restante do nó será preservado.</p>
   <label>Regras avançadas (JSON)
    <textarea [ngModel]="advancedText(node)" (change)="setAdvanced($any($event.target).value)" style="min-height:150px;font-family:monospace"></textarea>
   </label>
   <p class="builder-help">Os campos não suportados visualmente são preservados. Enum deve conter valores JSON válidos, um por linha.</p>
   </ng-container>
   <p class="builder-error" *ngIf="error">{{error}}</p>
   </div>
   </ng-container>
  </div>
  <div class="editor-modal-actions" *ngIf="mode==='construction'"><button type="button" (click)="cancelEditor()">Cancelar</button><button type="button" (click)="saveEditor()">Salvar alterações</button></div>
  </div>
  <div class="confirm-overlay" *ngIf="showDeleteConfirmation" (click)="cancelDelete()"><section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-delete-title" aria-describedby="confirm-delete-description" (click)="$event.stopPropagation()"><div class="confirm-icon">!</div><h3 id="confirm-delete-title">Excluir campo?</h3><p id="confirm-delete-description">O campo <strong>{{selectedName}}</strong> será removido do schema. Essa ação não pode ser desfeita.</p><div class="confirm-actions"><button type="button" class="confirm-cancel" (click)="cancelDelete()">Cancelar</button><button type="button" class="confirm-danger" (click)="deleteConfirmed()">Excluir campo</button></div></section></div>
 </div>`
})
export class SchemaBuilderComponent implements OnChanges {
 builderStep:'components'|'rules'='components';
 oneOfModePickerOpen=false;
 goToBuilderStep(step:'components'|'rules'){this.builderStep=step;this.activeContainerPath='';this.containerHistory=[];this.error='';}
 private persistedSchema:Schema={type:'object',properties:{}};
 private editorDraft:Schema|null=null;
 @Input() set schema(value:Schema){this.persistedSchema=value;}
 get schema():Schema{return this.editorDraft??this.persistedSchema;}
 @Input() mode:'construction'|'dev'='construction';
 @Output() schemaChange=new EventEmitter<Schema>();
 selectedPath='';
 editorModalOpen=false;
 private beginEditor(){this.editorDraft=structuredClone(this.persistedSchema);this.propertyNameDraft=null;this.propertyNameError='';}
 openFieldEditor(path:string){this.beginEditor();this.select(path);this.editorModalOpen=true;}
 openFormEditor(){this.beginEditor();this.selectForm();this.editorModalOpen=true;}
 openVisualGroupEditor(id:string){this.beginEditor();this.selectVisualGroup(id);this.editorModalOpen=true;}
 saveEditor(){if(this.propertyNameDraft!==null)this.commitPropertyName();if(this.propertyNameError)return;const draft=this.editorDraft;if(!draft)return;this.editorModalOpen=false;this.editorDraft=null;this.editingForm=false;this.selectedGroupId='';this.persistedSchema=draft;this.rebuild();this.schemaChange.emit(draft);}
 cancelEditor(){this.editorModalOpen=false;this.editorDraft=null;this.propertyNameDraft=null;this.propertyNameError='';this.editingForm=false;this.selectedGroupId='';this.rebuild();}
 selectedGroupId='';
 editingForm=false;
 groupAddPickerOpen=false;
 get groupFieldPalette(){return this.palette;}
 openGroupAddPicker(id:string){this.selectVisualGroup(id);this.groupAddPickerOpen=true;}
 addFieldToSelectedGroup(type:string){if(!this.selectedGroupId)return;this.addFieldToGroup(this.selectedGroupId,type);this.groupAddPickerOpen=false;}
 collapsedGroups=new Set<string>();
 collapsedObjects=new Set<string>();
 toggleObjectExpanded(path:string){const next=new Set(this.collapsedObjects);if(next.has(path))next.delete(path);else next.add(path);this.collapsedObjects=next;}
 activeContainerPath='';
 containerHistory:string[]=[];
 error='';
 types=['string','integer','number','boolean','object','array','null'];
 compositionKinds=['oneOf','anyOf','allOf'];
 conditionalKinds=['if','then','else'];
 formats=['email','uri','uuid','date','date-time','time','hostname','ipv4','ipv6','password','regex'];
 rows:NodeRow[]=[];
 showAddMenu=false;
 showAdvanced=false;
 editorTab:'property'|'validation'='property';
 showDeleteConfirmation=false;
 confirmDeleteSelected(){this.showDeleteConfirmation=true;}
 confirmDeleteField(path:string){this.select(path);this.showDeleteConfirmation=true;}
 cancelDelete(){this.showDeleteConfirmation=false;}
 deleteConfirmed(){this.showDeleteConfirmation=false;this.removeSelected();}
 showStructure=false;
 palette=[{type:'string',label:'Texto',icon:'T'},{type:'integer',label:'Inteiro',icon:'#'},{type:'number',label:'Decimal',icon:'½'},{type:'boolean',label:'Sim / Não',icon:'☑'},{type:'object',label:'Objeto',icon:'{}'},{type:'array',label:'Lista',icon:'☷'}];
 get selectedVisualGroup():any{return this.visualGroups.find((g:any)=>g.id===this.selectedGroupId);}
 selectForm(){this.editingForm=true;this.selectedGroupId='';this.selectedPath='';}
 updateForm(key:'title'|'description',value:string){this.commit(root=>{if(value)root[key]=value;else delete root[key];});}
 selectVisualGroup(id:string){this.editingForm=false;this.selectedGroupId=id;this.selectedPath='';this.editorTab='property';this.showAddMenu=false;this.groupAddPickerOpen=false;}
 selectGroupField(key:string){this.selectedGroupId='';this.select((this.activeContainerPath||'')+'/properties/'+this.escape(key));}
 fieldTitle(key:string){return this.getNodeAt(this.schema,(this.activeContainerPath||'')+'/properties/'+this.escape(key))?.title||key;}

 private preserveScrollAfter(action:()=>void){const x=window.scrollX,y=window.scrollY;action();requestAnimationFrame(()=>window.scrollTo(x,y));}
 addFieldToGroup(id:string,type:string){this.addTypedProperty(type);}
 get canvasOrder():string[]{return Object.keys(this.getNodeAt(this.schema,this.activeContainerPath)?.properties||{}).map(k=>'field:'+k);}
 canvasPosition(t:string){return this.canvasOrder.indexOf(t);}
 canMoveRootItem(t:string,d:number){const i=this.canvasOrder.indexOf(t);return i>=0&&i+d>=0&&i+d<this.canvasOrder.length;}
 moveRootItem(t:string,d:number){if(!this.canMoveRootItem(t,d))return;const keys=this.canvasOrder.map(x=>x.slice(6));const i=keys.indexOf(t.slice(6));[keys[i],keys[i+d]]=[keys[i+d],keys[i]];this.commit(root=>{const node=this.getNodeAt(root,this.activeContainerPath);if(node?.properties)node.properties=Object.fromEntries(keys.map(k=>[k,node.properties![k]]));});}
 moveGroup(id:string,d:number){this.moveRootItem('field:'+id,d);}
 private canvasSiblingPaths(path:string):string[]{return this.canvasFields.map(x=>x.path);}
 canMoveCanvasField(path:string,d:number){return this.canMoveRootItem('field:'+this.propertyKey(path),d);}
 moveCanvasField(path:string,d:number){this.moveRootItem('field:'+this.propertyKey(path),d);}
 get visualGroups():any[]{return [];}
 updateVisualGroup(id:string,key:'title'|'description',value:string){}
 toggleVisualGroupField(id:string,field:string,enabled:boolean){}
 deleteVisualGroup(id:string){}
 toggleVisualGroupExpanded(id:string){const next=new Set(this.collapsedGroups);next.has(id)?next.delete(id):next.add(id);this.collapsedGroups=next;}
 groupFields(group:any):NodeRow[]{return [];}
 get ungroupedCanvasFields(){return this.canvasFields;}
 propertyKey(path:string){return this.segments(path).at(-1)||'';}
 private objectAttributeLocation(path:string):{parentPath:string;key:string;keys:string[]}|null{
  const parts=this.segments(path);
  if(parts.length<2||parts[parts.length-2]!=='properties')return null;
  const key=parts[parts.length-1];
  const parentPath=parts.slice(0,-2).map(part=>'/'+this.escape(part)).join('');
  const parent=this.getNodeAt(this.schema,parentPath);
  if(!parent||!this.isObjectSchema(parent)||!parent.properties||!Object.prototype.hasOwnProperty.call(parent.properties,key))return null;
  return {parentPath,key,keys:Object.keys(parent.properties)};
 }
 canMoveObjectAttribute(path:string,direction:number):boolean{
  const location=this.objectAttributeLocation(path);
  if(!location)return false;
  const index=location.keys.indexOf(location.key);
  return index>=0&&index+direction>=0&&index+direction<location.keys.length;
 }
 moveObjectAttribute(path:string,direction:number):void{
  const location=this.objectAttributeLocation(path);
  if(!location||!this.canMoveObjectAttribute(path,direction))return;
  const keys=[...location.keys];
  const index=keys.indexOf(location.key);
  [keys[index],keys[index+direction]]=[keys[index+direction],keys[index]];
  this.commit(root=>{
   const parent=this.getNodeAt(root,location.parentPath);
   if(!parent?.properties)return;
   parent.properties=Object.fromEntries(keys.map(key=>[key,parent.properties![key]]));
  });
 }

 dragSource='';
 dragField(path:string,event:DragEvent){this.dragSource='field:'+path;event.stopPropagation();event.dataTransfer?.setData('text/plain',this.dragSource);}
 dragGroup(id:string,event:DragEvent){this.dragSource='group:'+id;event.stopPropagation();event.dataTransfer?.setData('text/plain',this.dragSource);}
 dragOver(event:DragEvent){event.preventDefault();event.stopPropagation();}
 dropGroup(id:string,event:DragEvent){this.dragOver(event);}
 dropField(groupId:string|null,before:string|null,event:DragEvent){this.dragOver(event);const source=this.dragSource;this.dragSource='';if(!source.startsWith('field:'))return;const path=source.slice(6),key=this.propertyKey(path),prefix=(this.activeContainerPath||'')+'/properties/';if(!path.startsWith(prefix)||path.slice(prefix.length).includes('/'))return;this.commit(root=>{const node=this.getNodeAt(root,this.activeContainerPath);if(!node?.properties||!node.properties[key])return;const keys=Object.keys(node.properties).filter(k=>k!==key),i=before?keys.indexOf(before):-1;if(i<0)keys.push(key);else keys.splice(i,0,key);node.properties=Object.fromEntries(keys.map(k=>[k,node.properties![k]]));});}
 get canvasFields(){
  const prefix=this.activeContainerPath?this.activeContainerPath+'/properties/':'/properties/';
  return this.rows.filter(row=>row.path.startsWith(prefix)&&!row.path.slice(prefix.length).includes('/'));
 }
 get canvasHeaderTitle():string{return this.activeContainerPath?(this.getNodeAt(this.schema,this.activeContainerPath)?.title||this.activeContainerLabel):(this.schema.title||'Formulário sem título');}
 get canvasHeaderDescription():string{return this.activeContainerPath?(this.getNodeAt(this.schema,this.activeContainerPath)?.description||''):(this.schema.description||'');}
 get activeContainerLabel(){
  if(!this.activeContainerPath)return 'Raiz do schema';
  const node=this.getNodeAt(this.schema,this.activeContainerPath);
  return node?.title||this.segments(this.activeContainerPath).at(-1)||'Agrupador';
 }
 openContainer(path:string){
  const node=this.getNodeAt(this.schema,path);
  if(!this.isObjectSchema(node)){this.error='Só é possível abrir um agrupador do tipo objeto.';return;}
  this.containerHistory.push(this.activeContainerPath);
  this.activeContainerPath=path;
  this.selectedGroupId='';
  this.error='';
 }
 toggleAddMenu(){this.showAddMenu=!this.showAddMenu;}
 openSelectedGroup(){this.openContainer(this.selectedPath);}
 openArrayItems(){
  if(this.selected?.type!=='array'||this.arrayItemType(this.selected)!=='object')return;
  this.openContainer(this.selectedPath+'/items');
 }
 goToParentContainer(){this.selectedGroupId='';this.activeContainerPath=this.containerHistory.pop()||'';}
 arrayWidget(node:Schema):string{return node['x-ui']?.widget==='multiselect'?'checkboxes':node['x-ui']?.widget||'list';}
 setArrayWidget(widget:string){
  if(!['list','checkboxes','multiselect'].includes(widget))return;
  this.commit(root=>{const node=this.current(root)!;node['x-ui']??={};node['x-ui'].widget=widget;
   if(widget!=='list'){
    node.uniqueItems=true;
    const type=this.arrayItemType(node);
    if(!['string','integer','number'].includes(type))node.items={type:'string'};
   }
  });
 }
 arrayOptionEntries(node:Schema):{value:any;label:string}[]{
  const item=node.items as Schema|undefined;
  const options=node['x-ui']?.options||[];
  return (item?.enum||[]).map((value:any)=>{const option=options.find((entry:any)=>Object.is(entry.value,value));return {value,label:String(option?.label??value),autoLabel:option?.autoLabel};});
 }
 private saveArrayOptions(entries:{value:any;label:string;autoLabel?:boolean}[]){
  if(entries.some((entry,i)=>entries.findIndex(other=>Object.is(entry.value,other.value))!==i)){this.error='Valores duplicados não são permitidos.';return;}
  this.error='';
  this.commit(root=>{const node=this.current(root)!;if(!node.items||typeof node.items!=='object')node.items={type:'string'};
   const item=node.items as Schema;
   if(entries.length)item.enum=entries.map(entry=>entry.value);else delete item.enum;
   node['x-ui']??={};
   node['x-ui'].options=entries.map(entry=>({value:entry.value,label:entry.label,autoLabel:entry.autoLabel??entry.label===String(entry.value)}));
  });
 }
 addArrayOption(){const node=this.selected!,entries=this.arrayOptionEntries(node),type=this.arrayItemType(node);
  let value:any=type==='integer'||type==='number'?0:'VALOR_'+(entries.length+1);
  if(typeof value==='number'){while(entries.some(entry=>Object.is(entry.value,value)))value++;}
  else{while(entries.some(entry=>entry.value===value))value+='_'};
  this.saveArrayOptions([...entries,{value,label:String(value),autoLabel:true}]);
 }
 updateArrayOption(index:number,key:'value'|'label',text:string){const node=this.selected!,entries=this.arrayOptionEntries(node);
  if(!entries[index])return;
  try{const previous=entries[index],value=key==='value'?this.enumValueOf(text,node.items as Schema):text;
   entries[index]={...previous,[key]:value};
   // Preserve labels explicitly edited by the user, even when they match the original value.
   const savedOptions=node['x-ui']?.options||[];
   const saved=savedOptions.find((entry:any)=>Object.is(entry.value,previous.value));
   const autoLabel=saved?.autoLabel!==false&&(saved?.autoLabel===true||previous.label===String(previous.value));
   if(key==='value'&&autoLabel)entries[index].label=String(value);
   if(key==='label')entries[index].autoLabel=false;
   else entries[index].autoLabel=autoLabel;
   this.saveArrayOptions(entries);
  }catch(e){this.error=e instanceof Error?e.message:String(e);}
 }
 removeArrayOption(index:number){const entries=this.arrayOptionEntries(this.selected!);entries.splice(index,1);this.saveArrayOptions(entries);}

 arrayOptionsText(node:Schema):string{const item=node.items;return item&&typeof item==='object'&&!Array.isArray(item)&&Array.isArray(item.enum)?item.enum.map((v:unknown)=>String(v)).join('\n'):'';}
 setArrayOptions(text:string){this.commit(root=>{const node=this.current(root)!,item=node.items;if(!item||typeof item!=='object'||Array.isArray(item))return;const type=this.arrayItemType(node);const values=text.split(/\r?\n/).map(v=>v.trim()).filter(Boolean).map(v=>type==='integer'||type==='number'?Number(v):v).filter(v=>typeof v!=='number'||Number.isFinite(v));if(values.length)item.enum=[...new Set(values)];else delete item.enum;});}
 arrayItemType(node:Schema):string{
  const item=node.items;
  if(item===true||item===undefined)return 'string';
  if(item===false)return 'null';
  return Array.isArray(item.type)?item.type[0]||'string':item.type||'string';
 }
 setArrayItemType(type:string){
  this.commit(root=>{
   const node=this.current(root)!;
   const existing=node.items&&typeof node.items==='object'&&!Array.isArray(node.items)?node.items:{};
   // Changing item type resets incompatible constraints and nested properties.
   node.items=type==='object'
    ?{type:'object',title:'Item',properties:{}}
    :type==='array'
     ?{type:'array',title:'Item',items:{type:'string'}}
     :{type,title:'Item'};

  });
 }
 inlineTypes=[{type:'object',label:'Objeto'},{type:'string',label:'Texto'},{type:'integer',label:'Inteiro'},{type:'number',label:'Decimal'},{type:'boolean',label:'Sim/Não'},{type:'array',label:'Lista'}];
 isArrayOfObjects(node:Schema):boolean{return node.type==='array'&&!!node.items&&typeof node.items==='object'&&!Array.isArray(node.items)&&this.isObjectSchema(node.items as Schema);}
 objectAttributesPath(path:string):string{const node=this.getNodeAt(this.schema,path);return node&&this.isArrayOfObjects(node)?path+'/items':path;}
 objectChildren(path:string){const node=this.getNodeAt(this.schema,path);return Object.entries(node?.properties||{}).map(([key,schema])=>({path:path+'/properties/'+this.escape(key),label:key,schema:schema as Schema}));}
 addInlineAttribute(path:string,type:string){if(!this.inlineTypes.some(item=>item.type===type))return;this.preserveScrollAfter(()=>this.commit(root=>{const node=this.getNodeAt(root,path);if(!node||!this.isObjectSchema(node))return;node.properties??={};let key='campo',i=2;while(Object.prototype.hasOwnProperty.call(node.properties,key))key='campo'+i++;node.properties[key]=type==='object'?{type:'object',title:key,properties:{}}:type==='array'?{type:'array',title:key,items:{type:'string'}}:{type,title:key};this.selectedPath=path+'/properties/'+this.escape(key);this.selectedGroupId='';this.editingForm=false;}));}


 private oneOfCacheSchema:Schema|undefined;
 private oneOfCacheRules:{index:number;schema:Schema}[]=[];
 get canvasOneOfRules():{index:number;schema:Schema}[]{
  const schema=this.schema;
  if(schema!==this.oneOfCacheSchema){
   this.oneOfCacheSchema=schema;
   this.oneOfCacheRules=Array.isArray(schema.oneOf)&&schema.oneOf.length?[{index:0,schema}]:[];
  }
  return this.oneOfCacheRules;
 }
 trackOneOfRule(_index:number,rule:{index:number;schema:Schema}){return rule.index;}
 trackIndex(index:number){return index;}
 openOneOfModePicker(){
  if(this.schema.oneOf?.length){this.error='Já existe uma regra oneOf. Edite ou exclua a regra atual antes de criar outra.';return;}
  this.error='';this.oneOfModePickerOpen=true;
 }
 addOneOfRule(mode:'fields'|'value'){
  if(this.schema.oneOf?.length)return;
  const fields=this.conditionAvailableFields;if(!fields.length)return;
  this.oneOfModePickerOpen=false;
  if(mode==='fields'){
   this.commit(root=>{root.oneOf=[
    {title:'Alternativa 1',required:[fields[0]]},
    {title:'Alternativa 2',required:fields.length>1?[fields[1]]:[]}
   ];});
   return;
  }
  const field=fields.find(key=>Array.isArray(this.schema.properties?.[key]?.enum)&&this.schema.properties[key].enum.length>=2)||fields[0];
  const candidates=this.schema.properties?.[field]?.enum||['A','B'];
  const values=candidates.slice(0,2);
  this.commit(root=>{root.oneOf=values.map((value:any,index:number)=>({title:'Alternativa '+(index+1),properties:{[field]:{const:value}},required:[field]}));});
 }
 addOneOfAlternative(){
  if(!this.schema.oneOf?.length)return;
  const selector=this.oneOfField(this.schema);
  const index=this.schema.oneOf.length;
  this.commit(root=>{
   const option:Schema={title:'Alternativa '+(index+1)};
   if(selector){
    const existing=(root.oneOf||[]).map((item:Schema)=>item.properties?.[selector]?.const);
    const allowed=root.properties?.[selector]?.enum||[];
    const available=allowed.find((value:any)=>!existing.some((old:any)=>Object.is(old,value)));
    if(available===undefined){this.error='Cadastre outro valor permitido no campo de escolha antes de criar a alternativa.';return;}
    option.properties={[selector]:{const:available}};
    option.required=[selector];
   }
   root.oneOf??=[];
   root.oneOf.push(option);
  });
 }
 removeOneOfAlternative(index:number){
  if((this.schema.oneOf?.length||0)<=2)return;
  this.commit(root=>{root.oneOf?.splice(index,1);});
 }
 removeOneOfRule(_index:number){this.commit(root=>{delete root.oneOf;});}
 oneOfOptions(node:Schema):Schema[]{return (node.oneOf||[]) as Schema[];}
 oneOfUsesSelector(node:Schema):boolean{return !!this.oneOfField(node);}
 oneOfForbiddenIsEditable(node:Schema):boolean{
  const not=node.not as any;
  if(!not)return true;
  const validRequired=(part:any)=>part&&typeof part==='object'&&Object.keys(part).length===1&&Array.isArray(part.required)&&part.required.length===1&&typeof part.required[0]==='string';
  if(validRequired(not))return true;
  return not&&typeof not==='object'&&Object.keys(not).length===1&&Array.isArray(not.anyOf)&&not.anyOf.every(validRequired);
 }
 oneOfForbidden(node:Schema):string[]{
  const not=node.not as any;
  if(!not||typeof not!=='object')return [];
  const rules=Array.isArray(not.anyOf)?not.anyOf:[not];
  return [...new Set<string>(rules.flatMap((rule:any)=>Array.isArray(rule.required)&&rule.required.length===1?rule.required:[]))];
 }
 addOneOfForbidden(_index:number,index:number,key:string){
  if(!key||!this.conditionAvailableFields.includes(key))return;
  this.commit(root=>{
   const option=root.oneOf?.[index];if(!option)return;
   if(option.not && !this.oneOfForbiddenIsEditable(option)){this.error='A regra not existente é avançada. Edite-a no modo Para Dev.';return;}
   const keys=[...new Set<string>([...this.oneOfForbidden(option),key])];
   option.not=keys.length===1?{required:[keys[0]]}:{anyOf:keys.map(name=>({required:[name]}))};
  });
 }
 oneOfField(node:Schema):string{return Object.keys(node.oneOf?.[0]?.properties||{}).find(key=>node.oneOf?.every((option:Schema)=>option.properties?.[key]?.const!==undefined))||'';}
 oneOfOptionValue(node:Schema):string{return String(node.properties?.[Object.keys(node.properties||{})[0]]?.const??'');}
 renameOneOfAlternative(index:number,title:string){this.commit(root=>{if(root.oneOf?.[index])root.oneOf[index].title=title;});}
 oneOfRequired(node:Schema):string[]{const discriminator=Object.keys(node.properties||{}).find(key=>node.properties?.[key]?.const!==undefined);return (node.required||[]).filter((key:string)=>key!==discriminator);}
 setOneOfField(_index:number,field:string){
  if(!this.conditionAvailableFields.includes(field))return;
  this.commit(root=>{for(const option of root.oneOf||[]){const value=this.oneOfOptionValue(option);const required=this.oneOfRequired(option);option.properties={[field]:{const:value}};option.required=[field,...required.filter(key=>key!==field)];}});
 }
 setOneOfValue(_index:number,index:number,value:string){
  this.commit(root=>{const rule=root.oneOf?.[index];if(!rule)return;const key=Object.keys(rule.properties||{})[0];if(key)rule.properties[key]={const:value};});
 }
 addOneOfRequired(_index:number,index:number,field:string){
  if(!field||!this.conditionAvailableFields.includes(field))return;
  this.commit(root=>{const rule=root.oneOf?.[index];if(rule)rule.required=[...new Set([...(rule.required||[]),field])];});
 }
 removeOneOfRequired(index:number,key:string){
  this.commit(root=>{const option=root.oneOf?.[index];if(!option)return;
   option.required=(option.required||[]).filter((field:string)=>field!==key);
   if(!option.required.length)delete option.required;
  });
 }
 removeOneOfForbidden(index:number,key:string){
  this.commit(root=>{const option=root.oneOf?.[index];if(!option||!this.oneOfForbiddenIsEditable(option))return;
   const remaining=this.oneOfForbidden(option).filter(field=>field!==key);
   if(!remaining.length)delete option.not;
   else option.not=remaining.length===1?{required:[remaining[0]]}:{anyOf:remaining.map(field=>({required:[field]}))};
  });
 }
 get conditionFieldPalette(){return this.palette.filter(item=>item.type!=='condition');}
 trackConditionIndex(_index:number,rule:{index:number;schema:Schema}){return rule.index;}
 trackConditionFieldKey(_index:number,field:{key:string;schema:Schema}){return field.key;}
 get conditionContainer():Schema|undefined{return this.getNodeAt(this.schema,this.activeContainerPath);}
 private conditionCacheContainer:Schema|undefined;
 private conditionCachePath='';
 private conditionCacheRules:{index:number;schema:Schema}[]=[];
 private conditionCacheFields:string[]=[];
 private refreshConditionCache(){
  const node=this.conditionContainer;
  if(node===this.conditionCacheContainer&&this.activeContainerPath===this.conditionCachePath)return;
  this.conditionCacheContainer=node;
  this.conditionCachePath=this.activeContainerPath;
  this.conditionCacheRules=(node?.allOf||[]).map((schema:Schema,index:number)=>({index,schema})).filter((r:{index:number;schema:Schema})=>!!r.schema?.if&&r.schema.then!==undefined);
  this.conditionCacheFields=Object.keys(node?.properties||{});
 }
 get canvasConditions():{index:number;schema:Schema}[]{this.refreshConditionCache();return this.conditionCacheRules;}
 get conditionAvailableFields():string[]{this.refreshConditionCache();return this.conditionCacheFields;}
 private editableCondition(root:Schema,index:number):Schema|undefined{return this.getNodeAt(root,this.activeContainerPath)?.allOf?.[index];}
 private conditionCompareValue(field:string,text:string):any{
  const definition=this.conditionContainer?.properties?.[field]||{};
  const type=Array.isArray(definition.type)?definition.type[0]:definition.type;
  if(type==='boolean')return text==='true';
  if(type==='integer'||type==='number'){const value=Number(text);return text.trim()!==''&&Number.isFinite(value)?value:text;}
  return text;
 }
 private conditionCheck(field:string,operator:string,text:string):Schema{
  if(!field)return {properties:{}};
  const value=this.conditionCompareValue(field,text);
  return {properties:{[field]:operator==='different'?{not:{const:value}}:{const:value}},required:[field]};
 }
 conditionField(rule:Schema):string{return Object.keys(rule.if?.properties||{})[0]||'';}
 conditionOperator(rule:Schema):string{return rule.if?.properties?.[this.conditionField(rule)]?.not?'different':'equals';}
 conditionExpected(rule:Schema):string{const clause=rule.if?.properties?.[this.conditionField(rule)]||{};return String(clause.not?.const??clause.const??'');}
 addCondition(){
  const container=this.conditionContainer,fields=this.conditionAvailableFields;
  if(!container||!this.isObjectSchema(container)){this.error='Abra um objeto para adicionar uma condição.';return;}
  this.error='';
  this.commit(root=>{const node=this.getNodeAt(root,this.activeContainerPath)!;node.allOf??=[];node.allOf.push({if:fields.length?this.conditionCheck(fields[0],'equals',''):{properties:{}},then:{}});});
 }
 removeCondition(index:number){this.commit(root=>{const node=this.getNodeAt(root,this.activeContainerPath)!;node.allOf?.splice(index,1);if(!node.allOf?.length)delete node.allOf;});}
 private changeCondition(index:number,field:string,operator:string,expected:string){this.commit(root=>{const rule=this.editableCondition(root,index);if(rule)rule.if=this.conditionCheck(field,operator,expected);});}
 setConditionField(index:number,field:string){const rule=this.canvasConditions.find(r=>r.index===index)?.schema;if(rule&&this.conditionAvailableFields.includes(field))this.changeCondition(index,field,this.conditionOperator(rule),this.conditionExpected(rule));}
 setConditionOperator(index:number,operator:string){const rule=this.canvasConditions.find(r=>r.index===index)?.schema;if(rule)this.changeCondition(index,this.conditionField(rule),operator,this.conditionExpected(rule));}
 setConditionExpected(index:number,value:string){const rule=this.canvasConditions.find(r=>r.index===index)?.schema;if(rule)this.changeCondition(index,this.conditionField(rule),this.conditionOperator(rule),value);}
 conditionBranchFields(rule:Schema,branch:'then'|'else'):{key:string;schema:Schema}[]{
  const node=rule[branch]||{};
  const keys=[...new Set([...Object.keys(node.properties||{}),...(node.required||[])])];
  return keys.map(key=>({key,schema:node.properties?.[key]||{}}));
 }
 conditionFieldRequired(rule:Schema,branch:'then'|'else',key:string){return (rule[branch]?.required||[]).includes(key);}
 private editBranch(index:number,branch:'then'|'else',edit:(node:Schema)=>void){this.commit(root=>{const rule=this.editableCondition(root,index);if(!rule)return;rule[branch]??={};edit(rule[branch]);});}
 addExistingConditionField(index:number,branch:'then'|'else',key:string){
  if(!key||!this.conditionAvailableFields.includes(key))return;
  this.commit(root=>{
   const container=this.getNodeAt(root,this.activeContainerPath);
   const rule=container?.allOf?.[index];
   if(!container||!rule)return;
   const node=rule[branch]??(rule[branch]={});
   node.required=[...new Set([...(node.required||[]),key])];
   // A obrigatoriedade passa a ser condicional, nunca global.
   if(container.required){
    container.required=container.required.filter((name:string)=>name!==key);
    if(!container.required.length)delete container.required;
   }
  });
 }
 addConditionField(index:number,branch:'then'|'else'){this.editBranch(index,branch,node=>{node.properties??={};let key='campo',i=2;while(key in node.properties||key in (this.conditionContainer?.properties||{}))key='campo'+i++;node.properties[key]={type:'string',title:key};});}
 renameConditionField(index:number,branch:'then'|'else',oldKey:string,name:string){const key=name.trim();if(!key||key===oldKey||!/^[$A-Za-z_][$A-Za-z0-9_-]*$/.test(key))return;this.editBranch(index,branch,node=>{if(!node.properties?.[oldKey]||key in node.properties)return;const next:Record<string,Schema>={};for(const [k,v] of Object.entries(node.properties))next[k===oldKey?key:k]=v as Schema;node.properties=next;if(node.required)node.required=node.required.map((v:string)=>v===oldKey?key:v);});}
 setConditionFieldType(index:number,branch:'then'|'else',key:string,type:string){if(!this.palette.some(item=>item.type===type&&type!=='condition'))return;this.editBranch(index,branch,node=>{if(!node.properties?.[key])return; if(type)node.properties[key]={...node.properties[key],type};else delete node.properties[key].type;});}
 setConditionFieldRequired(index:number,branch:'then'|'else',key:string,enabled:boolean){this.editBranch(index,branch,node=>{const required=new Set<string>(node.required||[]);enabled?required.add(key):required.delete(key);if(required.size)node.required=[...required];else delete node.required;});}
 removeConditionField(index:number,branch:'then'|'else',key:string){this.editBranch(index,branch,node=>{if(node.properties)delete node.properties[key];if(node.required){node.required=node.required.filter((v:string)=>v!==key);if(!node.required.length)delete node.required;}});}

 addTypedProperty(type:string){
  if(type==='condition'){this.addCondition();return;}
  const targetPath=this.activeContainerPath;
  const node=this.getNodeAt(this.schema,targetPath);
  if(!node||!this.isObjectSchema(node)){this.error='Selecione um objeto para adicionar campos.';return;}
  this.error='';
  this.commit(root=>{
   const target=this.getNodeAt(root,targetPath)!;
   target.properties??={};
   let key='campo',i=2;while(Object.prototype.hasOwnProperty.call(target.properties,key))key='campo'+i++;
   const objectType=type==='object';
   target.properties[key]=objectType
     ?{type:'object',title:key,description:'Objeto JSON.',properties:{}}
     :type==='array'?{type:'array',items:{type:'string'},title:key}:{type,title:key};
   this.selectedPath=targetPath+'/properties/'+this.escape(key);
   this.selectedGroupId='';
  });
  this.showAddMenu=false;
 }
 newDefinitionName='';
 newPatternName='';
 get isPropertySelected(){const parts=this.segments(this.selectedPath);return parts.length>=2&&parts[parts.length-2]==='properties';}
 entries(value:any):[string,any][]{return value&&typeof value==='object'&&!Array.isArray(value)?Object.entries(value):[];}
 escapePath(value:string){return this.escape(value);}
 get definitionNames(){return Object.keys(this.schema?.['$defs']||{});}
 isLocalDefinitionRef(ref:string){return this.definitionNames.some(name=>ref==='#/$defs/'+this.escape(name));}
 additionalMode(node:Schema){return node.additionalProperties===false?'deny':node.additionalProperties&&typeof node.additionalProperties==='object'?'schema':'allow';}
 setAdditionalMode(mode:string){
  this.commit(root=>{
   const node=this.current(root)!;
   if(mode==='deny')node.additionalProperties=false;
   else if(mode==='schema')node.additionalProperties={type:'string'};
   else node.additionalProperties=true;
  });
 }
 setReference(ref:string){this.commit(root=>{const node=this.current(root)!;if(ref)node['$ref']=ref;else delete node['$ref'];});}
 addNamedSchema(kind:'$defs'|'patternProperties'){
  const name=kind==='$defs'?'Definicao':'^campo_';
  const proposed=kind==='$defs'?this.newDefinitionName:this.newPatternName;
  if(!proposed.trim()){this.error='Informe um nome.';return;}
  const key=proposed.trim();
  if(!key){this.error='Informe um nome.';return;}
  if(kind==='patternProperties'){try{new RegExp(key);}catch{this.error='Padrão regex inválido.';return;}}
  const node=this.selected!;
  if(node[kind]&&Object.prototype.hasOwnProperty.call(node[kind],key)){this.error='Nome já utilizado.';return;}
  this.error='';
  this.commit(root=>{
   const target=this.current(root)!;target[kind]??={};target[kind][key]={type:'string'};
   this.selectedPath+='/'+kind+'/'+this.escape(key);
  });
  if(kind==='$defs')this.newDefinitionName='';else this.newPatternName='';
 }
 removeNamedSchema(kind:'$defs'|'patternProperties',key:string){
  this.error='';
  if(kind==='$defs'){
   const reference='#/$defs/'+this.escape(key);
   const usesReference=(value:any):boolean=>{
    if(!value||typeof value!=='object')return false;
    if(value['$ref']===reference)return true;
    return Object.values(value).some(usesReference);
   };
   if(usesReference(this.schema)){this.error='A definição possui referências. Remova os vínculos primeiro.';return;}
  }
  this.commit(root=>{
   const node=this.current(root)!;delete node[kind]?.[key];
   if(node[kind]&&!Object.keys(node[kind]).length)delete node[kind];
  });
 }
 ngOnChanges(_changes:SimpleChanges){this.rebuild();}
 private segments(path:string){return path.split('/').slice(1).map(x=>x.replace(/~1/g,'/').replace(/~0/g,'~'));}
 private escape(key:string){return key.replace(/~/g,'~0').replace(/\//g,'~1');}
 private getNode(root:Schema,path:string):Schema|undefined {return this.getNodeAt(root,path);}
 isObjectSchema(node:Schema|undefined):boolean{return !!node && (node.type==='object'||(Array.isArray(node.type)&&node.type.includes('object')));}
 get selected(){return this.getNode(this.schema,this.selectedPath);}
 isNullableField(node:Schema){return Array.isArray(node.type)&&node.type.includes('null');}
 setNullableField(enabled:boolean){this.commit(root=>{const node=this.current(root);if(!node)return;const types=Array.isArray(node.type)?node.type.filter((type:string)=>type!=='null'):node.type?[node.type]:[];node.type=enabled?[...types,'null']:types.length===1?types[0]:types;});}
 get selectedName(){return this.segments(this.selectedPath).at(-1)||'';}
 get selectedRequired(){
  const parts=this.segments(this.selectedPath),name=parts.pop();
  if(parts.pop()!=='properties')return false;
  const parent=this.getNodeAt(this.schema,'/'+parts.map(p=>this.escape(p)).join('/'));
  return !!name&&!!parent?.required?.includes(name);
 }
 typeLabel(node:Schema){return Array.isArray(node.type)?node.type.join('|'):node.type||'livre';}
 select(path:string){this.editingForm=false;this.groupAddPickerOpen=false;this.selectedGroupId='';this.showDeleteConfirmation=false;this.selectedPath=path;this.propertyNameDraft=null;this.propertyNameError='';this.editorTab='property';this.error='';}
 private rebuild(){
  const rows:NodeRow[]=[];
  const walk=(node:Schema,path:string,label:string,depth:number,required=false)=>{
   if(depth>20)return;
   rows.push({path,label,depth,schema:node,required});
   if(this.isObjectSchema(node)&&node.properties)for(const [key,child] of Object.entries(node.properties)){
    if(child&&typeof child==='object'&&!Array.isArray(child))walk(child as Schema,path+'/properties/'+this.escape(key),key,depth+1,(node.required||[]).includes(key));
   }
   if(node.type==='array'&&node.items&&typeof node.items==='object'&&!Array.isArray(node.items))walk(node.items,path+'/items','items',depth+1);
   for(const kind of this.compositionKinds)if(Array.isArray(node[kind]))node[kind].forEach((child:any,index:number)=>{if(child&&typeof child==='object'&&!Array.isArray(child))walk(child,path+'/'+kind+'/'+index,kind+' #'+(index+1),depth+1);});
   for(const kind of this.conditionalKinds)if(node[kind]&&typeof node[kind]==='object'&&!Array.isArray(node[kind]))walk(node[kind],path+'/'+kind,kind,depth+1);
   for(const kind of ['$defs','patternProperties'])for(const [key,child] of this.entries(node[kind]))if(child&&typeof child==='object'&&!Array.isArray(child))walk(child,path+'/'+kind+'/'+this.escape(key),key,depth+1);
   if(node.additionalProperties&&typeof node.additionalProperties==='object'&&!Array.isArray(node.additionalProperties))walk(node.additionalProperties,path+'/additionalProperties','additionalProperties',depth+1);
  };
  walk(this.schema,'','Schema',0);
  this.rows=rows;
  if(!this.getNode(this.schema,this.selectedPath))this.selectedPath='';
  if(this.activeContainerPath&&!this.isObjectSchema(this.getNodeAt(this.schema,this.activeContainerPath))){this.activeContainerPath='';this.containerHistory=[];}
 }
 private getNodeAt(root:Schema,path:string):Schema|undefined {
  if(!path||path==='/')return root;
  const parts=this.segments(path);
  let node:any=root;
  for(let i=0;i<parts.length;i++){
   if(parts[i]==='properties'){node=node?.properties?.[parts[++i]];}
   else if(parts[i]==='items'){node=node?.items;}
   else if(this.compositionKinds.includes(parts[i])){node=node?.[parts[i]]?.[Number(parts[++i])];}
   else if(this.conditionalKinds.includes(parts[i])){node=node?.[parts[i]];}
   else if(parts[i]==='$defs'||parts[i]==='patternProperties'){node=node?.[parts[i]]?.[parts[++i]];}
   else if(parts[i]==='additionalProperties'){node=node?.additionalProperties;}
   else return undefined;
  }
  return node&&typeof node==='object'&&!Array.isArray(node)?node:undefined;
 }
 private commit(edit:(root:Schema)=>void){
  const next=structuredClone(this.schema);
  edit(next);
  if(this.editorModalOpen&&this.editorDraft){this.editorDraft=next;this.rebuild();return;}
  this.persistedSchema=next;
  this.rebuild();
  this.schemaChange.emit(next);
 }
 private current(root:Schema){return this.getNodeAt(root,this.selectedPath);}
 addProperty(){
  this.error='';
  const node=this.selected;if(!node||!this.isObjectSchema(node))return;
  this.commit(root=>{
   const target=this.current(root)!;
   target.properties??={};
   let key='campo',i=2;while(Object.prototype.hasOwnProperty.call(target.properties,key))key='campo'+i++;
   target.properties[key]={type:'string',title:key};
   this.selectedPath+='/properties/'+this.escape(key);
  });
 }
 addItems(){
  this.error='';
  this.commit(root=>{
   const node=this.current(root)!;
   if(node.items===undefined)node.items={type:'string'};
   if(typeof node.items==='object'&&!Array.isArray(node.items))this.selectedPath+='/items';
  });
 }
 setAttribute(key:'title'|'description',value:string){this.commit(root=>{const node=this.current(root)!;if(value)node[key]=value;else delete node[key];});}
 setOptional(key:string,value:string){this.error='';this.commit(root=>{const node=this.current(root)!;if(value)node[key]=value;else delete node[key];});}
 setNumber(key:string,value:any,min?:number,integer=false,strictPositive=false){
  this.error='';
  if(value===''||value===null||value===undefined){this.commit(root=>{delete this.current(root)![key];});return;}
  const n=Number(value);
  if(!Number.isFinite(n)||(min!==undefined&&n<min)||(integer&&!Number.isInteger(n))||(strictPositive&&n<=0)){this.error='Número inválido para '+key;return;}
  this.commit(root=>{this.current(root)![key]=n;});
 }
 setPattern(value:string){
  this.error='';
  if(value){try{new RegExp(value);}catch{this.error='Expressão regular inválida.';return;}}
  this.setOptional('pattern',value);
 }
 setBoolean(key:string,value:boolean){this.error='';this.commit(root=>{this.current(root)![key]=value;});}
 trackEnumIndex(index:number){return index;}
 enumEntries(node:Schema):{value:any;label:string}[]{return (node.enum||[]).map((value:any,index:number)=>({value,label:node['x-enumLabels']?.[index]??String(value)}));}
 enumValueText(value:any,_node:Schema):string{return value===undefined?'':String(value);}
 private enumValueOf(text:string,node:Schema):any{
  const type=Array.isArray(node.type)?node.type[0]:node.type;
  if(type==='integer'||type==='number'){
   if(text.trim()==='')throw new Error('Informe um número.');
   const number=Number(text);
   if(!Number.isFinite(number)||(type==='integer'&&!Number.isInteger(number)))throw new Error(type==='integer'?'Informe um número inteiro válido.':'Informe um número válido.');
   return number;
  }
  return text;
 }
 private changeEnumEntries(entries:{value:any;label:string}[]){
  if(entries.some((entry,index)=>entries.findIndex(other=>Object.is(other.value,entry.value))!==index)){this.error='Valores duplicados não são permitidos.';return;}
  this.error='';
  this.commit(root=>{const node=this.current(root)!;if(!entries.length){delete node.enum;delete node['x-enumLabels'];return;}
   node.enum=entries.map(entry=>entry.value);
   node['x-enumLabels']=entries.map(entry=>entry.label||String(entry.value));
  });
 }
 addEnumEntry(){const node=this.selected!;const type=Array.isArray(node.type)?node.type[0]:node.type;const entries=this.enumEntries(node);let value:any=type==='integer'||type==='number'?0:'';if(type==='integer'||type==='number'){while(entries.some(entry=>Object.is(entry.value,value)))value++;}else{let suffix=entries.length+1;value='VALOR_'+suffix;while(entries.some(entry=>entry.value===value))value='VALOR_'+ ++suffix;}
  this.changeEnumEntries([...entries,{value,label:String(value)}]);}
 updateEnumEntry(index:number,kind:'value'|'label',text:string){const node=this.selected!;const entries=this.enumEntries(node);if(!entries[index])return;
  try{const previous=entries[index];entries[index]={...previous,[kind]:kind==='value'?this.enumValueOf(text,node):text};if(kind==='value'&&previous.label===String(previous.value))entries[index].label=String(entries[index].value);this.changeEnumEntries(entries);}
  catch(error){this.error=error instanceof Error?error.message:String(error);}
 }
 removeEnumEntry(index:number){const entries=this.enumEntries(this.selected!);entries.splice(index,1);this.changeEnumEntries(entries);}
 enumText(node:Schema):string{return Array.isArray(node.enum)?node.enum.map((v:any)=>JSON.stringify(v)).join('\n'):'';}
 setEnum(text:string){
  this.error='';
  try{
   const values=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>JSON.parse(line));
   if(values.some((v,i)=>values.findIndex(other=>JSON.stringify(other)===JSON.stringify(v))!==i))throw new Error('Valores duplicados.');
   this.commit(root=>{const node=this.current(root)!;if(values.length)node.enum=values;else delete node.enum;});
  }catch(e){this.error='Enum inválido: '+(e instanceof Error?e.message:String(e));}
 }
 advancedText(node:Schema):string{
  const keys=['if','then','else','allOf','oneOf','anyOf','not','$defs','$ref','patternProperties','propertyNames','dependentRequired','dependentSchemas','unevaluatedProperties','contains','minContains','maxContains','prefixItems'];
  return JSON.stringify(Object.fromEntries(keys.filter(key=>Object.prototype.hasOwnProperty.call(node,key)).map(key=>[key,node[key]])),null,2);
 }
 setAdvanced(text:string){
  this.error='';
  try{
   const parsed=JSON.parse(text||'{}');
   if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Informe um objeto JSON.');
   const keys=['if','then','else','allOf','oneOf','anyOf','not','$defs','$ref','patternProperties','propertyNames','dependentRequired','dependentSchemas','unevaluatedProperties','contains','minContains','maxContains','prefixItems'];
   const unknown=Object.keys(parsed).filter(key=>!keys.includes(key));
   if(unknown.length)throw new Error('Atributos não permitidos nesta seção: '+unknown.join(', '));
   this.commit(root=>{
    const node=this.current(root)!;
    for(const key of keys)delete node[key];
    Object.assign(node,parsed);
   });
  }catch(e){this.error='Regras avançadas inválidas: '+(e instanceof Error?e.message:String(e));}
 }
 addComposition(kind:string){
  this.error='';
  this.commit(root=>{
   const node=this.current(root)!;
   if(!Array.isArray(node[kind]))node[kind]=[];
   node[kind].push({type:'object',properties:{}});
   this.selectedPath+='/'+kind+'/'+(node[kind].length-1);
  });
 }
 removeComposition(kind:string,index:number){
  this.error='';
  this.commit(root=>{
   const node=this.current(root)!;
   if(!Array.isArray(node[kind])||index<0||index>=node[kind].length)return;
   node[kind].splice(index,1);
   if(!node[kind].length)delete node[kind];
  });
 }
 toggleConditional(kind:string){
  this.error='';
  this.commit(root=>{
   const node=this.current(root)!;
   if(node[kind]===undefined){node[kind]={type:'object',properties:{}};this.selectedPath+='/'+kind;}
   else delete node[kind];
  });
 }
 setType(type:string){this.commit(root=>{this.current(root)!.type=type;});}
 setRequired(checked:boolean){
  this.commit(root=>{
   const parts=this.segments(this.selectedPath),name=parts.pop()!;
   if(parts.pop()!=='properties')return;
   const parent=this.getNodeAt(root,'/'+parts.map(p=>this.escape(p)).join('/'));
   if(!parent)return;
   const required=new Set<string>(parent.required||[]);
   if(checked)required.add(name);else required.delete(name);
   if(required.size)parent.required=[...required];else delete parent.required;
  });
 }
 propertyNameDraft:string|null=null;
 propertyNameError='';
 onPropertyNameInput(name:string){this.propertyNameDraft=name;this.propertyNameError='';}
 validatePropertyName(){if(this.propertyNameDraft===null){this.propertyNameError='';return true;}const name=this.propertyNameDraft;const parts=this.segments(this.selectedPath),old=parts.pop()||'';if(parts.pop()!=='properties')return true;const parentPath='/'+parts.map(p=>this.escape(p)).join('/');const parent=this.getNodeAt(this.schema,parentPath);if(!name.trim()){this.propertyNameError='Informe o nome da propriedade.';return false;}if(name!==old&&Object.prototype.hasOwnProperty.call(parent?.properties||{},name)){this.propertyNameError='Já existe uma propriedade com esse nome.';return false;}this.propertyNameError='';return true;}
 commitPropertyName(){if(this.propertyNameDraft===null)return; if(!this.validatePropertyName())return;const name=this.propertyNameDraft;this.propertyNameDraft=null;this.renameSelected(name);}
 renameSelected(name:string){
  this.error='';
  if(!name){this.error='Informe o nome da propriedade.';return;}
  const parts=this.segments(this.selectedPath),old=parts.pop()!;
  if(parts.pop()!=='properties'||name===old)return;
  const parentPath='/'+parts.map(p=>this.escape(p)).join('/');
  const parent=this.getNodeAt(this.schema,parentPath);
  if(!parent?.properties?.[old]||Object.prototype.hasOwnProperty.call(parent.properties,name)){this.error='Já existe uma propriedade com esse nome.';return;}
  this.commit(root=>{
   const target=this.getNodeAt(root,parentPath)!;
   const entries=Object.entries(target.properties).map(([k,v])=>[k===old?name:k,v]);
   target.properties=Object.fromEntries(entries);
   if(target.required)target.required=target.required.map((k:string)=>k===old?name:k);

   this.selectedPath=parentPath+'/properties/'+this.escape(name);
  });
 }
 removeSelected(){
  if(!this.selectedPath)return;
  const path=this.selectedPath;
  const parts=this.segments(path);
  const last=parts.pop()!;
  let parentPath='';
  let kind='';let key=last;
  if(parts.at(-1)==='properties'){parts.pop();kind='properties';}
  else if(parts.at(-1)&&this.compositionKinds.includes(parts.at(-1)!)){kind=parts.pop()!;}
  else if(parts.at(-1)==='$defs'||parts.at(-1)==='patternProperties'){kind=parts.pop()!;}
  else if(last==='items')kind='items';
  else if(last==='additionalProperties')kind='additionalProperties';
  else if(this.conditionalKinds.includes(last))kind='conditional';
  else {this.error='Não é possível excluir este nó.';return;}
  parentPath=parts.length?'/'+parts.map(p=>this.escape(p)).join('/'):'';
  this.error='';
  this.commit(root=>{
   const parent=this.getNodeAt(root,parentPath);
   if(!parent)return;
   if(kind==='properties'){
    delete parent.properties?.[key];

    if(parent.required){parent.required=parent.required.filter((x:string)=>x!==key);if(!parent.required.length)delete parent.required;}
   }else if(kind==='items')delete parent.items;
   else if(kind==='conditional')delete parent[key];
   else if(kind==='additionalProperties')parent.additionalProperties=true;
   else if(kind==='$defs'||kind==='patternProperties'){delete parent[kind]?.[key];if(parent[kind]&&!Object.keys(parent[kind]).length)delete parent[kind];}
   else if(Array.isArray(parent[kind])){
    parent[kind].splice(Number(key),1);
    if(!parent[kind].length)delete parent[kind];
   }
   this.selectedPath=parentPath;
  });
 }
}
