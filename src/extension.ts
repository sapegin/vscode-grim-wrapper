import { commands, workspace, type ExtensionContext } from 'vscode';
import { wrapText } from './document';
import { logMessage } from './debug';
import type { ExtensionProperties } from './types';

function getExtensionProperties(): ExtensionProperties {
  const { maxLength } = workspace.getConfiguration('grimWrapper');
  return {
    maxLength,
  };
}

export function activate(context: ExtensionContext) {
  logMessage('🪦 Grim Wrapper starting...');

  context.subscriptions.push(
    commands.registerTextEditorCommand('grimWrapper.wrapText', (editor) => {
      const config = getExtensionProperties();
      logMessage('Config: ', config);
      wrapText(editor, config);
    }),
  );
}
