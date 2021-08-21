import * as vscode from "vscode";
import { AdonisFileInfo as AdonisFileInfo } from "../domain/AdonisFileInfo";

export default class DocumentWriterGateway {
  #textEditor: vscode.TextEditor;

  constructor(textEditor: vscode.TextEditor) {
    this.#textEditor = textEditor;
  }

  async writeImportStatement<T extends vscode.QuickPickItem>(classInfo: AdonisFileInfo) {
    console.warn("Class Data:", classInfo);
    const importText = this.#generateImportText(
      classInfo
    );

    console.warn("Import Test:", importText);
    const hasUseStrict = this.#textEditor.document.lineAt(1).text.includes('strict');

    const lineToInsert = this.getLineToInsert(this.#textEditor.document, hasUseStrict, classInfo);
    const lineToInsertTypeDef = this.getLineToTypeDef(this.#textEditor.document, hasUseStrict, classInfo);
    if (lineToInsertTypeDef) {
      this.#textEditor.edit((editBuilder: vscode.TextEditorEdit) => {
        // to avoid 'use-strict' area
        editBuilder.insert(new vscode.Position(lineToInsertTypeDef, 0), this.#generateTypedef(classInfo));
      });
    }
    if (lineToInsert) {
      this.#textEditor.edit((editBuilder: vscode.TextEditorEdit) => {
        // to avoid 'use-strict' area
        editBuilder.insert(new vscode.Position(lineToInsert, 0), importText);
      });
    }
  }
  private getLineToTypeDef(textDocument: vscode.TextDocument, isUseStrictFile: boolean, classInfo: AdonisFileInfo) {
    const AFTER_USE_STRICT = 2;
    const FIRST_LINE = 1;
    const INITIAL_LINE = isUseStrictFile ? AFTER_USE_STRICT : FIRST_LINE;
    const lineToInsert = INITIAL_LINE;
    let idxLine = 1;
    let firstLineEmpty = null;
    let firstTypedefImport = null;
    let allreadyImport = null;
    while (idxLine < textDocument.lineCount) {
      const currentLine = textDocument.lineAt(idxLine);
      if (currentLine.isEmptyOrWhitespace && !firstLineEmpty) {
        firstLineEmpty = idxLine; // line to insert is equal empty_line `-1`
      }
      if (currentLine.text.match(/typedef/mi) && !firstTypedefImport) {
        firstTypedefImport = idxLine; // line to insert is equal empty_line `-1`
      }
      const typedefRegex = '@typedef.*' + classInfo.name + '.*' + classInfo.onlyName() + ".*\\*\\/$";
      // eslint-disable-next-line no-useless-escape
      if (currentLine.text.match(RegExp(typedefRegex, "mi")) && !allreadyImport) {
        allreadyImport = idxLine; // line to insert is equal empty_line `-1`
      }
      idxLine++;
    }
    if (allreadyImport) {
      return null;
    } else {
      if (firstTypedefImport) {
        return firstTypedefImport;
      } else {
        if (firstLineEmpty) {
          return firstLineEmpty;

        }
      }
    }
    return lineToInsert;
  }

  private getLineToInsert(textDocument: vscode.TextDocument, isUseStrictFile: boolean, classInfo: AdonisFileInfo) {
    const AFTER_USE_STRICT = 2;
    const FIRST_LINE = 1;
    const INITIAL_LINE = isUseStrictFile ? AFTER_USE_STRICT : FIRST_LINE;
    const lineToInsert = INITIAL_LINE;
    let idxLine = 1;
    let firstClassOrExport = null;
    let lastUseOrRequire = null;
    let firstEmtpyLine = null;
    while (lineToInsert === INITIAL_LINE && idxLine < textDocument.lineCount) {
      const currentLine = textDocument.lineAt(idxLine);

      if (currentLine.text.includes(classInfo.getUsePath())) {
        return null;
      }

      if (currentLine.isEmptyOrWhitespace && !firstEmtpyLine) {
        firstEmtpyLine = idxLine; // line to insert is equal empty_line `-1`
      }

      if (currentLine.text.match(/(= use)|(= require)/mi)) {
        lastUseOrRequire = idxLine + 1; // line to insert is equal empty_line `-1`
      }
      if (currentLine.text.match(/(class)|(export)|({\n)/mi) && !firstClassOrExport) {
        firstClassOrExport = idxLine; // line to insert is equal empty_line `-1`
      }
      idxLine++;
    }
    if (lastUseOrRequire) {
      return lastUseOrRequire;
    }
    else {
      if (firstClassOrExport) return firstClassOrExport - 1;
      else {
        if (firstEmtpyLine) return firstEmtpyLine;
      }

    }

    return lineToInsert;
  }

  #generateTypedef(classInfo: AdonisFileInfo) {

    const currentFilePath = this.#textEditor.document.uri.fsPath;
    const realPath = classInfo.getRelativePathToFolder(currentFilePath);

    const template = `/** @typedef {import('${realPath}')} ${classInfo.onlyName()}*/
`;
    return template;
  }
  #generateImportText(classInfo: AdonisFileInfo): any {

    const usePath = classInfo.getUsePath();
    const currentFilePath = this.#textEditor.document.uri.fsPath;
    const realPath = classInfo.getRelativePathToFolder(currentFilePath);

    const template = `
/** @type {${classInfo.onlyName()}}*/
const ${classInfo.onlyName()} = use('${usePath}')
`;
    return template;
  }
}
