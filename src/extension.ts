'use strict';
import * as vscode from 'vscode';
import * as cp from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    console.log("HIRL extension is now active");

    // Create a linter class instance and its controller
    let linter = new HirlLinter();
    let linterController = new HirlLinterController(linter);

    // Register the linter
    context.subscriptions.push(linter);
    context.subscriptions.push(linterController);
}

export function deactivate() {}

// Performs HIRL language linting
class HirlLinter {
    private diagnosticsCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticsCollection = vscode.languages.createDiagnosticCollection();
    }

    // Does the actual linting
    public lint(doc: vscode.TextDocument) {
        // if (doc.languageId !== "hirl") return;

        // Get configuration
        const config = vscode.workspace.getConfiguration("hirl-extension");
        if (config.compilerPath === null || config.compilerPath === "") {
            vscode.window.showErrorMessage( "HIRL Extension: hirl-extension.compilerPath must be set!" );
            return;
        }

        // These are diagnostic messages for this file
        let diagnostics : vscode.Diagnostic[] = [];

        // Compiler arguments
        let compilerArguments = [doc.fileName];

        // Spawn the compiler process
        let compilerProcess = cp.spawn(
            config.compilerPath,
            compilerArguments,
            {}
        );

        // If the validator is running
        if (compilerProcess.pid)
        {
            let compilerOutput = "";
            compilerProcess.stdout.on("data", (data: Buffer) => compilerOutput += data);

            // When validator finishes its job (closes stream)
            compilerProcess.stdout.on("close", () =>
            {
                //let lines = compilerOutput.toString( ).split( /(?:\r\n|\r|\n)/g );
                let compilerMessages = compilerOutput.toString().split('\n').map((message) => JSON.parse(message));

                // Run analysis for each output line
                compilerMessages.forEach(compilerMessage =>
                {
                    // Determine the severity of the error
                    let severity : vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Hint;
                    if (compilerMessage.severity === "error") {
                        severity = vscode.DiagnosticSeverity.Error;
                    }
                    else if (compilerMessage.severity === "warning") {
                        severity = vscode.DiagnosticSeverity.Warning;
                    }

                    // Check if the line contained an error information
                    // Hint severity is used as "no error" here
                    if (severity !== vscode.DiagnosticSeverity.Hint)
                    {
                        let startPosition = doc.positionAt(compilerMessage.labels.span.offset);
                        let endPosition = doc.positionAt(compilerMessage.labels.span.offset + compilerMessage.labels.span.length);

                        // Create a diagnostic message
                        let where = new vscode.Range(
                            startPosition.line,
                            startPosition.character,
                            endPosition.line,
                            endPosition.character
                        );
                        let diag = new vscode.Diagnostic(where, compilerMessage.message, severity);
                        diagnostics.push(diag);
                    }
                } );

                // After the output is processed, push the new diagnostics to collection
                this.diagnosticsCollection.set(doc.uri, diagnostics);
            } );
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

// Controls the HirlLinter class
class HirlLinterController
{
    private _linter: HirlLinter;
    private _disposable: vscode.Disposable;

    // Creates a new linter controller
    constructor(linter: HirlLinter)
    {
        this._linter = linter;

        let subscriptions: vscode.Disposable[] = [];

        // Linter triggers
        vscode.workspace.onDidOpenTextDocument( this.lintTrigger, this, subscriptions );
        vscode.workspace.onDidSaveTextDocument( this.lintTrigger, this, subscriptions );

        this._disposable = vscode.Disposable.from(...subscriptions);
    }

    // Dispose method
    dispose() {
        this._disposable.dispose();
    }

    // Executed whenever linting shall be done
    private lintTrigger() {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            this._linter.lint(editor.document);
        }
    }
}
