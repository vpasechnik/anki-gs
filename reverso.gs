function testReverso() {
    processReversoSource({
        userName: 'vpasechnyk',
        sheetNamePrefix: 'ReversoTest',
        deck: 'test',
        srcLang: "en",
        trgLang: "ru",
        cardType: '1449230346958'
    });
}

var processReversoSource = function (configuration) {
    const COLUMN_TITLES = ['md5', 'text', 'srcCollocation', 'targetCollocation'];
    const REVERSO_REQUEST_BUCKET_SIZE = 10;
    const ANKI_TAGS = 'auto';
    const userName = configuration.userName;
    const deck = configuration.deck;
    const srcLang = configuration.srcLang;
    const trgLang = configuration.trgLang;
    const cardType = configuration.cardType;
    const sheetNamePrefix = configuration.sheetNamePrefix || 'Reverso';
    const sheetName = sheetNamePrefix + '_' + (srcLang || 'any') + '_' + (trgLang || 'any');

    var collocationsSheet = null;
    var existingCollocations = {};

    run();

    function run() {
        collocationsSheet = getSpreadSheet(sheetName, COLUMN_TITLES);
        existingCollocations = fillExistingCollocationsFromSpreadSheet(collocationsSheet);
        // Logger.log("existingCollocations = %s" , reversoExistingCollocations);
        var data = requestReversoCollocations(userName);
        processReversoResponse(data);
    }

    function getCollocationsSpreadSheet(sheetName, columnTitles) {
        var activeDocument = SpreadsheetApp.getActiveSpreadsheet();
        collocationsSheet = activeDocument.getSheetByName(sheetName);
        if (collocationsSheet == null) {
            collocationsSheet = activeDocument.insertSheet(sheetName);
            collocationsSheet.appendRow(columnTitles);
            Logger.log("Created sheet: %s", sheetName);
        }
        return collocationsSheet;
    }

    function fillExistingCollocationsFromSpreadSheet(collocationsSheet) {
        var existingCollocations = {};
        var range = collocationsSheet.getDataRange();
        var values = range.getValues();
        for (var i = 0; i < values.length; i++) {
            existingCollocations[values[i][0]] = values[i][1];
        }
        return existingCollocations;
    }

    function requestReversoCollocations(userName) {
        var collocationDTOs = [];
        var recordsIndex = 0;
        var recordsTotal;
        do {
            var urlToRequest = getReversoDataUrl(userName, recordsIndex, REVERSO_REQUEST_BUCKET_SIZE);
            var reversoFavoritesResponse = UrlFetchApp.fetch(urlToRequest, {
                'muteHttpExceptions': true
            });
            //Logger.log("Fetched data from reverso by url: %s, data:%s", urlToRequest, reversoFavoritesResponse);
            recordsTotal = JSON.parse(reversoFavoritesResponse).recordsTotal;
            var newCollocations = JSON.parse(reversoFavoritesResponse).data;
            collocationDTOs = collocationDTOs.concat(newCollocations);
            Logger.log("Retrieved %s elements from %s", newCollocations.length, recordsIndex);
            recordsIndex += newCollocations.length;
        } while (recordsIndex < recordsTotal)
        return collocationDTOs;
    }

    function getReversoDataUrl(userName, start, length) {
        return 'http://context.reverso.net/user-profile/user-public-favourites?mode=0&user_name=' + userName + '&start=' + start + '&length=' + length;
    }

    function processReversoResponse(data) {
        Logger.log("Totally retrieved %s elements", data.length);
        for (var i = 0; i < data.length; i++) {
            processReversoCollocationDto(data[i]);
        }
    }

    function processReversoCollocationDto(collocationDto) {
        if (srcLang && srcLang !== collocationDto.srcLang) {
            Logger.log("srcLang doesn't match : %s, data: %s ", srcLang, JSON.stringify(collocationDto));
            return;
        }

        if (trgLang && trgLang !== collocationDto.trgLang) {
            Logger.log("trgLang doesn't match : %s, data: %s ", trgLang, JSON.stringify(collocationDto));
            return;
        }
        var md5 = collocationDto.md5;
        var srcCollocation = collocationDto.srcContext;
        var targetCollocation = collocationDto.trgContext;
        if (!existingCollocations[md5]) {
            createCardForCollocation(md5, srcCollocation, targetCollocation);
        } else {
            Logger.log("Already exist md5: %s, src: %s, dst: %s ", md5, srcCollocation, targetCollocation);
        }
    }

    function createCardForCollocation(md5, srcCollocation, targetCollocation) {
        Logger.log("Adding phrase md5: %s, src: %s, dst: %s ", md5, srcCollocation, targetCollocation);
        var clozeText = getClozeTextForCollocations(srcCollocation, targetCollocation);
        clozeText = removeUnacceptableForAnkiSymbols(clozeText);
        var result = anki.addItem(deck, cardType, [
            [clozeText, ""], ANKI_TAGS
        ]);
        if (result) {
            collocationsSheet.appendRow([md5, clozeText, srcCollocation, targetCollocation]);
        } else {
            Logger.log("Failed to add phrase md5: %s, src: %s, dst: %s ", md5, srcCollocation, targetCollocation);
        }
    }

    function getClozeTextForCollocations(srcCollocation, targetCollocation) {
        var sourceEmphasedText = getEmphasedText(srcCollocation);
        var targetEmphasedText = getEmphasedText(targetCollocation);

        var sourceCloze = srcCollocation.split(/<em[^>]*>/).join("{{c1::").split("</em>").join("::" + targetEmphasedText + "}}")
        var targetCloze = targetCollocation.split(/<em[^>]*>/).join("{{c2::").split("</em>").join("::" + sourceEmphasedText + "}}")
        var clozeText = sourceCloze + "<br/>" + targetCloze;
        return clozeText;
    }

    function getEmphasedText(text) {
        var re = /<em[^>]*>[^<]*<\/em>/g;
        var match = text.match(re);
        var matchWithoutEm = match.map(function (a) {
            return a.replace(/<em[^>]*>/, '').replace('</em>', '');
        });

        var emphasedText = matchWithoutEm.join(' ');
        return emphasedText;
    }
};
