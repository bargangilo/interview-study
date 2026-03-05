# Captures the problem picker for media/output/problem-select.gif and problem-select.png
#
# Run from the repo root:
#   vhs media/tapes/problem-select.tape
#
# Prerequisites:
#   - yarn install has been run
#   - Fixture workspace installed (scripts/generate-media.sh handles this)
#   - sample-problem will show [in progress] badge from fixture session data

Output media/output/problem-select.gif

Set FontSize 13
Set Width 850
Set Height 350
Set Theme "Dracula"
Set PlaybackSpeed 0.75
Set TypingSpeed 80ms

Type "yarn start"
Enter
Sleep 3s

# Main menu: Start a Problem (first item, already highlighted)
Enter
Sleep 1.5s
Screenshot media/output/problem-select.png
Sleep 1s
