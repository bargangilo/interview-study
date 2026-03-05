import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function stripFrontmatter(content) {
  if (!content.startsWith("---\n")) return content;
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) return content;
  return content.slice(end + 5);
}

function main() {
  const skillsSourceDir = path.join(REPO_ROOT, ".claude", "skills");
  const skillsOutputDir = path.join(REPO_ROOT, ".agents", "skills");

  if (!fs.existsSync(skillsSourceDir)) {
    process.stderr.write(
      `Error: ${skillsSourceDir} not found. No skills to export.\n`,
    );
    process.exit(1);
  }

  if (!fs.existsSync(skillsOutputDir)) {
    fs.mkdirSync(skillsOutputDir, { recursive: true });
  }

  const entries = fs.readdirSync(skillsSourceDir, { withFileTypes: true });
  let written = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsSourceDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillFile)) continue;

    const content = fs.readFileSync(skillFile, "utf8");
    const body = stripFrontmatter(content);
    const outputPath = path.join(skillsOutputDir, `${entry.name}.md`);
    fs.writeFileSync(outputPath, body, "utf8");
    process.stdout.write(`Written: .agents/skills/${entry.name}.md\n`);
    written++;
  }

  process.stdout.write(`\n${written} skill(s) exported.\n`);
}

main();
