function testGoogleDriveSource() {
    processLingvoSource({
        sheetNamePrefix: 'TestLingvo',
        deck: 'test',
        collocationCardType: '1364049232958',
        wordCardType: '1364049232958',
        sourceFolderName: 'TestLingvoEn',
        processedFolderName: 'TestLingvoProcessedEn'
    });
}

function processLingvoSource(configuration) {
    const ANKI_TAGS = 'auto';
    const collocationsColumnTitles = ['side1', 'side2'];
    const wordsColumnTitles = ['word', 'descriptrion'];

    const sheetNamePrefix = configuration.sheetNamePrefix;
    const deck = configuration.deck;
    const collocationCardType = configuration.collocationCardType;
    const wordCardType = configuration.wordCardType;
    const sourceFolderName = configuration.sourceFolderName;
    const processedFolderName = configuration.processedFolderName;
    const collocationsSpreadsheetName = sheetNamePrefix + "Collocations";
    const wordsSpreadsheetName = sheetNamePrefix + "Words";
    const collocationsSpreadsheet = getSpreadSheet(collocationsSpreadsheetName, collocationsColumnTitles);
    const wordsSpreadsheet = getSpreadSheet(wordsSpreadsheetName, wordsColumnTitles);

    run();

    function run() {
        var workingFolder = DriveApp.getFoldersByName(sourceFolderName).next();
        var destinationFolder = DriveApp.getFoldersByName(processedFolderName).next();
        var files = workingFolder.getFiles();

        while (files.hasNext()) {
            var file = files.next();
            if (file.getMimeType() == "text/plain") {
                var remainingContent = filterOutPhrases(file);
                createWordsCard(remainingContent);
                file.makeCopy(destinationFolder);
                workingFolder.removeFile(file);
            }
        }
    }

    function filterOutPhrases(file) {
        var fileContent = file.getBlob().getDataAsString();
        Logger.log("Extracting phrases from file: %s", file.getName());
        var lines = fileContent.split('\n');
        var remainingLines = [];
        var needToSkipNonEmptyLine = false;
        for (var i = 0; i < lines.length; i++) {
            var line = removeUnacceptableForAnkiSymbols(lines[i]);
            if (tryToCreateCollocationCard(line)) {
                Logger.log("saved collocation for : %s", line);
            } else if (needToSkipCurrentLine(line)) {
                Logger.log("Skipping line : %s", line);
            } else if (needToSkipeNextLine(line)) {
                Logger.log("Skipping line with following : %s", line);
                needToSkipNonEmptyLine = true;
            } else if (needToSkipNonEmptyLine) {
                needToSkipNonEmptyLine = false;
                Logger.log("Skipping following line : %s", lines[i]);
            } else {
                Logger.log("Remaining line : %s", lines[i]);
                remainingLines.push(line);
            }
        }
        return remainingLines;
    }

    function tryToCreateCollocationCard(line) {
        var variants = line.split('\u2014');
        if (variants.length == 2) {
            var side1 = variants[0].trim();
            var side2 = variants[1].trim();
            Logger.log("found collocation: %s - %s", side1, side2);
            var result = anki.addItem(deck, collocationCardType, [
                [side1, side2], ANKI_TAGS
            ]);
            if (result) {
                collocationsSpreadsheet.appendRow([side1, side2])
            } else {
                Logger.log("Failed to add phrase %s - %s ", side1, side2);
            }
            return true;
        }
        return false;
    }

    function needToSkipCurrentLine(line) {
        if (line == '') {
            return true;
        }
        if (line.indexOf('-') == 0) {
            return true;
        }
        if (line == '•') {
            return true;
        }
        return false;
    }

    function needToSkipeNextLine(line) {
        return line.indexOf('Syn:') == 0 || line.indexOf('Ant:') == 0;
    }

    function createWordsCard(lines) {
        var firstLine = lines.shift();
        var prononciation = lines.shift();
        Logger.log("prononciation: %s ", prononciation);
        var restLines = lines;
        var side1 = firstLine;
        var side2 = "<div>" + lines.join("</div><div>") + "</div>";
        Logger.log("word card: %s - %s", side1, side2);

        var result = anki.addItem(deck, wordCardType, [
            [side1, side2], ANKI_TAGS
        ]);
        if (result) {
            wordsSpreadsheet.appendRow([side1, side2])
        } else {
            Logger.log("Failed to add word %s - %s ", side1, side2);
        }
    }
}
