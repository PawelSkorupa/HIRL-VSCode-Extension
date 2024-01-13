"use strict";
import * as vscode from "vscode";
import {
  controlKeywords,
  types,
  typeModifiers,
  functions,
  illegals,
  constants,
  specialRegisterInputs,
} from "./keywords";

export function provideCompletions(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  const linePrefix = document
    .lineAt(position)
    .text.slice(0, position.character);
  const isAfterTypeKeyword = types.some((type) =>
    linePrefix.endsWith(type + " ")
  );

  if (isAfterTypeKeyword) {
    const modifierCompletions = typeModifiers.map((modifier) => {
      const completion = new vscode.CompletionItem(
        modifier,
        vscode.CompletionItemKind.Keyword
      );
      completion.insertText = modifier + " ";
      return completion;
    });

    return modifierCompletions;
  } else {
    const typeCompletions = types.map((type) => {
      const completion = new vscode.CompletionItem(
        type,
        vscode.CompletionItemKind.Keyword
      );
      completion.insertText = type + " ";
      completion.command = {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      };
      return completion;
    });

    const controlKeywordCompletions = controlKeywords.map((keyword) => {
      const completion = new vscode.CompletionItem(
        keyword,
        vscode.CompletionItemKind.Keyword
      );
      return completion;
    });

    const functionCompletions = functions.map((func) => {
      const completion = new vscode.CompletionItem(
        func,
        vscode.CompletionItemKind.Function
      );
      return completion;
    });

    const illegalCompletions = illegals.map((illegal) => {
      const completion = new vscode.CompletionItem(
        illegal,
        vscode.CompletionItemKind.Keyword
      );
      completion.detail = "Illegal keyword";
      return completion;
    });

    const constantCompletions = constants.map((constant) => {
      const completion = new vscode.CompletionItem(
        constant,
        vscode.CompletionItemKind.Constant
      );
      return completion;
    });

    const specialRegisterInputCompletions = specialRegisterInputs.map(
      (input) => {
        const completion = new vscode.CompletionItem(
          input,
          vscode.CompletionItemKind.Field
        );
        return completion;
      }
    );

    return [
      ...typeCompletions,
      ...controlKeywordCompletions,
      ...functionCompletions,
      ...illegalCompletions,
      ...constantCompletions,
      ...specialRegisterInputCompletions,
    ];
  }
}
