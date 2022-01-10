import * as vscode from "vscode";

export interface CompletionItemMap {
    putItem(item: vscode.CompletionItem): vscode.CompletionItem;
    getItemsAt(key: string): vscode.CompletionItem[];
    removeItem(item: vscode.CompletionItem): void;
}
