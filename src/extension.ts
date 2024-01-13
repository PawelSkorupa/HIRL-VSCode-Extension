"use strict";
import * as vscode from "vscode";

import { formatDocument } from "./formatter";
import { HirlLinter, HirlLinterController } from "./linter";
import { provideCompletions } from "./completionProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log("HIRL extension is now active");

  let linter = new HirlLinter();
  let linterController = new HirlLinterController(linter);

  const formatter = vscode.languages.registerDocumentFormattingEditProvider(
    "hirl",
    {
      provideDocumentFormattingEdits(
        document: vscode.TextDocument
      ): vscode.TextEdit[] {
        return formatDocument(document);
      },
    }
  );

  const completionProvider = vscode.languages.registerCompletionItemProvider(
    "hirl",
    {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
      ) {
        return provideCompletions(document, position);
      },
    }
  );

  context.subscriptions.push(linter);
  context.subscriptions.push(linterController);
  context.subscriptions.push(formatter);
  context.subscriptions.push(completionProvider);
}

export function deactivate() {}
