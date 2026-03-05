# Captures the main menu for media/output/main-menu.gif and main-menu.png
#
# Run from the repo root:
#   vhs media/tapes/main-menu.tape
#
# Prerequisites:
#   - yarn install has been run
#   - Fixture config.json installed (scripts/generate-media.sh handles this)

Output media/output/main-menu.gif

Set FontSize 13
Set Width 850
Set Height 350
Set Theme "Dracula"
Set PlaybackSpeed 0.75
Set TypingSpeed 80ms

Type "yarn start"
Enter
Sleep 3s
Screenshot media/output/main-menu.png
Sleep 1s
