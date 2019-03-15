function anki_test() {
    var result = anki.addItem("test", "1449230346958", [
        ["so12345678me12{{c1:som111e}}", ""], ""
    ]);
    result = result && anki.addItem("test", "1449230346958", [
        ["so12345678me13{{c1:som111e}}", ""], ""
    ]);
    Logger.log("result: %s", result);
}

var anki = (function () {
    const URL_LOGIN = 'https://ankiweb.net/account/login';
    const URL_EDIT = 'https://ankiuser.net/edit/';
    const URL_SAVE = 'https://ankiuser.net/edit/save';
    const REGEX_CSRF_INPUT = /<input type="hidden" name="csrf_token" value="([^"]*)">/i;
    const REGEX_CSRF_JS = /editor.csrf_token2\s=\s'([^']*)';/
    const REGEX_COOKIE = /^([^=]+)=([^;]+);?/
    const SHEET_NAME_FAILED_REQUESTS = 'Failed Anki Requests';
    const username = PropertiesService.getUserProperties().getProperty("anki.username");
    const password = PropertiesService.getUserProperties().getProperty("anki.password");

    return {
        isLoggedIn: false,
        cookies: {},
        login: login,
        addItem: addItem
    };

    function login() {
        Logger.log("anki.login()");
        var loadLoginPageResponse = UrlFetchApp.fetch(URL_LOGIN);
        // Logger.log("Initial Page: %s",loadLoginPageResponse);
        var csrfToken = parseCsrfToken(REGEX_CSRF_INPUT, loadLoginPageResponse);
        var options = {
            'method': 'post',
            'followRedirects': false,
            'payload': {
                'submitted': '1',
                'csrf_token': csrfToken,
                'username': username,
                'password': password
            },
            'headers': {
                'Cookie': 'ankiweb=login'
            }
        };
        var loginResponse = UrlFetchApp.fetch(URL_LOGIN, options);
        var retriesLeft = 10;
        while (loginResponse.getResponseCode() != 302 && retriesLeft-- > 0) {
            Logger.log("Retrying login. Possibly wrong origin ip was used.");
            loginResponse = UrlFetchApp.fetch(URL_LOGIN, options);
        }
        if (loginResponse.getResponseCode() == 302) {
            updateCookies(loginResponse);
            this.isLoggedIn = true;
        } else {
            Logger.log("Unsuccessful loginResponse: %s", loginResponse);
        }
    }

    function addItem(deck, type, data) {
        if (!this.isLoggedIn) {
            this.login();
        }
        var options = {
            "headers": {
                "Cookie": stringifyCookies()
            }
        };
        var editPageResponse = UrlFetchApp.fetch(URL_EDIT, options);
        var csrfToken = parseCsrfToken(REGEX_CSRF_JS, editPageResponse);
        if (!csrfToken) {
            Logger.log("Can''t find csrfToken in editPageResponse: %s", editPageResponse);
            return false;
        }
        options = {
            'method': 'post',
            'headers': {
                "Cookie": stringifyCookies()
            },
            'payload': {
                'data': JSON.stringify(data),
                "csrf_token": csrfToken,
                "mid": type,
                "deck": deck
            },
            'muteHttpExceptions': true
        };

        var addItemResponse = UrlFetchApp.fetch(URL_SAVE, options);
        if (addItemResponse.getResponseCode() != 200 || !parseInt(addItemResponse.getContentText())) {
            logFailedAnkiRequest(deck, type, data);
            Logger.log("Failed to add card with response : %s", addItemResponse);
            return false;
        }
        return true;
    }

    function parseCsrfToken(regex, response) {
        var newCsrfTokens = regex.exec(response);
        if (newCsrfTokens && newCsrfTokens.length > 1) {
            var token = newCsrfTokens[1];
            printCsrfToken(token);
            return token;
        }
        Logger.log("no csrf in response: %s", response);
    }

    function printCsrfToken(token) {
        Logger.log("csrf_encoded: %s", token);
        var firstPart = token.split(".")[0];
        if (firstPart && firstPart.length) {
            tokenToDecode = firstPart + Array(4 - firstPart.length % 4).join("=");
            var tokenBytes = Utilities.base64Decode(tokenToDecode);
            var tokenAsString = tokenBytes.map(function (x) {
                return String.fromCharCode(x);
            }).join('');
            Logger.log("csrf_decoded: %s", tokenAsString);
        }
    }

    function updateCookies(response) {
        var newCookies = response.getAllHeaders()['Set-Cookie'];
        if (newCookies) {
            var parsed = REGEX_COOKIE.exec(newCookies);
            if (parsed && parsed.length > 2) {
                anki.cookies[parsed[1]] = parsed[2];
            }
        }
        Logger.log("cookies: %s", anki.cookies);
    }

    function stringifyCookies() {
        var txt = "";
        for (var cookieName in anki.cookies) {
            txt += cookieName + '=' + anki.cookies[cookieName] + ';';
        }
        Logger.log("cookiesAsString: %s", txt);
        return txt;
    }

    function logFailedAnkiRequest(deck, type, data) {
        var failedAnkiRequestSheet = getSpreadSheet(SHEET_NAME_FAILED_REQUESTS, ['Deck', 'Type', 'Failed Requests']);
        failedAnkiRequestSheet.appendRow([deck, type, JSON.stringify(data)]);
    }
})();
