import * as vscode from "vscode";
import * as Path from "path";
import * as _ from "lodash";

export function uriToImportPath(uri: vscode.Uri, baseUrlMap: Record<string, string>): string {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const workspaceFolderPath = workspaceFolder === undefined ? "" : workspaceFolder.uri.path;
    const uriRelativePath = Path.relative(workspaceFolderPath, uri.path);
    const maybePathWithBaseUrl = _lookForPathWithBaseUrl(uriRelativePath, baseUrlMap);
    const importPath = maybePathWithBaseUrl ? maybePathWithBaseUrl : uriRelativePath;
    return importPath.slice(0, importPath.length - Path.extname(importPath).length);
}

function _lookForPathWithBaseUrl(uriPath: string, baseUrlMap: Record<string, string>) {
    let dirname = uriPath;
    let suffix = "";
    while (dirname !== ".") {
        suffix = Path.join(Path.basename(dirname), suffix);
        dirname = Path.dirname(dirname);
        if (dirname in baseUrlMap) {
            return Path.join(baseUrlMap[dirname], suffix);
        }
    }
    return null;
}

export function uriToModuleName(uri: vscode.Uri): string {
    const fileName = Path.basename(uri.path, uri.path.endsWith("ts") ? ".ts" : ".tsx");
    return _.upperFirst(_.camelCase(fileName));
}

export function uriToCompletionItem(
    uri: vscode.Uri,
    baseUrlMap: Record<string, string>
): vscode.CompletionItem {
    const moduleName = uriToModuleName(uri);
    const importPath = uriToImportPath(uri, baseUrlMap);
    const completionItem = new vscode.CompletionItem(moduleName, vscode.CompletionItemKind.Module);
    completionItem.detail = importPath;
    const importEdit = `import * as ${moduleName} from "${importPath}";\n`;
    completionItem.additionalTextEdits = [
        vscode.TextEdit.insert(new vscode.Position(0, 0), importEdit),
    ];
    return completionItem;
}
