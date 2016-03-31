# markdown-toolbar

Brackets extension that adds Markdown editing support via a toolbar.

## Status

The toolbar is now generally functional, so I'm calling this the 1.0.0 release.
Line based items work (headings, lists, and quotes). Selection based items
(bold, italic, monospace) are somewhat reasonable, though they could be
smarter. Paragraph reflow seems to be pretty solid. Still to be implemented are
block-based items (code blocks, tables).

## Preferences

* `markdownbar.showOnStartup`: Display the toolbar when Brackets starts, default false
* `markdownbar.maxLength`: Maximum line length used for reflow, default 80

Example:

```json
{
    ...
    "markdownbar.showOnStartup": true,
    "markdownbar.maxLength": 75
}
```

## Attribution

Icons from [Octicons][https://octicons.github.com/].


