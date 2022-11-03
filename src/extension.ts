"use strict";
import * as vscode from "vscode";
import { CompletionItemsCache } from "./completion_items_cache";
import { CompletionItemsCacheImpl } from "./completion_items_cache_impl";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
        console.warn(
            "No workspace folder. typescript-namespace-imports-vscode-plugin will not work"
        );
        return;
    }

    const moduleCompletionItemsCache: CompletionItemsCache = new CompletionItemsCacheImpl(
        workspaceFolders
    );

    // Whenever there is a change to the workspace folders refresh the cache
    const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(
        moduleCompletionItemsCache.handleWorkspaceChange
    );

    // Whenever a file is added or removed refresh the cache
    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
        "**/*.{ts,tsx}",
        false,
        true,
        false
    );
    fileSystemWatcher.onDidCreate(moduleCompletionItemsCache.addFile);
    fileSystemWatcher.onDidDelete(moduleCompletionItemsCache.deleteFile);

    const provider = vscode.languages.registerCompletionItemProvider(
        [
            { scheme: "file", language: "typescript" },
            { scheme: "file", language: "typescriptreact" },
        ],
        {
            provideCompletionItems(doc: vscode.TextDocument, position: vscode.Position) {
                const wordRange = doc.getWordRangeAtPosition(position);
                if (wordRange === undefined) {
                    return new vscode.CompletionList([], true);
                }

                const word = doc.getText(wordRange);

                return moduleCompletionItemsCache.getCompletionList(doc.uri, word);
            },
        }
    );

    context.subscriptions.push(provider, fileSystemWatcher, workspaceWatcher);
}

// this method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
