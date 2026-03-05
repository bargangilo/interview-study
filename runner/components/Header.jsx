import React from "react";
import { Text } from "ink";

export default function Header({ title, width = 15 }) {
  return (
    <>
      <Text bold>{"  "}{title}</Text>
      <Text color="gray">{"  "}{"─".repeat(width)}</Text>
    </>
  );
}
