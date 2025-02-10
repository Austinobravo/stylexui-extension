import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Function to parse the CSS file and extract snippets
function parseCSSFile(cssFilePath: string): { [key: string]: string } {
  const cssContent = fs.readFileSync(cssFilePath, 'utf8');
  const snippetMap: { [key: string]: string } = {};

  // Regex to extract class names and their rules
  const classRegex = /\.([a-zA-Z0-9\-:]+)\s*\{([\s\S]*?)\}/g;
  let match;

  while ((match = classRegex.exec(cssContent)) !== null) {
    const className = match[1];
    const rules = match[2].trim();
    snippetMap[className] = `.${className} {\n  ${rules.replace(/\n/g, '\n  ')}\n}`;
  }

  return snippetMap;
}

export function activate(context: vscode.ExtensionContext) {
  // Path to the CSS file
  const cssFilePath = path.join(context.extensionPath, 'src/assets/css/snippets.css');
  const cssSnippets = parseCSSFile(cssFilePath);
  const suggestions = Object.keys(cssSnippets);

  // Supported languages for autocomplete and hover
  const supportedLanguages = ['html', 'css', 'javascript', 'javascriptreact', 'typescriptreact'];

  // Register a CompletionItemProvider for autocomplete
  supportedLanguages.forEach(language => {
    const provider = vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language },
      {
        provideCompletionItems(document, position) {
          const completionItems = suggestions.map(item => {
            const completion = new vscode.CompletionItem(item, vscode.CompletionItemKind.Text);

            // Autocomplete suggestion
              const range = document.getWordRangeAtPosition(
                vscode.window.activeTextEditor!.selection.active,
                /[\w-]+/
              );
              completion.range = range ?? undefined; // Only replace what the user has typed
              completion.insertText = item;
            

            // Hover documentation for dropdown
            if (cssSnippets[item]) {
              completion.documentation = new vscode.MarkdownString(
                `\`\`\`css\n${cssSnippets[item]}\n\`\`\`\n`
              );
            } else {
              completion.documentation = new vscode.MarkdownString(`No additional details available for ${item}.`);
            }

            completion.detail = `${item}`;
            return completion;
          });

          return completionItems;
        }
      },
      '-', '.', 'xui-' // Trigger characters
    );

    context.subscriptions.push(provider);
  });

  // Register a HoverProvider for hover functionality
  supportedLanguages.forEach(language => {
    const hoverProvider = vscode.languages.registerHoverProvider(
      { scheme: 'file', language },
      {
        provideHover(document, position) {
          const range = document.getWordRangeAtPosition(position, /[a-zA-Z0-9\-:]+/);
          if (!range) {
            return null;
          }

          // Extract the word being hovered over
          const word = document.getText(range);

          // Check if the word matches a suggestion
          if (cssSnippets[word]) {
            return new vscode.Hover(
              new vscode.MarkdownString(
                `\`\`\`css\n${cssSnippets[word]}\n\`\`\`\n`
              )
            );
          }

          return null; // No hover content for unmatched words
        }
      }
    );

    context.subscriptions.push(hoverProvider);
  });
}

export function deactivate() {}
