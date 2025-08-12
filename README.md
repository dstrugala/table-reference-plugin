# Table Reference Plugin for Obsidian

Excel-like cell references between tables in Obsidian markdown documents.

## Features

- Cross-table references: `=TableName!A1` to reference cells from other tables
- Easy cell copying: `Ctrl+Shift+C` to copy cell references
- Smart refresh: Update all formulas while keeping them editable
- Hidden formulas: See only values in preview, formulas in edit mode
- Auto table detection: Works with any heading level (`#` to `######`)
- Flexible table positioning: Tables can have descriptions between heading and table

## Quick Start

### 1. Create tables with headings

```markdown
## Sales Q1
| Month | Revenue | 
|-------|---------|
| Jan   | 1000    |
| Feb   | 1500    |

## Summary
| Quarter | Total |
|---------|-------|
| Q1      | =Sales Q1!B1 |
```

### 2. Use formulas

- **Simple reference**: `=A1` (same table)
- **Cross-table reference**: `=TableName!B2`
- **Column mapping**: A=1st column, B=2nd column, etc.
- **Row numbering**: 1=first data row (excluding header)

### 3. Copy cell references

1. Click in any table cell
2. Press `Ctrl+Shift+C`
3. Paste the reference (`=TableName!A1`) in another cell

### 4. Refresh formulas

- **Button**: Click the refresh icon in the ribbon
- **Command**: `Ctrl+P` → "Update Table References"

## How it works

### Table Detection
The plugin automatically detects tables preceded by any heading level:

```markdown
# Main Table          ← H1 heading
## Section Table      ← H2 heading  
#### Detail Table     ← H4 heading

Any description text can go here...

| Column A | Column B |
|----------|----------|
| Data     | More     |
```

### Formula Display
- **Edit mode**: Shows `Formula: =Table!A1 Value` 
- **Preview mode**: Shows only `Value`
- **Refresh preserves formulas**: Formulas stay editable after updates

### Reference Format
- `=A1` → Cell A1 in nearest table above
- `=My Table!C2` → Cell C2 in table named "My Table"
- Column letters: A, B, C, D... (like Excel)
- Row numbers: 1, 2, 3... (first data row = 1)

## Commands & Hotkeys

| Action | Hotkey | Command |
|--------|--------|---------|
| Copy cell reference | `Ctrl+Shift+C` | Copy Cell Reference |
| Update formulas (keep) | - | Update Table References (Keep Formulas) |
| Replace with values | - | Refresh Table References (Replace Formulas) |

## Installation

### Manual Installation

1. Download `main.js` and `manifest.json`
2. Create folder: `VaultName/.obsidian/plugins/table-reference-plugin/`
3. Copy files to the folder
4. In Obsidian: Settings → Community Plugins → Disable Safe Mode
5. Enable "Table Reference Plugin"

### From Community Plugins

*Coming soon to the official plugin directory*

## Examples

### Basic Cross-Reference
```markdown
## Product Data
| Product | Price | Stock |
|---------|-------|-------|
| Widget  | 10.99 | 50    |
| Gadget  | 15.50 | 30    |

## Order Summary  
| Item | Unit Price | Quantity | Total |
|------|------------|----------|-------|
| Widget | =Product Data!B1 | 5 | =Product Data!B1 * 5 |
```

### Copy Cell Reference Workflow
1. Click on "10.99" in Product Data table
2. Press `Ctrl+Shift+C` 
3. Result: `=Product Data!B1` copied to clipboard
4. Paste in another cell, then refresh

## Limitations

- No SUM, AVERAGE, or other Excel functions (values only)
- Manual refresh required (no auto-update)
- Table names must be unique in document
- No circular reference detection warnings

## Troubleshooting

**"Could not determine cell reference"**
- Make sure cursor is inside a table cell
- Verify table has proper markdown format with `|---|---|` separator

**"Table not found"**  
- Check table name matches heading exactly (case-sensitive)
- Ensure heading is within 5 lines above the table

**Formulas not updating**
- Click the refresh button or use command palette
- Check formula syntax: `=TableName!A1`

## Development

Built for Obsidian API 0.15.0+. Uses pure JavaScript with Obsidian Plugin API.

### File Structure
```
table-reference-plugin/
├── main.js          # Core plugin logic
├── manifest.json    # Plugin metadata
└── README.md        # This file
```

## License

MIT License - feel free to modify and distribute.

## Contributing

Found a bug or have a feature request? Please open an issue or submit a pull request!

---
