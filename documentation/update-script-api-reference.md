# Update script API reference

## draw_sprite()

Draws a sprite at a position.

```
draw_sprite(sprite_id, x, y, flip_x, flip_y)
```

### Parameters

-   `sprite_id` (string): A valid sprite ID.
-   `x` (number): The coordinate of the center of sprite. If it's not an integer, the decimal part is removed.
-   `y` (number): The coordinate of the center of sprite. If it's not an integer, the decimal part is removed.
-   `flip_x` (`true`, `false`): If `true`, flips the sprite on the Y-axis.
-   `flip_x` (`true`, `false`): If `true`, flips the sprite on the X-axis.

### Return value

Returns `null`.

## fill_sprite()

Draws a sprite at a position with all solid-color pixels set to a single color.

```
fill_sprite(sprite_id, full_color, color_id, x, y, flip_x, flip_y)
```

### Parameters

-   `sprite_id` (string): A valid sprite ID.
-   `full_color` (`true`, false)
-   `color_id` (number): An integer between 0 (inclusive) and 63 (inclusive).
-   `x` (number): The coordinate of the center of sprite. If it's not an integer, the decimal part is removed.
-   `y` (number): The coordinate of the center of sprite. If it's not an integer, the decimal part is removed.
-   `flip_x` (`true`, false): If `true`, flips the sprite on `the` Y-axis.
-   `flip_x` (true, false): If `true`, flips the sprite on the X-axis.

### Return value

Returns `null`.

## fill_character()

Draws a character sprite at a position with all solid-color pixels set to a single color.

```
fill_sprite(character, full_color, color_id, x, y, flip_x, flip_y)
```

### Parameters

-   `character` (string): `a-z`, `0-9`, `.`, `,`, `!`, `?`.
-   `full_color` (true, false)
-   `color_id` (number): An integer between 0 (inclusive) and 63 (inclusive).
-   `x` (number): The coordinate of the center of sprite. If it's not an integer, the decimal part is removed.
-   `y` (number): The coordinate of the center of sprite. If it's not an integer, the decimal part is removed.
-   `flip_x` (`true`, false): If `true`, flips the sprite on the Y-axis.
-   `flip_x` (`true`, false): If `true`, flips the sprite on the X-axis.

### Return value

Returns `null`.

## fill_background()

Fills the background.

```
fill_background(solid_color, full_color, color_id)
```

### Parameters

-   `solid_color` (`true`, `false`)
-   `full_color` (`true`, `false`)
-   `color_id` (number): An integer between 0 (inclusive) and 63 (inclusive).

### Return value

Returns `null`.

## check_input()

Checks for an active input (allows hold):

-   `a`: Space bar on keyboard or down/right button on controller.
-   `b`: Shift on keyboard or up/left button on controller.
-   `up`: Up arrow key on keyboard or up D-pad on controller.
-   `down`: Down arrow key on keyboard or down D-pad on controller.
-   `left`: Left arrow key on keyboard or left D-pad on controller.
-   `right`: Right arrow key on keyboard or right D-pad on controller.

Use `check_frame_input()` to check for an input that was activated during the current frame.

```
check_input(input)
```

### Parameters

-   `input` (string): Input ID (see above).

## Return value

Returns `true` if the input is on, `false` if not.

## check_frame_input()

Checks for an input that was activated during the current frame.

Use `check_input()` to check if an input is active.

```
check_input(input)
```

### Parameters

-   `input` (string): Input ID (see `check_input()`).

## Return value

Returns `true` if the input was activated during the current frame, `false` if not.

## play_audio_clip()

Play an audio clip.

```
play_audio_clip(audio_clip_id)
```

### Parameters

-   `audio_clip_id` (string)

### Return value

Returns `null`.

## play_audio_clip()

Play an audio clip.

```
play_audio_clip(audio_clip_id)
```

### Parameters

-   `audio_clip_id` (string)

### Return value

Returns `null`.

## run_script()

Runs a script. The script has access to the update script API.

```
run_script(script_id, argument)
```

### Parameters

-   `script_id` (string)
-   `argument` (any)

### Return value

Returns the script return value.

## get_sprite_pixel_color()

Gets the color ID of a sprite at a pixel position.

```
get_sprite_pixel_color(sprite_id, pixel_position)
```

### Parameters

-   `sprite_id` (string)
-   `pixel_position` (number): Between 0 (inclusive) and 255 (inclusive).

### Returns

A number value of the color ID.

## log()

Logs values to the browser console.

Any number of arguments can be passed.

```
log(values...)
```

### Parameters

-   `value` (any)

### Return value

Returns `null`.

## Notes

-   `draw_sprite()`, `fill_sprite()`, `fill_character()`, and `fill_background()` queues the render operation so all the `fill_background()` operations are prioritized. But most people call `fill_background()` first anyway so there's not much benefit to this approach and costs us some performance. The fill/draw methods should draw to the canvas directly and `fill_background()` should be replaced with `fill_screen()` or something. Or even `fill()` with a position and a size parameter.
-   A transparent background shouldn't exist. `fill_background()` should've only had two parameters - `full_color` and `color_id`.
