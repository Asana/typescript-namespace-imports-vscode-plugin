import { CompletionItemMap } from "./completion_item_map";
import * as vscode from "vscode";

/**
 * Map from the first char of CompletionItem.label to vscode.CompletionItem[]
 * 
 * TODO: This makes intellisense quick even in large projects, but a more elegant
 * solution might be some type of trie tree.
 */
export class CompletionItemMapImpl implements CompletionItemMap {
    private _map: Record<string, vscode.CompletionItem[]> = {};

    constructor(
        items: vscode.CompletionItem[],
        private _getKey: (item: vscode.CompletionItem) => string
    ) {
        for (const item of items) {
            this.putItem(item);
        }
    }

    putItem = (item: vscode.CompletionItem): vscode.CompletionItem => {
        const key = this._getKey(item);
        this._map[key] = this._map[key] ? [...this._map[key], item] : [item];
        return item;
    };

    getItemsAt = (key: string): vscode.CompletionItem[] => {
        const maybeItems = this._map[key];

        return maybeItems || [];
    };

    removeItem = (item: vscode.CompletionItem): void => {
        const key = this._getKey(item);
        const maybeItems = this._map[key];

        if (maybeItems) {
            this._map[key] = maybeItems.filter(i => i !== item);
        }
    };
}
