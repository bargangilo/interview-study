# Captures the full settings navigation flow for media/output/settings-menu.gif
#
# Run from the repo root:
#   vhs media/tapes/settings-menu.tape
#
# Prerequisites:
#   - yarn install has been run
#   - Fixture config.json installed (scripts/generate-media.sh handles this)
#   - .agents/config-schema.json must exist

Output media/output/settings-menu.gif

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

# Settings menu: section list visible
Screenshot media/output/settings-menu.png
Sleep 1.5s

# Navigate to Difficulty section (2nd item)
Down
Sleep 0.3s
Enter
Sleep 1.5s

# Difficulty section: shows current values (algo 1-3, ds 2-3, problem 2-3)
Sleep 1.5s

# Select Algorithm complexity range (first field)
Enter
Sleep 1s

# Edit field: range editor with current value "1-3"
# Change to "1-4" — clear existing text and type new value
Backspace
Backspace
Backspace
Type "1-4"
Sleep 0.5s
Enter
Sleep 1.5s

# Back in Difficulty section with updated value
# Navigate to Back
Down
Down
Down
Sleep 0.3s
Enter
Sleep 1s

# Back in Settings menu
# Navigate to Back (last item)
Down
Down
Down
Down
Down
Down
Down
Down
Sleep 0.3s
Enter
Sleep 1s

# Back at main menu
Sleep 1s
