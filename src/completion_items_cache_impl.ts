import * as vscode from "vscode";
import { uriToCompletionItem } from "./uri_helpers";
import * as Path from "path";
import * as ts from "typescript";
import { CompletionItemsCache } from "./completion_items_cache";
import { CompletionItemMap } from "./completion_item_map";
import { CompletionItemMapImpl } from "./completion_item_map_impl";

/**
 * Creates a cache of module completion items backed by map that is split by the first character
 * of each module name
 */
export class CompletionItemsCacheImpl implements CompletionItemsCache {
    private _cache: Record<string, CompletionItemMap> = {};

    constructor(workspaceFolders: readonly vscode.WorkspaceFolder[]) {
        workspaceFolders.forEach(this._addWorkspace);
    }

    handleWorkspaceChange = (event: vscode.WorkspaceFoldersChangeEvent): void => {
        event.added.forEach(this._addWorkspace);
        event.removed.forEach(this._removeWorkspace);
    };

    addFile = (uri: vscode.Uri) => {
        const workspace = this._getWorkspaceFolderFromUri(uri);
        if (workspace) {
            const map = this._cache[workspace.name];

            if (map) {
                this._getWorkspaceBaseUrlMap(workspace).then(baseUrlMap => {
                    const item = uriToCompletionItem(uri, baseUrlMap);
                    const map = this._cache[workspace.name];
                    map.putItem(item);
                });
            } else {
                console.error("Cannot add item: Workspace has not been cached");
            }
        }

        return;
    };

    deleteFile = (uri: vscode.Uri) => {
        const workspace = this._getWorkspaceFolderFromUri(uri);
        if (workspace) {
            const map = this._cache[workspace.name];

            if (map) {
                this._getWorkspaceBaseUrlMap(workspace).then(baseUrlMap => {
                    const item = uriToCompletionItem(uri, baseUrlMap);
                    const map = this._cache[workspace.name];
                    map.removeItem(item);
                });
            }
        }

        return;
    };

    getCompletionList = (currentUri: vscode.Uri, query: string): vscode.CompletionList | [] => {
        const workspace = this._getWorkspaceFolderFromUri(currentUri);

        if (!workspace) {
            return [];
        }

        const itemsMap = this._cache[workspace.name];

        if (!itemsMap) {
            console.warn("Workspace was not in cache");
            return [];
        }

        const items = itemsMap.getItemsAt(this._getPrefix(query));

        return new vscode.CompletionList(items, false);
    };

    private _removeWorkspace = (workspaceFolder: vscode.WorkspaceFolder): void => {
        delete this._cache[workspaceFolder.name];
    };

    private _addWorkspace = (workspaceFolder: vscode.WorkspaceFolder): void => {
        const typescriptPattern = new vscode.RelativePattern(workspaceFolder, "**/*.ts");
        this._getWorkspaceBaseUrlMap(workspaceFolder).then(baseUrlMap => {
            vscode.workspace.findFiles(typescriptPattern).then(
                uris => {
                    const completionItems: vscode.CompletionItem[] = [];
                    for (const uri of uris) {
                        completionItems.push(uriToCompletionItem(uri, baseUrlMap));
                    }
                    this._cache[workspaceFolder.name] = new CompletionItemMapImpl(
                        completionItems,
                        this._getItemPrefix
                    );
                },
                error => {
                    console.error(`Error creating cache: ${error}`);
                }
            );
        });
    };

    private _getWorkspaceBaseUrlMap = (
        workspace: vscode.WorkspaceFolder
    ): Thenable<Record<string, string>> => {
        const tsconfigPattern = new vscode.RelativePattern(workspace, "**/tsconfig.json");

        return vscode.workspace
            .findFiles(tsconfigPattern)
            .then(this._tsconfigUrisToBaseUrlMap(workspace), error => {
                console.error(`Error while working with **/tsconfig.json files ${error}`);
                return {};
            });
    };

    private _getItemPrefix = (item: vscode.CompletionItem): string => {
        if (typeof item.label === "string") {
            return this._getPrefix(item.label);
        }

        return this._getPrefix(item.label.label);
    };

    private _getPrefix = (query: string): string => query.substring(0, 1);

    private _tsconfigUrisToBaseUrlMap =
        (workspaceFolder: vscode.WorkspaceFolder) =>
        (uris: vscode.Uri[]): Thenable<Record<string, string>> => {
            const recordPromises = Promise.all(
                uris.map(tsconfigUri =>
                    vscode.workspace.openTextDocument(tsconfigUri).then(
                        tsconfigDoc => {
                            const maybeBaseUrl = this._tsconfigDocumentToBaseUrl(tsconfigDoc);
                            return maybeBaseUrl
                                ? {
                                      [Path.relative(
                                          workspaceFolder.uri.path,
                                          Path.dirname(tsconfigUri.path)
                                      )]: maybeBaseUrl,
                                  }
                                : null;
                        },
                        error => {
                            console.error(`Error working with ${tsconfigUri.path}: ${error}`);
                        }
                    )
                )
            );

            return recordPromises.then(records =>
                records.reduce<Record<string, string>>((acc, r) => (r ? { ...acc, ...r } : acc), {})
            );
        };

    private _tsconfigDocumentToBaseUrl = (tsconfigDoc: vscode.TextDocument): string | null => {
        const parseResults = ts.parseConfigFileTextToJson(
            tsconfigDoc.fileName,
            tsconfigDoc.getText()
        );
        const tsconfigObj = parseResults.config;
        if ("compilerOptions" in tsconfigObj && "baseUrl" in tsconfigObj["compilerOptions"]) {
            return <string>tsconfigObj["compilerOptions"]["baseUrl"];
        }
        return null;
    };

    private _getWorkspaceFolderFromUri = (uri: vscode.Uri): vscode.WorkspaceFolder | undefined => {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);

        if (workspaceFolder === undefined) {
            console.error("URI in undefined workspaceFolder", uri);
        }

        return workspaceFolder;
    };
}
