import { Position, Range, type TextEditor } from 'vscode';
import { logMessage } from './debug';
// TODO: Import grim-wrapper from npm
import {
  isCommentBreak,
  isCommentEnd,
  isCommentStart,
  wrapComment,
} from './lib/grim-wrapper';
import type { ExtensionProperties } from './types';

/**
 * Return the range for the comment block under cursor.
 */
function getCommentBlockRange({ document, selection }: TextEditor) {
  // Walk up
  let startLine = selection.start.line;
  while (true) {
    const lineText = document.lineAt(startLine).text.trim();
    if (isCommentStart(lineText)) {
      // We found the first line of the comment
      break;
    }
    if (lineText === '' || isCommentBreak(lineText)) {
      // We found paragraph break, go one step back, as we don't want to include the "empty" line
      startLine++;
      break;
    }
    if (startLine === 0) {
      // Exit loop to keep `startLine` at the first line of the document
      break;
    }
    startLine--;
  }

  // Walk down
  let endLine = selection.start.line;
  while (true) {
    const lineText = document.lineAt(endLine).text.trim();
    if (isCommentEnd(lineText)) {
      // We found the last line of the comment
      break;
    }
    if (lineText === '' || isCommentBreak(lineText)) {
      // We found paragraph break, go one step back, as we don't want to include the "empty" line
      endLine--;
      break;
    }
    if (endLine === document.lineCount - 1) {
      // Exit loop to keep `endLine` at the last line of the document
      break;
    }
    endLine++;
  }

  logMessage(`Comment block range lines: ${startLine}–${endLine}`);

  return new Range(
    new Position(startLine, 0),
    new Position(endLine, document.lineAt(endLine).text.length),
  );
}

/**
 * Wraps the comment block under the cursor
 */
export function wrapText(editor: TextEditor, config: ExtensionProperties) {
  const range = getCommentBlockRange(editor);

  const text = editor.document.getText(range);
  logMessage(`Comment block to wrap:\n${text}`);

  const textWrapped = wrapComment(text, config.maxLength);
  logMessage(`Wrapped comment block:\n${textWrapped}`);

  editor.edit((editBuilder) => {
    editBuilder.replace(range, textWrapped);
  });
}
