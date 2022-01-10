import * as vscode from "vscode";

export interface CompletionItemsCache {
    handleWorkspaceChange: (event: vscode.WorkspaceFoldersChangeEvent) => void;
    addFile: (uri: vscode.Uri) => void;
    deleteFile: (uri: vscode.Uri) => void;
    getCompletionList: (currentUri: vscode.Uri, query: string) => vscode.CompletionList | [];
}
