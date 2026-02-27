import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--forge-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--forge-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--forge-elements-terminal-textColor'),
    background: cssVar('--forge-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--forge-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--forge-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--forge-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--forge-elements-terminal-color-black'),
    red: cssVar('--forge-elements-terminal-color-red'),
    green: cssVar('--forge-elements-terminal-color-green'),
    yellow: cssVar('--forge-elements-terminal-color-yellow'),
    blue: cssVar('--forge-elements-terminal-color-blue'),
    magenta: cssVar('--forge-elements-terminal-color-magenta'),
    cyan: cssVar('--forge-elements-terminal-color-cyan'),
    white: cssVar('--forge-elements-terminal-color-white'),
    brightBlack: cssVar('--forge-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--forge-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--forge-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--forge-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--forge-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--forge-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--forge-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--forge-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
