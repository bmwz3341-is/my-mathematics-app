// Strips common Hebrew plural/feminine suffixes so singular and plural forms of the
// same word match each other, e.g. a search for "משוואה" also finds "משוואות ריבועיות".
function stemHebrewWord(word: string): string {
  return word.replace(/(ות|ים)$|ה$/, "");
}

function normalizeHebrew(text: string): string {
  return text
    .split(/\s+/)
    .map(stemHebrewWord)
    .join(" ");
}

export function matchesSearch(label: string, query: string): boolean {
  if (!query) return false;
  if (label.includes(query)) return true;
  return normalizeHebrew(label).includes(normalizeHebrew(query));
}
