import fs from "fs";
import path from "path";

/**
 * Compute normalized topic weights based on practice history.
 * Higher weight = more likely to be selected for the next generated problem.
 *
 * @param {string[]} topics - Topics from config.topics.include
 * @param {string[]} avoidTopics - Topics from config.topics.avoid
 * @param {string} problemsDir - Absolute path to problems/ directory
 * @param {string} workspaceDir - Absolute path to workspace/ directory
 * @returns {Object.<string, number>} Weight map where all weights sum to 1.0
 */
export function computeTopicWeights(topics, avoidTopics, problemsDir, workspaceDir) {
  if (!topics || topics.length === 0) return {};

  const avoidSet = new Set(avoidTopics || []);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // Load all problem configs
  const problemConfigs = loadProblemConfigs(problemsDir);

  // Build topic -> problem mapping
  const topicProblems = buildTopicProblemMap(topics, problemConfigs);

  // Compute raw weights
  const rawWeights = {};
  for (const topic of topics) {
    if (avoidSet.has(topic)) {
      rawWeights[topic] = 0;
      continue;
    }

    let weight = 1.0;
    const problems = topicProblems[topic] || [];

    if (problems.length === 0) {
      // No problems with this topic — boost for novelty
      weight += 0.30;
    } else {
      for (const problemName of problems) {
        const session = loadSessionSafe(problemName, workspaceDir);
        if (!session || !Array.isArray(session.attempts)) continue;

        for (const attempt of session.attempts) {
          if (!attempt || typeof attempt.date !== "string") continue;
          const attemptTime = new Date(attempt.date).getTime();

          if (attempt.completed === true && attemptTime >= sevenDaysAgo) {
            weight -= 0.15;
          } else if (attempt.completed === false) {
            weight += 0.20;
          }
        }
      }
    }

    rawWeights[topic] = Math.max(0.1, weight);
  }

  // Normalize (exclude zero-weight avoid topics)
  return normalize(rawWeights);
}

function loadProblemConfigs(problemsDir) {
  const configs = [];
  let dirs;
  try {
    if (!fs.existsSync(problemsDir)) return configs;
    dirs = fs.readdirSync(problemsDir, { withFileTypes: true });
  } catch {
    return configs;
  }

  for (const dirent of dirs) {
    if (!dirent.isDirectory()) continue;
    const configPath = path.join(problemsDir, dirent.name, "problem.json");
    try {
      const raw = fs.readFileSync(configPath, "utf8");
      const config = JSON.parse(raw);
      if (config && Array.isArray(config.topics)) {
        configs.push({ name: dirent.name, topics: config.topics });
      }
    } catch {
      // Malformed problem.json — skip silently
    }
  }

  return configs;
}

function buildTopicProblemMap(topics, problemConfigs) {
  const map = {};
  for (const topic of topics) {
    map[topic] = [];
  }
  for (const { name, topics: problemTopics } of problemConfigs) {
    for (const topic of problemTopics) {
      if (map[topic]) {
        map[topic].push(name);
      }
    }
  }
  return map;
}

function loadSessionSafe(problemName, workspaceDir) {
  try {
    const sessionPath = path.join(workspaceDir, problemName, "session.json");
    if (!fs.existsSync(sessionPath)) return null;
    const raw = fs.readFileSync(sessionPath, "utf8");
    return JSON.parse(raw);
  } catch {
    // Malformed session.json — skip silently
    return null;
  }
}

function normalize(weights) {
  const result = {};
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);

  if (sum === 0) {
    // All topics avoided — return empty
    return result;
  }

  for (const [topic, weight] of Object.entries(weights)) {
    if (weight === 0) continue; // exclude avoided topics
    result[topic] = weight / sum;
  }

  return result;
}
