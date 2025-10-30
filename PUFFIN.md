# Puffin language

Use the `set` instruction to set a variable value. Variable names can be A-Z, a-z, \_, 0-9 (not prefix).

Basic types are numbers (0.01 precision), strings (only ASCII, `\t`, `\\`, `\"`, `\n' supported), true, false, null, lists, and objects.

```
set foo, 1
set foo, -0.01
set foo, "hello"
set foo, true
set foo, false
set foo, null
set foo, [1, 2, 3]
set foo, {a: 1, b: "hello"}
set foo, [{a:[]}]
```

Set an object property of a variable with `.property_name` and update a list item of a variable with `[index]`. These can be chained.

```
set foo, [1]
set foo[0], 1
```

```
set foo, {}
set foo.message, {}
```

```
set foo, [{}]
set foo[0].message, "hello"
```

`+` (addition), `-` (subtraction), `*` (multiplication), `/` (division), `%` (remainder) operators are supported for numbers.

`==` (equal), `!=` (not equal), `<<` (less than), `<=` (less than or equal), `>>` (greater than), `>=` (greater than or equal) operators are supported for numbers, strings, true, false, and null values. These return either `true` or `false`.

Operator precedence is:

1.  `*`, `/`, `%`
2.  `+`, `-`
3.  `==`, `!=`, `<<`, `<=`, `>>`, `>=`

```
set foo, 1 + 2 - 3 * 4 / 5 % 6
```

```
set foo, 1 == 1
set foo, 1 != 2
set foo, 1 << 2
set foo, 1 <= 2
set foo, 2 >> 1
set foo, 2 >= 1
```

To access a variable value, prefix the variable with `$`.

```
set foo, 1
set bar, $foo + 1
```

Access an object property of a variable value with `.property_name` and a list item of a variable value with `[index]`. These can be chained.

```
set foo, {message: "hello"}
set message, $foo.message
```

```
set foo, [1]
set first, $foo[0]
```

```
set foo, [{message: "hello}]
set first_message, $foo[0].message
```

Use the `do` instruction to execute an expression. Prefix a function name with `@` to call it.

```
do @log(1, 2, 3)
```

Included functions:

-   `size(list_or_object_value)`
-   `and(boolean_value1, boolean_value2, ...)`
-   `or(boolean_value1, boolean_value2, ...)`
-   `random()`: Returns number between 0 (inclusive) and 1 (exclusive).
-   `sqrt()`
-   `stringify(value)`
-   `trunc(number_value)`
-   `format_int()`

Use `#` instruction as a comment.

```
# this is a comment
```

Use the `if` instruction to conditionally run some instructions. This instruction takes one or more expressions that either resolve to `true` or `false`. All expressions must resolve to `true` to run the instruction.

`elseif` and `else` instructions are also included.

```
if a > 0, b > 0:
    # INTEND WITH TAB!
    # multiple instructions allowed
    do @log("a and b are positive")
elseif a > 0:
    do @log("a is positive")
elseif b > 0:
    do @log("b is negative")
else:
    do @log("none are positive")

if a > 0:
    if b > 0:
        # can be nested
        do @log("a and b are positive")
```

Use the `while` instruction to run instructions while the conditions are satisfied.

```
set i, 0
while $i < 3:
    do @log($i + 1)
    set i, $i + 1
```

Use the `for` instruction to run instructions multiple times. It takes a variable name that stores the loop value, the starting number (inclusive), and ending number (exclusive).

```
for i, 0, 3:
    # log 0, 1, 2
    do @log($)
```

Both `while` and `for` instruction supports `break` instruction to break the loop.

```
for i, 0, 3:
    if @random() < 50:
        break
```
