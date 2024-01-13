"use strict";
import * as vscode from "vscode";

import { formatter } from "./formatter";
import { HirlLinter, HirlLinterController } from "./linter";

export function activate(context: vscode.ExtensionContext) {
  console.log("HIRL extension is now active");

  let linter = new HirlLinter();
  let linterController = new HirlLinterController(linter);

  context.subscriptions.push(linter);
  context.subscriptions.push(linterController);

  vscode.languages.registerDocumentFormattingEditProvider("hirl", {
    provideDocumentFormattingEdits(
      document: vscode.TextDocument
    ): vscode.TextEdit[] {
      return formatter(document);
    },
  });
}

export function deactivate() {}
