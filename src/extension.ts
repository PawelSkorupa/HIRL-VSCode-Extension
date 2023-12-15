'use strict';
import * as vscode from 'vscode';
import * as cp from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    console.log("HIRL extension is now active");

    let linter = new HirlLinter();
    let linterController = new HirlLinterController(linter);

    context.subscriptions.push(linter);
    context.subscriptions.push(linterController);

    vscode.languages.registerDocumentFormattingEditProvider('hirl', {
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
            let edits: vscode.TextEdit[] = [];
            
            const config = vscode.workspace.getConfiguration("hirl-extension");
            const tabSize = config.tabSize != null ? config.tabSize : 2;

            let indentationLevel = 0;
            let isCommented: boolean = false;

            for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
                const line = document.lineAt(lineIndex);

                if (line.text.includes('/*')) {
                    isCommented = true;
                }
                if (line.text.includes('*/')) {
                    isCommented = false;
                }
                if (isCommented) continue;

                let desiredIndentation = ' '.repeat(tabSize * indentationLevel);

                const openBracketCount = (line.text.match(/[({[]/g) || []).length;
                const closeBracketCount = (line.text.match(/[)}\]]/g) || []).length;
                const bracketBalance = openBracketCount - closeBracketCount;

                indentationLevel += bracketBalance;

                const trimmedLine = line.text.trim();
            
                if (trimmedLine.replace(new RegExp('\\)', 'g'), '')
                    .replace(new RegExp('\\}', 'g'), '')
                    .replace(new RegExp('\\]', 'g'), '')
                    .replace(new RegExp('\\;', 'g'), '') === '') {
                    desiredIndentation = desiredIndentation.substring(0, desiredIndentation.length - tabSize);
                }
                const editText = desiredIndentation + trimmedLine;

                const editRange = new vscode.Range(lineIndex, 0, lineIndex, line.text.length);
                const edit = vscode.TextEdit.replace(editRange, editText);
                edits.push(edit);
            }

            return edits;
        }
    });

}

export function deactivate() { }

interface messageLabel {
    label: string;
    span: {
        offset: number;
        length: number;
    };
}

class HirlLinter {
    private diagnosticsCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticsCollection = vscode.languages.createDiagnosticCollection();
    }

    public lint(doc: vscode.TextDocument) {
        if (doc.languageId !== "hirl") return;

        const config = vscode.workspace.getConfiguration("hirl-extension");
        if (config.compilerPath === null || config.compilerPath === "") {
            vscode.window.showErrorMessage( "HIRL Extension: hirl-extension.compilerPath must be set!" );
            return;
        }

        let diagnostics: vscode.Diagnostic[] = [];

        let compilerArguments = ["--json-report", doc.fileName];

        let compilerProcess = cp.spawn(
            config.compilerPath,
            compilerArguments,
            {}
        );

        if (compilerProcess.pid)
        {
            let compilerOutput = "";
            compilerProcess.stdout.on("data", (data: Buffer) => compilerOutput += data);

            compilerProcess.stdout.on("close", () =>
            {
                let compilerMessages = compilerOutput.toString()
                    .split('\n').filter((message) => message.length > 0)
                    .map((message) => JSON.parse(message));

                compilerMessages.forEach(compilerMessage =>
                {
                    let severity : vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Hint;
                    if (compilerMessage.severity === "error") {
                        severity = vscode.DiagnosticSeverity.Error;
                    }
                    else if (compilerMessage.severity === "warning") {
                        severity = vscode.DiagnosticSeverity.Warning;
                    }

                    if (severity !== vscode.DiagnosticSeverity.Hint)
                    {
                        compilerMessage.labels.forEach((label: messageLabel) => {
                            let startPosition = doc.positionAt(label.span.offset);
                            let endPosition = doc.positionAt(label.span.offset + label.span.length);

                            let where = new vscode.Range(
                                startPosition.line,
                                startPosition.character,
                                endPosition.line,
                                endPosition.character
                            );
    
                            let diag = new vscode.Diagnostic(where, compilerMessage.message + "\n" + label.label, severity);
                            diagnostics.push(diag);
                        });
                    }
                });

                // After the output is processed, push the new diagnostics to collection
                this.diagnosticsCollection.set(doc.uri, diagnostics);
            });
        }
        else {
            vscode.window.showErrorMessage("HIRL Extension: failed to run HIRL compiler!");
            return;
        }
    }

    dispose() {
        this.diagnosticsCollection.clear();
        this.diagnosticsCollection.dispose();
    }
}

class HirlLinterController
{
    private _linter: HirlLinter;
    private _disposable: vscode.Disposable;

    constructor(linter: HirlLinter)
    {
        this._linter = linter;

        let subscriptions: vscode.Disposable[] = [];

        vscode.workspace.onDidOpenTextDocument(this.lintTrigger, this, subscriptions);
        vscode.workspace.onDidSaveTextDocument(this.lintTrigger, this, subscriptions);

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
