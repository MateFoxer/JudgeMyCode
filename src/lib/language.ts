const EXTENSION_LANGUAGE: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  py: "Python",
  java: "Java",
  cs: "C#",
  cpp: "C++",
  cxx: "C++",
  cc: "C++",
  c: "C",
  go: "Go",
  rs: "Rust",
  rb: "Ruby",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  kts: "Kotlin",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  json: "JSON",
  yml: "YAML",
  yaml: "YAML",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  md: "Markdown",
};

function detectByHeuristics(code: string): string {
  const sample = code.slice(0, 4000).toLowerCase();

  if (/^\s*<!doctype html>|<html[\s>]/m.test(sample)) return "HTML";
  if (/\bimport\s+react\b|export\s+default|useState\(/m.test(sample)) return "JavaScript";
  if (/\binterface\s+\w+\s*{|:\s*(string|number|boolean)\b|\btype\s+\w+\s*=/m.test(sample)) return "TypeScript";
  if (/\bdef\s+\w+\(|\bimport\s+\w+\n|\bprint\(/m.test(sample)) return "Python";
  if (/\bpublic\s+class\b|\bstatic\s+void\s+main\b/m.test(sample)) return "Java";
  if (/\busing\s+system\b|\bnamespace\s+\w+/m.test(sample)) return "C#";
  if (/\bpackage\s+main\b|\bfmt\.print|\bfunc\s+\w+\(/m.test(sample)) return "Go";
  if (/\bfn\s+\w+\(|\blet\s+mut\b|\bprintln!\(/m.test(sample)) return "Rust";
  if (/\bselect\b[\s\S]*\bfrom\b/m.test(sample)) return "SQL";
  if (/\bfunction\s+\w+\(|\bconst\s+\w+\s*=|=>/m.test(sample)) return "JavaScript";

  return "Plain Text";
}

export function detectLanguage(fileName: string | null, code: string): string {
  if (fileName) {
    const parts = fileName.toLowerCase().split(".");
    const extension = parts.length > 1 ? parts[parts.length - 1] : "";
    const byExt = EXTENSION_LANGUAGE[extension];
    if (byExt) {
      return byExt;
    }
  }

  return detectByHeuristics(code);
}
