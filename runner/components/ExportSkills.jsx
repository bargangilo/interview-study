import React, { useState, useEffect } from "react";
import { Text } from "ink";
import { useInput } from "ink";
import { execFile } from "child_process";
import path from "path";
import { Action } from "../state.js";

export default function ExportSkills({ dispatch, rootDir }) {
  const [status, setStatus] = useState("running");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const script = path.join(rootDir, ".agents", "scripts", "init-skills.js");
    execFile("node", [script], { cwd: rootDir }, (err, stdout, stderr) => {
      if (err) {
        setStatus("error");
        setError(stderr || err.message);
      } else {
        setStatus("done");
        setOutput(stdout);
      }
    });
  }, [rootDir]);

  useInput(() => {
    if (status !== "running") {
      dispatch({ type: Action.BACK });
    }
  });

  if (status === "running") {
    return <Text>{"  "}Exporting skills...</Text>;
  }

  if (status === "error") {
    return (
      <>
        <Text color="red">{"  "}Export failed: {error}</Text>
        <Text dimColor>{"  "}Press any key to return.</Text>
      </>
    );
  }

  return (
    <>
      <Text>{"\n"}  Skills exported for non-Claude-Code agents:{"\n"}</Text>
      {output.trim().split("\n").map((line, i) => (
        <Text key={i}>{"  "}{line}</Text>
      ))}
      <Text>{""}</Text>
      <Text dimColor>{"  "}Press any key to return.</Text>
    </>
  );
}
