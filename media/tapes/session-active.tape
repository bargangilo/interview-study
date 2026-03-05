# Captures an active coding session for media/output/session-active.gif
#
# Run from the repo root:
#   vhs media/tapes/session-active.tape
#
# Prerequisites:
#   - yarn install has been run
#   - Fixture workspace/sample-problem/ installed with main.js and session.json
#
# How it works:
#   A background process is scheduled (hidden from the recording) to append
#   a newline to the workspace file after the session starts. This triggers
#   the file watcher, which runs the test suite against the partial scaffold.
#   The tests will mostly fail, producing a realistic summary line showing
#   the save-and-test loop. The timer resumes from the fixture state (8:23).
#
# NOTE: sample-problem is the 4th item in the problem picker (alphabetical).
#   If problem order changes, adjust the Down key count below.

Output media/output/session-active.gif

Set FontSize 13
Set Width 800
Set Height 400
Set Theme "Dracula"
Set PlaybackSpeed 0.75
Set TypingSpeed 80ms

# Schedule a background file touch to trigger the watcher mid-session.
# Hidden so it does not appear in the recording.
Hide
Type "(sleep 18 && echo '' >> workspace/sample-problem/main.js) &"
Enter
Sleep 0.5s
Show

Type "yarn start"
Enter
Sleep 3s

# Main menu: Start a Problem (first item, already highlighted)
Enter
Sleep 1.5s

# Problem picker: navigate to sample-problem (4th item)
Down
Down
Down
Sleep 0.5s
Enter
Sleep 1.5s

# Language select: JavaScript (first option)
Enter
Sleep 1.5s

# Resume/Restart: Resume where you left off (first option)
Enter
Sleep 1.5s

# Countdown prompt: press Enter for stopwatch mode (resume still passes through here)
Enter
Sleep 3s

# Session screen is now visible with timer running from ~8:23
Screenshot media/output/session-active.png
Sleep 6s

# Background touch fires around here — watcher runs tests, results appear
Sleep 4s
