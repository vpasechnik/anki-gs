function main() {
    processReversoSource({
        userName: 'vpasechnyk',
        deck: 'en::new',
        srcLang: "en",
        trgLang: "ru",
        cardType: '1449230346958'
    });

    processReversoSource({
        userName: 'vpasechnyk',
        deck: 'en::new',
        srcLang: "de",
        trgLang: "ru",
        cardType: '1449230346958'
    });

    processLingvoSource({
        sheetNamePrefix: 'Lingvo',
        deck: 'en::new',
        collocationCardType: '1364049232958',
        wordCardType: '1364049232958',
        sourceFolderName: 'LingvoEn',
        processedFolderName: 'LingvoProcessedEn'
    });

    processLingvoSource({
        sheetNamePrefix: 'Lingvo',
        deck: 'de::new',
        collocationCardType: '1364049232958',
        wordCardType: '1364049232958',
        sourceFolderName: 'LingvoDe',
        processedFolderName: 'LingvoProcessedDe'
    });
    processLingvoSource({
        sheetNamePrefix: 'Lingvo',
        deck: 'pl::new',
        collocationCardType: '1364049232958',
        wordCardType: '1364049232958',
        sourceFolderName: 'LingvoPl',
        processedFolderName: 'LingvoProcessedPl'
    });
}
