import * as vscode from 'vscode';
import * as Path from "path";
import * as _ from "lodash";

export function uriToImportPath(uri: vscode.Uri): string {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const workspaceFolderPath = workspaceFolder === undefined ? "" : workspaceFolder.uri.path;

    const workspaceRelativePath = Path.relative(workspaceFolderPath, uri.path);
    return workspaceRelativePath.slice(0, workspaceRelativePath.length - Path.extname(workspaceRelativePath).length);
}

export function uriToModuleName(uri: vscode.Uri): string {
    const fileName = Path.basename(uri.path, ".ts");
    return _.upperFirst(_.camelCase(fileName));
}

export function uriToCompletionItem(uri: vscode.Uri): vscode.CompletionItem {
    const moduleName = uriToModuleName(uri);
    const importPath = uriToImportPath(uri);
    const completionItem = new vscode.CompletionItem(moduleName, vscode.CompletionItemKind.Module);
    completionItem.documentation = importPath;
    const importEdit = `import * as ${moduleName} from "${importPath}";\n`;
    completionItem.additionalTextEdits = [
        vscode.TextEdit.insert(new vscode.Position(0, 0), importEdit)
    ];
    return completionItem;
}