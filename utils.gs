function getSpreadSheet(sheetName, columnTitles) {
    var activeDocument = SpreadsheetApp.getActiveSpreadsheet();
    collocationsSheet = activeDocument.getSheetByName(sheetName);
    if (collocationsSheet == null) {
        collocationsSheet = activeDocument.insertSheet(sheetName);
        collocationsSheet.appendRow(columnTitles);
        Logger.log("Created sheet: %s", sheetName);
    }
    return collocationsSheet;
}

function removeUnacceptableForAnkiSymbols(str) {
    return str.replace(/[\x00-\x19\x3b]/g, '');
}
