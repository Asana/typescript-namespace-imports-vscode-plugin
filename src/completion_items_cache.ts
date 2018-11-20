import * as vscode from 'vscode';
import { uriToCompletionItem } from './uri_helpers';

/**
 * Keep a list of the completion items for each workspaceFolder at all times.
 * 
 * #Perf: Consider splitting each workspace's list into a map based on the 
 * first 2 characters of each module if it is slow
 */
let workspaceCompletionItems: vscode.CompletionList[] = [];

export function refresh() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders === undefined) {
        console.warn("No workspace folder. typescript-namespace-imports-vscode-plugin will not work");
        return;
    }
    workspaceCompletionItems = workspaceFolders.map(workspaceFolder => new vscode.CompletionList([], true));
    workspaceFolders.forEach(workspaceFolder => {
        const relativePattern = new vscode.RelativePattern(workspaceFolder, "**/*.ts");
        vscode.workspace.findFiles(relativePattern).then(
            uris => {
                const completionItems = uris.map(uri => uriToCompletionItem(uri));
                workspaceCompletionItems[workspaceFolder.index] = new vscode.CompletionList(completionItems, false);
            },
            error => {
                console.error("Error in updateWorkspaceCompletionItems: " + error);
            });
    });
}

export function get(documentUri: vscode.Uri) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
    if (workspaceFolder === undefined) {
        console.error("URI in undefined workspaceFolder", documentUri);
        return [];
    }

    const completionList = workspaceCompletionItems[workspaceFolder.index];
    if (completionList === undefined) {
        console.error("WorkspaceFolder not in list", workspaceFolder.uri);
        return [];
    }

    return completionList;
}