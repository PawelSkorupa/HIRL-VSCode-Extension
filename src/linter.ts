"use strict";
import * as vscode from "vscode";
import * as cp from "child_process";

interface messageLabel {
  label: string;
  span: {
    offset: number;
    length: number;
  };
}

export class HirlLinter {
  private diagnosticsCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticsCollection = vscode.languages.createDiagnosticCollection();
  }

  public lint(doc: vscode.TextDocument) {
    if (doc.languageId !== "hirl") return;

    const config = vscode.workspace.getConfiguration("hirl-extension");
    if (config.compilerPath === null || config.compilerPath === "") {
      vscode.window.showErrorMessage(
        "HIRL Extension: hirl-extension.compilerPath must be set!"
      );
      return;
    }

    let diagnostics: vscode.Diagnostic[] = [];

    let compilerArguments = ["-o output.sv", "--json-report", doc.fileName];

    let compilerProcess = cp.spawn(config.compilerPath, compilerArguments, {});

    if (compilerProcess.pid) {
      let compilerOutput = "";
      compilerProcess.stdout.on(
        "data",
        (data: Buffer) => (compilerOutput += data)
      );

      compilerProcess.stdout.on("close", () => {
        let compilerMessages = compilerOutput
          .toString()
          .split("\n")
          .filter((message) => message.length > 0)
          .map((message) => JSON.parse(message));

        compilerMessages.forEach((compilerMessage) => {
          let severity: vscode.DiagnosticSeverity =
            vscode.DiagnosticSeverity.Hint;
          if (compilerMessage.severity === "error") {
            severity = vscode.DiagnosticSeverity.Error;
          } else if (compilerMessage.severity === "warning") {
            severity = vscode.DiagnosticSeverity.Warning;
          }

          if (severity !== vscode.DiagnosticSeverity.Hint) {
            compilerMessage.labels.forEach((label: messageLabel) => {
              let startPosition = doc.positionAt(label.span.offset);
              let endPosition = doc.positionAt(
                label.span.offset + label.span.length
              );

              let where = new vscode.Range(
                startPosition.line,
                startPosition.character,
                endPosition.line,
                endPosition.character
              );

              let diag = new vscode.Diagnostic(
                where,
                compilerMessage.message + "\n" + label.label,
                severity
              );
              diagnostics.push(diag);
            });
          }
        });

        // After the output is processed, push the new diagnostics to collection
        this.diagnosticsCollection.set(doc.uri, diagnostics);
      });
    } else {
      vscode.window.showErrorMessage(
        "HIRL Extension: failed to run HIRL compiler!"
      );
      return;
    }
  }

  dispose() {
    this.diagnosticsCollection.clear();
    this.diagnosticsCollection.dispose();
  }
}

export class HirlLinterController {
  private _linter: HirlLinter;
  private _disposable: vscode.Disposable;

  constructor(linter: HirlLinter) {
    this._linter = linter;

    let subscriptions: vscode.Disposable[] = [];

    vscode.workspace.onDidOpenTextDocument(
      this.lintTrigger,
      this,
      subscriptions
    );
    vscode.workspace.onDidSaveTextDocument(
      this.lintTrigger,
      this,
      subscriptions
    );

    this._disposable = vscode.Disposable.from(...subscriptions);
  }

  dispose() {
    this._disposable.dispose();
  }

  private lintTrigger() {
    let editor = vscode.window.activeTextEditor;
    if (editor) {
      this._linter.lint(editor.document);
    }
  }
}
