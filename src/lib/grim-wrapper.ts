// TODO: HTML comments: <!-- -->
// TODO: Test with @example tag
// TODO: Support /* foo\nbar\baz */ /* foo\nbar\baz\n\nfoo\nbar\baz\n\nfoo\nbar\baz */

/**
 * Escapes special characters in a string to be used safely in a regular expression.
 */
export function escapeRegExp(string: string): string {
  return string.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Transforms an array of strings to a regular expression choices.
 */
export function regExpChoices(choices: string[]): string {
  return choices.map((x) => escapeRegExp(x)).join('|');
}

// JSDoc tags are indented to a fixed size:
// https://google.github.io/styleguide/jsguide.html#jsdoc-line-wrapping
const JSDOC_INDENT = 4;

// Prefixes that start multiline comments: /**, /*, {/*
const multilinePrefixes = ['/**', '/*', '{/*'];

// Prefixes of lines inside a multiline comment: /**, /*, {/*
const multilineInsidePrefixes = ['*', '//', '#'];

const allPrefixes = [...multilinePrefixes, ...multilineInsidePrefixes];

// Suffixes that end multiline comments: /**, /*, {/*
const multilineSuffixes = ['*/', '*/}'];

// Comment prefixes: //, #, *, /**, /*, {/*
const prefixRegExp = new RegExp(
  `^\\s*(?:${regExpChoices(allPrefixes)})[ \\t]*`
);

// Multiline comment prefix
const multilinePrefixRegExp = new RegExp(
  `^\\s*(?:${regExpChoices(multilinePrefixes)})[ \\t]*`
);

// Comment suffix (can be only on multiline comments)
const suffixRegExp = new RegExp(
  `\\s*(?:${regExpChoices(multilineSuffixes)})\\s*$`
);

// List item markers: -, *, - [ ], - [x], etc.
const listItemRegExp = /^\s*([-*])(\s+\[[ xX]\])?\s*/;

// JSDoc tag: @param, @returns
const jsDocRegExp = /^\s*@\w+\s*/;

/**
 * Checks whether a given line is the beginning of a multiline comment.
 *
 * Examples:
 * `/* foo` → true
 * ` * foo` → false
 * `// foo` → false
 */
export function isCommentStart(text: string) {
  return multilinePrefixRegExp.test(text);
}

/**
 * Checks whether a given line is the end of a multiline comment.
 *
 * Examples:
 * `foo *_/` → true (ignore _)
 * ` * foo` → false
 * `// foo` → false
 */
export function isCommentEnd(text: string) {
  return suffixRegExp.test(text);
}

/**
 * Checks whether a given line is a paragraph break in a multiline comment.
 *
 * Examples:
 * `/* foo` → false
 * `foo *_/` → false (ignore _)
 * ` * foo` → false
 * `// foo` → false
 * ` *` → true
 * `//` → true
 */
export function isCommentBreak(text: string) {
  return multilineInsidePrefixes.includes(text.trim());
}

/**
 * Checks whether a given line is a line inside a comment.
 *
 * Examples:
 * `/* foo` → true
 * `foo *_/` → true (ignore _)
 * ` * foo` → true
 * `// foo` → true
 * ` *` → true
 * `//` → true
 * `alert()` → false
 * `` → false
 */
export function isComment(text: string) {
  return prefixRegExp.test(text);
}

/**
 * Returns first line comment prefix.
 *
 * `  // Example` → `  //`
 */
export function getCommentPrefix(text: string) {
  const match = text.match(prefixRegExp);
  return match ? match[0] : '';
}

/**
 * Returns last line comment prefix.
 *
 * Examples:
 * `  // Example` → ``
 * `  /* Example *_/` → `*_/` (ignore _)
 */
export function getCommentSuffix(text: string) {
  const match = text.match(suffixRegExp);
  return match ? match[0] : '';
}

/**
 * Returns a prefix that should be used to prefix each line of comments.
 *
 * Examples:
 * `//` → `// `
 * `#` → `# `
 * `/*` → ` * `
 * `/**` → ` * `
 */
export function normalizeCommentPrefix(prefix: string) {
  // If there's no prefix (for example in Markdown or plain text) do nothing
  if (prefix === '') {
    return '';
  }

  return (
    prefix
      // Replace the opening marker (/*, {/*) with a continuation marker (*)
      .replace(/\{?\/\*+/, ' *')
      // Ensure there's one space at the end
      .replace(/\s*$/, ' ')
  );
}

/**
 * Returns comment as an array of lines of text: strips all comment markers and
 * squashes multiple line breaks into one. Multiple paragraphs are treated as a single paragraph.
 */
export function stripFormatting(text: string) {
  const lines = splitIntoLines(text);

  return (
    lines
      // Remove suffixes (*/)
      .map((line) => line.replace(suffixRegExp, ''))
      // Remove prefixes (/*, //)
      .map((line) => line.replace(prefixRegExp, ''))
      // Remove leading/trailing whitespace
      .map((line) => line.trim())
      // Filter out empty lines
      .filter((line) => line !== '')
  );
}

/**
 * Returns the number of available characters inside the comment.
 */
export function getAvailableLength(prefix: string, maxLength: number) {
  return maxLength - prefix.length;
}

/**
 * Splits the text into an array of lines. Ignores empty lines.
 */
export function splitIntoLines(text: string) {
  return text.split(/(?:\r?\n)+/);
}

/**
 * Checks whether a given line starts with a list marker or JSDoc tag.
 */
export function isListItemOrJsDocTag(text: string) {
  return listItemRegExp.test(text) || jsDocRegExp.test(text);
}

/**
 * Splits the text into chunks. A chunk could be:
 * - a block of text
 * - a list item (starts with `-` or `*`)
 * - a checklist item (starts with `- [ ]` or `* [ ]` or `- [x]` or `* [x]` )
 * - a JSDoc item (starts with @tagname)
 *
 * We assume that text blocks could only be placed before list items or JSDocs
 * tags.
 */
export function splitIntoChunks(lines: string[]): string[] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];

  for (const line of lines) {
    // A list item marker or JSDoc tag starts a new chunk
    if (isListItemOrJsDocTag(line) && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
    currentChunk.push(line);
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.map((chunk) => chunk.join('\n'));
}

/**
 * Wraps a single text block.
 */
export function wrapTextBlock(text: string, maxLength: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const isFirstWord = currentLine === '';
    const nextCurrentLine = `${currentLine}${isFirstWord ? '' : ' '}${word}`;
    if (nextCurrentLine.length > maxLength) {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    } else {
      currentLine = nextCurrentLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Wraps a single list item or JDoc tag.
 */
export function wrapListItem(chunk: string, maxLength: number) {
  const match = chunk.match(listItemRegExp) || chunk.match(jsDocRegExp);
  const prefix = Array.isArray(match) ? match[0] : '';
  const prefixLength = prefix.length;
  const indentLength = jsDocRegExp.test(chunk) ? JSDOC_INDENT : prefix.length;

  // Wrap lines by available length minus indentation, pad the beginning of the first line with @ character to accommodate the difference between the size of indentation and the prefix
  const cleanChunk =
    '@'.repeat(prefixLength - indentLength) + chunk.replace(prefix, '');
  const lines = wrapTextBlock(cleanChunk, maxLength - indentLength);

  // Return the prefix and indent following lines
  const formattedLines = lines.map((line, index) =>
    index === 0
      ? `${prefix}${line.replaceAll(/^@+/g, '')}`
      : `${' '.repeat(indentLength)}${line}`
  );

  return formattedLines;
}

/**
 * Wrap a single paragraph in a code comment, Markdown, or plain text.
 */
export function wrapComment(comment: string, maxLength = 80) {
  if (comment.length <= maxLength) {
    // The whole comment is short enough, no need to do anything
    return comment;
  }

  const chunks = splitIntoChunks(stripFormatting(comment));

  const firstLinePrefix = getCommentPrefix(comment);
  const normalizedPrefix = normalizeCommentPrefix(firstLinePrefix);

  const availableMaxLength = getAvailableLength(normalizedPrefix, maxLength);

  const lines = [];
  for (const chunk of chunks) {
    const wrappedLines = isListItemOrJsDocTag(chunk)
      ? wrapListItem(chunk, availableMaxLength)
      : wrapTextBlock(chunk, availableMaxLength);

    lines.push(...wrappedLines);
  }

  const prefixedLines = lines.map((line) => `${normalizedPrefix}${line}`);

  // Restore opening /*, /**, etc.
  const cleanFirstLinePrefix = firstLinePrefix.trim();
  if (multilinePrefixes.includes(cleanFirstLinePrefix)) {
    prefixedLines.unshift(firstLinePrefix.trimEnd());
  }

  // Restore closing */, etc.
  const lastLineSuffix = getCommentSuffix(comment);
  const cleanLastLineSuffix = lastLineSuffix.trim();
  if (multilineSuffixes.includes(cleanLastLineSuffix)) {
    const indentedLastLineSuffix = normalizedPrefix
      .replace(normalizedPrefix.trim(), cleanLastLineSuffix)
      .trimEnd();
    prefixedLines.push(indentedLastLineSuffix);
  }

  return prefixedLines.join('\n');
}
