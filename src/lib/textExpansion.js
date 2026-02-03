/** Pattern: semicolon + word = alias (e.g. ;sw, ;7d) */
export const ALIAS_REGEX = /^;(\w+)$/;

/**
 * @param {string} line
 * @returns {string | null} alias or null
 */
export function getAliasFromLastLine(line) {
  const m = line.trim().match(ALIAS_REGEX);
  return m ? m[1] : null;
}

/**
 * @param {string} alias
 * @param {{ alias: string; text: string; title: string }[]} expansions
 * @returns {{ text: string; title: string } | undefined}
 */
export function findExpansion(alias, expansions) {
  return expansions.find((exp) => exp.alias === alias);
}
