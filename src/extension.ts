import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// URL of the CSS file hosted on CDN
const CSS_CDN_URL = 'https://cdn.stylexui.com/css/xui.css';

// Path to cache the downloaded CSS file
const LOCAL_CSS_PATH = path.join(__dirname, 'cached_styles.css');

/**
 * Fetches the CSS file from the CDN and saves it locally.
 */
async function fetchAndCacheCSS(): Promise<string> {
  try {
    const response = await axios.get(CSS_CDN_URL);
    fs.writeFileSync(LOCAL_CSS_PATH, response.data, 'utf8');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch CSS file from CDN:', error);
    return fs.existsSync(LOCAL_CSS_PATH) ? fs.readFileSync(LOCAL_CSS_PATH, 'utf8') : '';
  }
}

/**
 * Parses a CSS string and extracts class names with their styles.
 */
function parseCSS(cssContent: string): { [key: string]: string } {
  const classRegex = /\.([a-zA-Z0-9\-:]+)\s*\{([\s\S]*?)\}/g;
  const snippets: { [key: string]: string } = {};
  let match;

  while ((match = classRegex.exec(cssContent)) !== null) {
    const className = match[1];
    const rules = match[2].trim();
    snippets[className] = `.${className} {\n  ${rules.replace(/\n/g, '\n  ')}\n}`;
  }

  return snippets;
}

/**
 * Activates the VS Code extension.
 */
export async function activate(context: vscode.ExtensionContext) {
  const cssContent = await fetchAndCacheCSS();
  const cssSnippets = parseCSS(cssContent);
  const suggestions = Object.keys(cssSnippets);

  const supportedLanguages = ['html', 'css', 'javascript', 'javascriptreact', 'typescriptreact'];

  // Autocomplete provider
  supportedLanguages.forEach(language => {
    const provider = vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language },
      {
        provideCompletionItems() {
          return suggestions.map(item => {
            const completion = new vscode.CompletionItem(item, vscode.CompletionItemKind.Text);
            completion.insertText = item;
            completion.documentation = cssSnippets[item] ? new vscode.MarkdownString(`\`\`\`css\n${cssSnippets[item]}\n\`\`\``) : undefined;
            completion.detail = `CSS Class: ${item}`;
            return completion;
          });
        }
      },
      '-', '.', 'xui-' // Trigger characters
    );

    context.subscriptions.push(provider);
  });

  // Hover provider
  supportedLanguages.forEach(language => {
    const hoverProvider = vscode.languages.registerHoverProvider(
      { scheme: 'file', language },
      {
        provideHover(document, position) {
          const range = document.getWordRangeAtPosition(position, /[a-zA-Z0-9\-:]+/);
          if (!range){
            return null;
          } 

          const word = document.getText(range);
          if (cssSnippets[word]) {
            return new vscode.Hover(new vscode.MarkdownString(`\`\`\`css\n${cssSnippets[word]}\n\`\`\``));
          }

          return null;
        }
      }
    );

    context.subscriptions.push(hoverProvider);
  });
}

/**
 * Deactivates the extension.
 */
export function deactivate() {}
