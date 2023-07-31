import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as markdownit from "markdown-it";
import Vectorizer from "code-vectorizer";
import { generate } from "polyfact";
import { TextDecoder } from "util";
import loading from "./loading";

function checkConfigFileExists(workspacePath: string): boolean {
  const polyfactConfigPath = `${workspacePath}/vectorizer.json`;

  if (!fs.existsSync(polyfactConfigPath)) {
    return false;
  }
  return true;
}

export function activate(context: vscode.ExtensionContext) {
  const statusBarSearchItem = createStatusBarSearchItem();
  statusBarSearchItem.show();

  const searchWithSearchBar = vscode.commands.registerCommand(
    "talk-with-code.askSomething",
    handleSearchCommand
  );

  context.subscriptions.push(searchWithSearchBar);
  context.subscriptions.push(statusBarSearchItem);
}

function createStatusBarSearchItem() {
  const statusBarSearchItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );

  statusBarSearchItem.text = "TalkWithCode";
  statusBarSearchItem.command = "talk-with-code.askSomething";
  statusBarSearchItem.tooltip = "Search in Code";

  return statusBarSearchItem;
}

async function handleSearchCommand() {
  const workspaceFolder = getWorkspaceFolder();

  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace is opened.");
    return;
  }

  const workspacePath = workspaceFolder.uri.fsPath;
  const isConfigFileExists = checkConfigFileExists(workspacePath);

  if (!isConfigFileExists) {
    await newVectorizer(workspacePath);
  } else {
    await searchQuery();
  }
}

function getWorkspaceFolder() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  return workspaceFolders && workspaceFolders[0];
}

async function searchQuery() {
  const userInput = await vscode.window.showInputBox({
    prompt:
      "Ask at TalkWithCode something about your codebase, or search for a specific term.",
    placeHolder: "Explain me how i can use ...",
  });

  if (userInput) {
    searchInEmbeddind(userInput);
  }
}

function readDirRecursive(dir: string): string[] {
  const result: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      result.push(...readDirRecursive(file));
    } else {
      result.push(file);
    }
  });
  return result;
}

async function checkToken(): Promise<string> {
  const token =
    vscode.workspace.getConfiguration("talk-with-code").get<string>("token") ||
    "";

  if (!token) {
    vscode.window.showErrorMessage(
      "You need to set your token first.\nGo https://app.polyfact.com to get one."
    );
    throw new Error("Token for talk-with-code is missing.");
  }

  return token;
}

async function vectorizeAction(
  workspacePath: string,
  token: string,
  workspaceFolder: any
): Promise<string> {
  const newPolyfactConfig = vscode.Uri.file(`${workspacePath}/vectorizer.json`);
  const files = await readWorkspaceDirectory(workspaceFolder[0].uri.fsPath);
  const selectedFiles = await selectFilesToVectorize(files, workspaceFolder);
  return await vectorizeFiles(selectedFiles, newPolyfactConfig, token);
}

async function readWorkspaceDirectory(
  workspaceDirectory: string
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    fs.readdir(workspaceDirectory, (err, files) => {
      if (err) {
        vscode.window.showErrorMessage("Unable to read workspace directory.");
        return reject(err);
      }
      resolve(files);
    });
  });
}

async function selectFilesToVectorize(
  files: string[],
  workspaceFolder: any
): Promise<string[]> {
  const items: vscode.QuickPickItem[] = files.map((file) => ({ label: file }));
  const selectedItems = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    placeHolder: "Select files",
  });

  if (!selectedItems) {
    throw new Error("No files were selected.");
  }

  return selectedItems.flatMap((item) => {
    const filePath = path.join(workspaceFolder[0].uri.fsPath, item.label);
    return fs.statSync(filePath).isDirectory()
      ? readDirRecursive(filePath)
      : filePath;
  });
}

async function vectorizeFiles(
  selectedFiles: string[],
  newPolyfactConfig: vscode.Uri,
  token: string
): Promise<string> {
  const vectorizer = new Vectorizer(token, 2000);
  const files = vectorizer.readFilesFromPath(selectedFiles);
  const totalFiles = selectedFiles.length;

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Vectorizing files...",
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 0 });

      vscode.window.showInformationMessage("totalFiles : " + totalFiles);

      await vectorizer.vectorize(files, (_) => {
        progress.report({ increment: 100 / totalFiles });
      });

      const newContent = {
        memoryId: vectorizer.getMemoryId(),
        files: selectedFiles,
      };

      const data = Buffer.from(JSON.stringify(newContent), "utf8");
      await vscode.workspace.fs.writeFile(newPolyfactConfig, data);
      return vectorizer.getMemoryId();
    }
  );
}

async function newVectorizer(workspacePath: string) {
  try {
    const token = await checkToken();
    const workspaceFolder = vscode.workspace.workspaceFolders;

    if (!workspaceFolder) {
      vscode.window.showErrorMessage("No workspace is opened.");
      throw new Error("No workspace is opened.");
    }

    const action = await vscode.window.showWarningMessage(
      "You need to vectorize your code first.",
      { modal: true },
      "Vectorize"
    );

    if (action === "Vectorize") {
      await vectorizeAction(workspacePath, token, workspaceFolder);
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message + "Failed to create file.");
    throw err;
  }
}

async function readJsonFile(
  uri: vscode.Uri
): Promise<{ memoryId: string; files: string[] }> {
  try {
    let array = await vscode.workspace.fs.readFile(uri);
    let jsonString = new TextDecoder("utf-8").decode(array);
    return JSON.parse(jsonString);
  } catch (err) {
    console.error(err);
    throw err;
  }
}
async function searchInEmbeddind(input: string) {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder is opened.");
    return;
  }

  let workspacePath = workspaceFolders[0].uri.fsPath;
  let uri = vscode.Uri.file(path.join(workspacePath, "vectorizer.json"));

  let content = await readJsonFile(uri);

  const panel = vscode.window.createWebviewPanel(
    "searchResultPreview",
    "TalkWithCode Docs for " + input,
    vscode.ViewColumn.Beside,
    {
      enableScripts: false,
      retainContextWhenHidden: true,
    }
  );

  loading(panel.webview);

  const rawPrompt =
    vscode.workspace.getConfiguration("talk-with-code").get<string>("prompt") ||
    "";

  const prompt = `
  ${rawPrompt}

  Now answer the following question:
  ${input}     
  `;
  vscode.window.showInformationMessage(content.memoryId);
  const response = await generate(prompt, { memoryId: content.memoryId });

  if (response) {
    const md = markdownit();
    const html = md.render(response);

    panel.webview.html = html;
  } else {
    vscode.window.showInformationMessage("No matching section found");
  }
}

export function deactivate() {}
