'use strict';
import * as vscode from 'vscode';
import * as CompletionItemsCache from "./completion_items_cache";


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // On activation create a cache of all files in the system.
    CompletionItemsCache.refresh();

    // Whenever there is a change to the workspace folders refresh the cache
    // #Perf: This could be optimized if it proves to be slow but I assume it is rare
    let workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(workspaceChangeEvent => {
        CompletionItemsCache.refresh();
    });
    
    // Whenever a file is added or removed refresh the cache
    // #Perf: This could be optimized
    let fileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/*.ts", false, true, false);
    fileSystemWatcher.onDidCreate(uri => {
        CompletionItemsCache.refresh();
    });
    fileSystemWatcher.onDidDelete(uri => {
        CompletionItemsCache.refresh();
    });

    let provider = vscode.languages.registerCompletionItemProvider({ scheme: "file", language: "typescript" }, {
        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
            const word = document.getText(document.getWordRangeAtPosition(position));
            // #Perf: To avoid unnecessary completions, only offer completions if 2 charaters are typed
            if (word.length < 2) {
                return [];
            }

            return CompletionItemsCache.get(document.uri);
        }
    });

    context.subscriptions.push(provider, fileSystemWatcher, workspaceWatcher);
}

// this method is called when your extension is deactivated
export function deactivate() {
}