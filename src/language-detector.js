const languageDetector = (text) => {
  if (!text) return "";

  // Get the first line of the text
  const firstLine = text.trim().split('\n')[0].trim();

  // Remove comment markers from the start: //, #, --, /*
  // We can use regex to remove these patterns from the start of the line
  const cleanedLine = firstLine.replace(/^(\s*(\/\/|#|--|\/\*))/i, '').trim();

  // Check if cleaned line starts with "language-"
  if (cleanedLine.toLowerCase().startsWith("language-")) {
    // Extract the language part after "language-"
    const lang = cleanedLine.slice("language-".length).toLowerCase();

    // List of supported languages
    const supportedLanguages = ["python", "javascript", "sql", "ruby", "csharp"];

    if (supportedLanguages.includes(lang)) {
      return lang;
    }
  }

  // If no language detected, return empty string
  return "";
};
