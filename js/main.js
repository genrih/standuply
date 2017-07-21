
// Client ID and API key from the Developer Console
var CLIENT_ID = '516803791757-ulh2lill4n7738eqofh3sqhepikjrfps.apps.googleusercontent.com';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

var authorizeButton = document.getElementById('authorize-button');
var signoutButton = document.getElementById('signout-button');

var userId = 'test.brocoders@gmail.com';

/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
    gapi.client.init({
        discoveryDocs: DISCOVERY_DOCS,
        clientId: CLIENT_ID,
        scope: SCOPES
    }).then(function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

        // Handle the initial sign-in state.
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        authorizeButton.onclick = handleAuthClick;
        signoutButton.onclick = handleSignoutClick;
    });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        authorizeButton.style.display = 'none';
        signoutButton.style.display = 'block';
        listThreads(userId, '', groupMessages);
    } else {
        authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';
    }
}

function groupMessages(result) {
    result.forEach(function(item) {
        getThread(userId, item.id, printTitle);
    });
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
    gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
    gapi.auth2.getAuthInstance().signOut();
}

/**
 * Append a pre element to the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 * @param {string} message Text to be placed in pre element.
 */
function appendPre(message) {
    var pre = document.getElementById('content');
    var textContent = document.createTextNode(message + '\n');
    pre.appendChild(textContent);
}

function listThreads(userId, query, callback) {
    var getPageOfThreads = function(request, result) {
        request.execute(function (resp) {
            result = result.concat(resp.threads);
            var nextPageToken = resp.nextPageToken;
            if (nextPageToken) {
                request = gapi.client.gmail.users.threads.list({
                    'userId': userId,
                    'q': query,
                    'pageToken': nextPageToken
                });
                getPageOfThreads(request, result);
            } else {
                callback(result, userId);
            }
        });
    };
    var request = gapi.client.gmail.users.threads.list({
        'userId': userId,
        'q': query
    });
    getPageOfThreads(request, []);
}

function getThread(userId, threadId, callback) {
    var request = gapi.client.gmail.users.threads.get({
        'userId': userId,
        'id': threadId
    });
    request.execute(callback);
}

function printMessage(res) {
    var messages = '',
        modal = $('#modal');

    res.messages.forEach(function(message) {
        messages = messages + getText(message);
    });

    modal.modal('show');
    modal.find('.modal-header').html(getSubject(res.messages));
    modal.find('.modal-body').html(messages);
}

function printTitle(result) {
    var dateReg = /\d{1,4}([./-])\d{1,4}\1\d{1,4}/,
        title = getSubject(result.messages);

    if (title.match(/brocoders/i)) {
        var date = title.match(dateReg)
        if (date) { date = date[0] }
        $('#content .table tbody').append("<tr><td>" + date + "</td><td><a href='#' class='thread-link' data-thread="+ result.id + ">" + title + "</a></td></tr>");
    }
}

$('body').on('click', '.thread-link', function(e) {
    var clicked = $(this);
    e.preventDefault();
    getThread(userId, $(this).data( "thread" ), printMessage);
});

function decode(string) {
    return decodeURIComponent(escape(atob(string.replace(/\-/g, '+').replace(/\_/g, '/'))));
}

function getText(response) {
    var parts = [response.payload];

    while (parts.length) {
        var part = parts.shift();
        if (part.parts) {
            parts = parts.concat(part.parts);
        }

        if(part.mimeType === 'text/html') {
            var decodedPart = decodeURIComponent(escape(atob(part.body.data.replace(/\-/g, '+').replace(/\_/g, '/'))));
            return decodedPart;
        }
    }
}

function getSubject(response) {
    var headers = [response[0].payload];

    while (headers.length) {
        var header = headers.shift();
        if (header.headers) {
            headers = headers.concat(header.headers);
        }
        if(header.name == 'Subject') {
            return header.value;
        }
    }
}
