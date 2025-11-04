# Scripting

LAV requires 2 scripts:

-   `_init`: Called once at the very start.
-   `_update`: Used to check for inputs and update the screen. Called 100 times per second.

The return value of the `_init` script will be the argument (`arg` variable) of the first `_update` script call. The argument of subsequent `_update` calls will be the return value of the previous `_update` call.

The screen is 192 pixels wide and 144 pixels tall.