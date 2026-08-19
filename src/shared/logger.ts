const PREFIX = '[yt-adblock]';

export interface Logger {
  debug: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * Off by default and gated behind a setting. Not just noise control: the
 * MAIN-world layer shares a console with YouTube, and a chatty extension is a
 * trivially observable signal that one is installed.
 */
export function createLogger(scope: string, enabled: () => boolean): Logger {
  const tag = `${PREFIX}[${scope}]`;
  return {
    debug: (...args) => {
      if (enabled()) console.debug(tag, ...args);
    },
    warn: (...args) => {
      if (enabled()) console.warn(tag, ...args);
    },
    // Errors always surface: a silent failure here looks like YouTube breaking.
    error: (...args) => console.error(tag, ...args),
  };
}
