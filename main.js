const { Plugin, MarkdownView, Notice } = require('obsidian');

class TableReferencePlugin extends Plugin {
    async onload() {
        console.log('Loading Table Reference Plugin');

        // Dodaj CSS do ukrycia formuł
        this.addStyle();

        // Dodaj command do menu - zastąp wartości
        this.addCommand({
            id: 'refresh-table-references',
            name: 'Refresh Table References (Replace Formulas)',
            callback: () => {
                this.refreshTableReferences(false); // false = replace formulas
            }
        });

        // Dodaj command do menu - zachowaj formuły
        this.addCommand({
            id: 'update-table-references',
            name: 'Update Table References (Keep Formulas)',
            callback: () => {
                this.refreshTableReferences(true); // true = keep formulas
            }
        });

        // Dodaj button do ribbon - domyślnie zachowuj formuły
        this.addRibbonIcon('refresh-cw', 'Update Table References (Keep Formulas)', () => {
            this.refreshTableReferences(true);
        });

        // Dodaj command do kopiowania referencji komórki
        this.addCommand({
            id: 'copy-cell-reference',
            name: 'Copy Cell Reference',
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'C' }],
            editorCallback: (editor, view) => {
                this.copyCellReferenceFromCursor(editor, view);
            }
        });
    }

    copyCellReferenceFromCursor(editor, view) {
        try {
            const cursor = editor.getCursor();
            const content = view.data; // Użyj view.data (działający sposób)
            const lines = content.split('\n');

            console.log('=== COPY CELL REFERENCE DEBUG ===');
            console.log('Cursor position:', cursor);
            console.log('Current line:', lines[cursor.line]);

            // Znajdź wszystkie tabele
            const tablesWithPositions = this.extractTablesWithPositions(lines);
            console.log('Tables found:', tablesWithPositions);

            // Znajdź tabelę zawierającą kursor
            for (const tableInfo of tablesWithPositions) {
                if (cursor.line >= tableInfo.startLine && cursor.line <= tableInfo.endLine) {
                    const rowIndex = cursor.line - tableInfo.dataStartLine;
                    const colIndex = this.getColumnIndexFromPosition(lines[cursor.line], cursor.ch);

                    if (rowIndex >= 0 && colIndex >= 0) {
                        const colLetter = this.indexToColumn(colIndex);
                        const rowNumber = rowIndex + 1;

                        let cellRef;
                        if (tableInfo.name === 'default') {
                            cellRef = `=${colLetter}${rowNumber}`;
                        } else {
                            cellRef = `=${tableInfo.name}!${colLetter}${rowNumber}`;
                        }

                        navigator.clipboard.writeText(cellRef);
                        new Notice(`Copied: ${cellRef}`);
                        return;
                    }
                }
            }

            new Notice('Could not determine cell reference - make sure cursor is in a table');
        } catch (error) {
            new Notice(`Error: ${error.message}`);
            console.error('Copy cell reference error:', error);
        }
    }

    getColumnIndexFromPosition(lineText, charPosition) {
        if (!lineText.includes('|')) return -1;

        const beforeCursor = lineText.substring(0, charPosition);
        const pipeCount = (beforeCursor.match(/\|/g) || []).length;

        return Math.max(0, pipeCount - 1);
    }

    extractTablesWithPositions(lines) {
        // Użyj istniejącej działającej metody extractTables
        const tablesMap = this.extractTables(lines);

        // Konwertuj Map na Array z pozycjami
        const tables = [];

        for (let [tableName, tableData] of tablesMap) {
            // Znajdź pozycje tej tabeli w liniach
            let tableStart = -1;
            let dataStart = -1;
            let tableEnd = -1;

            // Szukaj nagłówka tabeli w dokumencie
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Sprawdź czy to nagłówek dla tej tabeli
                if (line.startsWith('#') && line.replace(/^#+\s*/, '').trim() === tableName) {
                    // Znajdź początek tabeli po tym nagłówku
                    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
                        if (this.isTableRow(lines[j]) && lines[j + 1] && this.isTableSeparator(lines[j + 1])) {
                            tableStart = j;
                            dataStart = j + 2; // Po headerze i separatorze

                            // Znajdź koniec tabeli
                            for (let k = dataStart; k < lines.length; k++) {
                                if (this.isTableRow(lines[k]) && !this.isTableSeparator(lines[k])) {
                                    tableEnd = k;
                                } else if (!this.isTableRow(lines[k]) && lines[k].trim() === '') {
                                    break;
                                }
                            }
                            break;
                        }
                    }
                    break;
                }
            }

            if (tableStart !== -1) {
                tables.push({
                    name: tableName,
                    startLine: tableStart,
                    dataStartLine: dataStart,
                    endLine: tableEnd
                });
            }
        }

        return tables;
    }

    indexToColumn(index) {
        let result = '';
        while (index >= 0) {
            result = String.fromCharCode('A'.charCodeAt(0) + (index % 26)) + result;
            index = Math.floor(index / 26) - 1;
        }
        return result;
    }

    addStyle() {
        const css = `
        /* Ukryj formuły w podglądzie, pokaż w edycji */
        .markdown-preview-view span[data-formula] {
            display: none !important;
        }
        
        .markdown-source-view span[data-formula] {
            background: #3a3a3a;
            color: #00ff00;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 0.9em;
        }
        
        .markdown-source-view span[data-formula]:before {
            content: "Formula: ";
            color: #888;
        }
        `;

        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        this.styleElement = style;
    }

    onunload() {
        console.log('Unloading Table Reference Plugin');

        // Usuń dodany CSS
        if (this.styleElement) {
            this.styleElement.remove();
        }
    }

    refreshTableReferences(keepFormulas = false) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active markdown view');
            return;
        }

        const editor = activeView.editor;
        const content = editor.getValue();

        try {
            const updatedContent = this.processTableReferences(content, keepFormulas);
            editor.setValue(updatedContent);

            const message = keepFormulas ?
                'Table references updated! (Formulas kept)' :
                'Table references refreshed! (Formulas replaced)';
            new Notice(message);
        } catch (error) {
            new Notice(`Error: ${error.message}`);
            console.error('Table reference error:', error);
        }
    }

    processTableReferences(content, keepFormulas = false) {
        const lines = content.split('\n');
        const tables = this.extractTables(lines);

        return lines.map(line => {
            if (this.isTableRow(line)) {
                return this.processTableRow(line, tables, keepFormulas);
            }
            return line;
        }).join('\n');
    }

    extractTables(lines) {
        const tables = new Map();
        let currentTable = [];
        let currentTableName = 'default';
        let inTable = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Sprawdź czy to nazwa tabeli (header) - szukaj tabeli w następnych 5 liniach
            if ((line.startsWith('#') && !line.startsWith('#######'))) {
                const potentialTableName = line.replace(/^#+\s*/, '').trim();

                // Szukaj tabeli w następnych 5 liniach
                let foundTableAt = -1;
                for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
                    if (this.isTableRow(lines[j]) && lines[j + 1] && this.isTableSeparator(lines[j + 1])) {
                        foundTableAt = j;
                        break;
                    }
                }

                if (foundTableAt !== -1) {
                    // Zapisz poprzednią tabelę jeśli istnieje
                    if (currentTable.length > 0) {
                        tables.set(currentTableName, currentTable);
                    }

                    currentTableName = potentialTableName;
                    currentTable = [];
                    inTable = false;
                }
            }

            // Sprawdź czy to wiersz tabeli
            if (this.isTableRow(line)) {
                if (!inTable && lines[i + 1] && this.isTableSeparator(lines[i + 1])) {
                    // To jest header tabeli - pomiń go
                    inTable = true;
                } else if (inTable && !this.isTableSeparator(line)) {
                    // To jest wiersz danych
                    const cells = this.parseTableRow(line);
                    currentTable.push(cells);
                }
            } else if (inTable && line.trim() === '') {
                // Koniec tabeli
                if (currentTable.length > 0) {
                    tables.set(currentTableName, currentTable);
                    currentTable = [];
                }
                inTable = false;
            }
        }

        // Dodaj ostatnią tabelę jeśli istnieje
        if (currentTable.length > 0) {
            tables.set(currentTableName, currentTable);
        }

        return tables;
    }

    isTableRow(line) {
        return line.trim().startsWith('|') && line.trim().endsWith('|');
    }

    isTableSeparator(line) {
        return line && line.includes('---') && this.isTableRow(line);
    }

    parseTableRow(line) {
        // Najpierw znajdź wszystkie linki [[...]] i zamień je na placeholdery
        const links = [];
        let tempLine = line;
        let linkMatch;
        let linkIndex = 0;

        while ((linkMatch = tempLine.match(/\[\[.*?\]\]/)) !== null) {
            const placeholder = `__LINK_${linkIndex}__`;
            links.push({
                placeholder: placeholder,
                original: linkMatch[0]
            });
            tempLine = tempLine.replace(linkMatch[0], placeholder);
            linkIndex++;
        }

        // Teraz parsuj normalnie (bez linków)
        const cells = tempLine.split('|')
            .slice(1, -1) // usuń pierwszy i ostatni pusty element
            .map(cell => cell.trim());

        // Przywróć linki w komórkach
        const restoredCells = cells.map(cell => {
            let restoredCell = cell;
            links.forEach(link => {
                restoredCell = restoredCell.replace(link.placeholder, link.original);
            });
            return restoredCell;
        });

        return restoredCells;
    }

    processTableRow(line, tables, keepFormulas = false) {
        const cells = this.parseTableRow(line);
        const processedCells = cells.map(cell => {
            // Sprawdź czy to ukryta formuła w span
            const spanMatch = cell.match(/^<span data-formula="([^"]+)" style="display:none"><\/span>(.+)$/);
            if (spanMatch) {
                try {
                    const formula = spanMatch[1];
                    const result = this.resolveReference(formula, tables);

                    // Zwróć ukrytą formułę z nową wartością
                    return `<span data-formula="${formula}" style="display:none"></span>${result}`;
                } catch (error) {
                    return `<span data-formula="${formula}" style="display:none"></span>ERROR: ${error.message}`;
                }
            }

            // Sprawdź czy to PRAWIDŁOWA formuła
            if (cell.startsWith('=') && !cell.includes('NaN') && !cell.includes('ERROR')) {
                try {
                    const result = this.resolveReference(cell, tables);

                    if (keepFormulas) {
                        // Ukryj formułę w span, pokaż tylko wartość
                        return `<span data-formula="${cell}" style="display:none"></span>${result}`;
                    } else {
                        // Zwróć tylko wartość
                        return result;
                    }
                } catch (error) {
                    return `ERROR: ${error.message}`;
                }
            }

            // Usuń poprzednie komentarze jeśli istnieją
            const cleanCell = cell.replace(/\s*<!--.*?-->\s*$/, '').trim();
            return cleanCell;
        });

        return '| ' + processedCells.join(' | ') + ' |';
    }

    resolveReference(formula, tables, visited = new Set()) {
        // Sprawdź cykliczne referencje
        if (visited.has(formula)) {
            throw new Error(`Circular reference detected: ${formula}`);
        }
        visited.add(formula);

        // Usuń znak =
        const ref = formula.substring(1);

        // Sprawdź czy to referencja do innej tabeli (Table1!A1)
        const crossTableMatch = ref.match(/^(.+)!([A-Z]+)(\d+)$/);
        if (crossTableMatch) {
            const tableName = crossTableMatch[1];
            const col = crossTableMatch[2];
            const row = parseInt(crossTableMatch[3]);
            return this.getCellValue(tableName, col, row, tables, visited);
        }

        // Sprawdź czy to prosta referencja (A1)
        const simpleMatch = ref.match(/^([A-Z]+)(\d+)$/);
        if (simpleMatch) {
            const col = simpleMatch[1];
            const row = parseInt(simpleMatch[2]);
            return this.getCellValue('default', col, row, tables, visited);
        }

        throw new Error(`Invalid reference format: ${formula}`);
    }

    getCellValue(tableName, column, row, tables, visited = new Set()) {
        const table = tables.get(tableName);
        if (!table) {
            throw new Error(`Table '${tableName}' not found. Available: ${Array.from(tables.keys()).join(', ')}`);
        }

        // Konwertuj kolumnę (A=0, B=1, etc.)
        const colIndex = this.columnToIndex(column);
        const rowIndex = row - 1; // Numeracja od 1

        if (rowIndex < 0 || rowIndex >= table.length) {
            throw new Error(`Row ${row} out of range in table '${tableName}' (has ${table.length} rows)`);
        }

        if (colIndex < 0 || colIndex >= table[rowIndex].length) {
            throw new Error(`Column ${column} (index ${colIndex}) out of range in table '${tableName}' row ${row} (has ${table[rowIndex].length} columns)`);
        }

        const value = table[rowIndex][colIndex];

        // Jeśli wartość to też formuła, rozwiąż ją rekurencyjnie
        if (value.startsWith('=')) {
            return this.resolveReference(value, tables, visited);
        }

        return value;
    }

    columnToIndex(column) {
        let result = 0;
        for (let i = 0; i < column.length; i++) {
            result = result * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
        }
        return result - 1;
    }
}

module.exports = TableReferencePlugin;