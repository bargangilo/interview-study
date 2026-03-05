import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { computeTopicWeights } from "./topic-weights.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

// --- Seeded PRNG (linear congruential generator) ---

function createRng(seed) {
  // LCG parameters from Numerical Recipes
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  let state = seed >>> 0;

  return {
    /** Returns a float in [0, 1) */
    next() {
      state = (a * state + c) % m;
      return state / m;
    },
    /** Returns an integer in [min, max] inclusive */
    nextInt(min, max) {
      return min + Math.floor(this.next() * (max - min + 1));
    },
  };
}

// --- CLI argument parsing ---

function parseArgs(argv) {
  const args = { seed: null, configPath: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--seed" && i + 1 < argv.length) {
      args.seed = parseInt(argv[++i], 10);
      if (isNaN(args.seed)) {
        process.stderr.write("Error: --seed must be an integer.\n");
        process.exit(1);
      }
    } else if (argv[i] === "--config" && i + 1 < argv.length) {
      args.configPath = argv[++i];
    }
  }
  return args;
}

// --- Config validation ---

function validateConfig(config) {
  const required = [
    ["topics.include", config?.topics?.include],
    ["difficulty", config?.difficulty],
    ["style", config?.style],
    ["language", config?.language],
    ["parts", config?.parts],
    ["expectedTimeRange", config?.expectedTimeRange],
  ];

  for (const [field, value] of required) {
    if (value === undefined || value === null) {
      process.stderr.write(`Error: config.json is missing required field "${field}".\n`);
      process.exit(1);
    }
  }

  // Validate difficulty ranges
  for (const dim of ["algorithmComplexity", "dataStructureComplexity", "problemComplexity"]) {
    if (!Array.isArray(config.difficulty[dim]) || config.difficulty[dim].length !== 2) {
      process.stderr.write(`Error: config.json difficulty.${dim} must be a [min, max] array.\n`);
      process.exit(1);
    }
  }

  if (!Array.isArray(config.parts.countRange) || config.parts.countRange.length !== 2) {
    process.stderr.write('Error: config.json parts.countRange must be a [min, max] array.\n');
    process.exit(1);
  }

  if (typeof config.parts.maxPartsGlobal !== "number") {
    process.stderr.write('Error: config.json parts.maxPartsGlobal must be a number.\n');
    process.exit(1);
  }

  if (!Array.isArray(config.expectedTimeRange) || config.expectedTimeRange.length !== 2) {
    process.stderr.write('Error: config.json expectedTimeRange must be a [min, max] array.\n');
    process.exit(1);
  }
}

// --- Weighted random sampling without replacement ---

function weightedSampleWithoutReplacement(items, weights, count, rng) {
  const pool = items.map((item, i) => ({ item, weight: weights[i] }));
  const selected = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) break;

    let r = rng.next() * totalWeight;
    let chosenIdx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight;
      if (r <= 0) {
        chosenIdx = j;
        break;
      }
    }

    selected.push(pool[chosenIdx].item);
    pool.splice(chosenIdx, 1);
  }

  return selected;
}

// --- Main ---

function main() {
  const args = parseArgs(process.argv);

  // Resolve config path
  const configPath = args.configPath
    ? path.resolve(args.configPath)
    : path.join(REPO_ROOT, "config.json");

  // Read config
  if (!fs.existsSync(configPath)) {
    process.stderr.write(
      "Error: config.json not found. Run the /setup-config agent skill first.\n"
    );
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    process.stderr.write("Error: config.json contains invalid JSON.\n");
    process.exit(1);
  }

  validateConfig(config);

  // Initialize seeded RNG
  const seed = args.seed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = createRng(seed);

  // Compute topic weights
  const problemsDir = path.join(REPO_ROOT, "problems");
  const workspaceDir = path.join(REPO_ROOT, "workspace");
  const weightMap = computeTopicWeights(
    config.topics.include,
    config.topics.avoid || [],
    problemsDir,
    workspaceDir
  );

  // Sample topics
  const availableTopics = Object.keys(weightMap);
  const maxTopics = Math.min(3, availableTopics.length);
  const topicCount = maxTopics > 0 ? rng.nextInt(1, maxTopics) : 0;
  const topicWeights = availableTopics.map((t) => weightMap[t]);
  const selectedTopics = weightedSampleWithoutReplacement(
    availableTopics,
    topicWeights,
    topicCount,
    rng
  );

  // Sample part count
  const maxParts = Math.min(config.parts.countRange[1], config.parts.maxPartsGlobal);
  const partCount = rng.nextInt(config.parts.countRange[0], maxParts);

  // Sample style
  let style;
  const allowedStyles = config.style.allowedStyles || ["leetcode", "real-world"];
  if (allowedStyles.length === 1) {
    style = allowedStyles[0];
  } else {
    const pref = config.style.preference || "mixed";
    let leetcodeWeight, realWorldWeight;
    if (pref === "leetcode") {
      leetcodeWeight = 0.8;
      realWorldWeight = 0.2;
    } else if (pref === "real-world") {
      leetcodeWeight = 0.2;
      realWorldWeight = 0.8;
    } else {
      leetcodeWeight = 0.5;
      realWorldWeight = 0.5;
    }
    style = rng.next() < leetcodeWeight ? "leetcode" : "real-world";
  }

  // Sample difficulty
  const algorithmComplexity = rng.nextInt(
    config.difficulty.algorithmComplexity[0],
    config.difficulty.algorithmComplexity[1]
  );
  const dataStructureComplexity = rng.nextInt(
    config.difficulty.dataStructureComplexity[0],
    config.difficulty.dataStructureComplexity[1]
  );
  const problemComplexity = rng.nextInt(
    config.difficulty.problemComplexity[0],
    config.difficulty.problemComplexity[1]
  );
  const overall = Math.round(
    algorithmComplexity * 0.3 +
    dataStructureComplexity * 0.3 +
    problemComplexity * 0.4
  );

  // Sample expectedMinutes
  const [minTime, maxTime] = config.expectedTimeRange;
  const baseMinutes = minTime + Math.round(((overall - 1) / 4) * (maxTime - minTime));
  const jitter = rng.nextInt(-3, 3);
  const expectedMinutes = Math.max(minTime, Math.min(maxTime, baseMinutes + jitter));

  // Output
  const output = {
    topics: selectedTopics,
    partCount,
    style,
    difficulty: {
      algorithmComplexity,
      dataStructureComplexity,
      problemComplexity,
      overall,
    },
    expectedMinutes,
    seed,
  };

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}

main();
