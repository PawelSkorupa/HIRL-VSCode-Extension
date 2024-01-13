"use strict";
import * as vscode from "vscode";

export function formatDocument(
  document: vscode.TextDocument
): vscode.TextEdit[] {
  let edits: vscode.TextEdit[] = [];

  const config = vscode.workspace.getConfiguration("hirl-extension");
  const tabSize = config.tabSize != null ? config.tabSize : 2;

  let indentationLevel = 0;
  let isCommented: boolean = false;

  for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
    const line = document.lineAt(lineIndex);

    if (line.text.includes("/*")) {
      isCommented = true;
    }
    if (line.text.includes("*/")) {
      isCommented = false;
    }
    if (isCommented) continue;

    let desiredIndentation = " ".repeat(tabSize * indentationLevel);

    const openBracketCount = (line.text.match(/[({[]/g) || []).length;
    const closeBracketCount = (line.text.match(/[)}\]]/g) || []).length;
    const bracketBalance = openBracketCount - closeBracketCount;

    indentationLevel += bracketBalance;

    const trimmedLine = line.text.trim();

    if (
      trimmedLine
        .replace(new RegExp("\\)", "g"), "")
        .replace(new RegExp("\\}", "g"), "")
        .replace(new RegExp("\\]", "g"), "")
        .replace(new RegExp("\\;", "g"), "") === ""
    ) {
      desiredIndentation = desiredIndentation.substring(
        0,
        desiredIndentation.length - tabSize
      );
    }
    const editText = desiredIndentation + trimmedLine;

    const editRange = new vscode.Range(
      lineIndex,
      0,
      lineIndex,
      line.text.length
    );
    const edit = vscode.TextEdit.replace(editRange, editText);
    edits.push(edit);
  }

  return edits;
}
