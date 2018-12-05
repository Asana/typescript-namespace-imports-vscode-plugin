import * as vscode from "vscode";
import { uriToCompletionItem } from "./uri_helpers";
import * as Path from "path";
import * as ts from "typescript";

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
    workspaceCompletionItems = workspaceFolders.map(_ => new vscode.CompletionList([], true));
    workspaceFolders.forEach(workspaceFolder => {
        const tsconfigPattern = new vscode.RelativePattern(workspaceFolder, "**/tsconfig.json");
        const typescriptPattern = new vscode.RelativePattern(workspaceFolder, "**/*.ts");
        vscode.workspace
            .findFiles(tsconfigPattern)
            .then(_tsconfigUrisToBaseUrlMap(workspaceFolder), error => {
                console.error(`Error while working with **/tsconfig.json files ${error}`);
                return {};
            })
            .then(baseUrlMap => {
                vscode.workspace.findFiles(typescriptPattern).then(
                    uris => {
                        const completionItems = uris.map(uri => uriToCompletionItem(uri, baseUrlMap));
                        workspaceCompletionItems[workspaceFolder.index] = new vscode.CompletionList(
                            completionItems,
                            false
                        );
                    },
                    error => {
                        console.error(`Error in updateWorkspaceCompletionItems: ${error}`);
                    }
                );
            });
    });
}

const _tsconfigDocumentToBaseUrl = (tsconfigDoc: vscode.TextDocument): string | null => {
    const parseResults = ts.parseConfigFileTextToJson(tsconfigDoc.fileName, tsconfigDoc.getText());
    const tsconfigObj = parseResults.config;
    if ("compilerOptions" in tsconfigObj && "baseUrl" in tsconfigObj["compilerOptions"]) {
        return <string>tsconfigObj["compilerOptions"]["baseUrl"];
    }
    return null;
};

const _tsconfigUrisToBaseUrlMap = (workspaceFolder: vscode.WorkspaceFolder) => (
    uris: vscode.Uri[]
): Thenable<Record<string, string>> => {
    const recordPromises = Promise.all(
        uris.map(tsconfigUri =>
            vscode.workspace.openTextDocument(tsconfigUri).then(tsconfigDoc => {
                const maybeBaseUrl = _tsconfigDocumentToBaseUrl(tsconfigDoc);
                return maybeBaseUrl
                    ? { [Path.relative(workspaceFolder.uri.path, Path.dirname(tsconfigUri.path))]: maybeBaseUrl }
                    : null;
            })
        )
    );
    return recordPromises.then(
        records =>
            // We filter out nulls so it's pretty safe to cast.
            <Record<string, string>>records.filter(r => r !== null).reduce((acc, r) => ({ ...acc, ...r }))
    );
};

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
