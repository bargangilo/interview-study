# Captures a focused field editing experience for media/output/settings-edit.gif
#
# Run from the repo root:
#   vhs media/tapes/settings-edit.tape
#
# Shows editing the Topics include list: clearing the current value and
# typing a new topic list.
#
# Prerequisites:
#   - yarn install has been run
#   - Fixture config.json installed (scripts/generate-media.sh handles this)
#   - .agents/config-schema.json must exist

Output media/output/settings-edit.gif

Set FontSize 13
Set Width 850
Set Height 350
Set Theme "Dracula"
Set PlaybackSpeed 0.75
Set TypingSpeed 80ms

Type "yarn start"
Enter
Sleep 3s

# Main menu: navigate to Settings (4th item)
Down
Down
Down
Sleep 0.3s
Enter
Sleep 2s

# Settings menu: select Topics (first item)
Enter
Sleep 1.5s

# Topics section with current values visible
Screenshot media/output/settings-edit.png
Sleep 1s

# Select "Practice topics" field (first item)
Enter
Sleep 1s

# Edit field: TextInput pre-populated with current topics
# "arrays, hash maps, trees, strings, binary search, stacks" (56 chars)
# Clear the existing text (hidden for visual clarity)
Hide
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Backspace
Show

# Type new topic list
Type "arrays, hash maps, binary search, trees"
Sleep 500ms
Enter
Sleep 1.5s

# Back in Topics section with updated values
Sleep 1.5s
