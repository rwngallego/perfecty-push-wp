'use strict';

function checkFeatures() {
    return ('serviceWorker' in navigator) && ('PushManager' in window);
}

function registerServiceWorker(path, siteUrl, vapidPublicKey64, nonce) {
    navigator.serviceWorker.register(path + '/service-worker-loader.js.php', {scope: '/'}).then(() => {
        return navigator.serviceWorker.ready
    }).then(async (registration) => {
        // we get the push user
        const user = await registration.pushManager.getSubscription();
        if (user) {
            return user;
        }
        const vapidPublicKey = urlBase64ToUint8Array(vapidPublicKey64);
        return registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidPublicKey
        });
    }).then((user) => {
        // we send the registration details to the server
        path = siteUrl + "/wp-json/perfecty-push/v1/register"
        const payload = {
            user: user
        }

        fetch(path, {
            method: 'put',
            headers: {
                'Content-type': 'application/json',
                'X-WP-Nonce': nonce
            },
            body: JSON.stringify(payload)
        })
            .then(resp => resp.json())
            .then(data => {
                if (data && data.success && data.success === true) {
                    localStorage.setItem("perfecty_user_id", data.uuid);
                    setUIUserActive(true);
                } else {
                    return Promise.reject("Unable to save the registration details")
                }
            })
            .catch(err => {
                console.log("Error when sending the registration details", err)
            })
    }).catch(err => {
        console.log('Unable to register the service worker', err)
    })
}

async function askForPermission() {
    let permission = window.Notification.permission
    if (permission !== 'denied') {
        permission = await window.Notification.requestPermission();
    }
    return permission;
}

async function drawDialogControl(options) {
    const dialogControl =
        '<div class="site perfecty-push-dialog-container" id="perfecty-push-dialog-container">' +
        '  <div class="perfecty-push-dialog-box">' +
        '    <div class="perfecty-push-dialog-title">' + options.title + '</div>' +
        '    <div class="perfecty-push-dialog-buttons">' +
        '      <button id="perfecty-push-dialog-cancel" type="button" class="button secondary">' + options.cancel + '</button>' +
        '      <button id="perfecty-push-dialog-subscribe" type="button" class="button primary">' + options.submit + '</button> ' +
        '    </div>' +
        '  </div>' +
        '</div>';
    document.body.insertAdjacentHTML('beforeend', dialogControl);
}

function showDialogControl() {
    const control = document.getElementById('perfecty-push-dialog-container');
    control.style.display = "block";
}

function hideDialogControl() {
    const control = document.getElementById('perfecty-push-dialog-container');
    control.style.display = "none";
}

async function drawSettingsControl(options) {
    const svg = 'data:image/svg+xml;base64,PHN2ZyBhcmlhLWhpZGRlbj0idHJ1ZSIgZm9jdXNhYmxlPSJmYWxzZSIgZGF0YS1wcmVmaXg9ImZhcyIgZGF0YS1pY29uPSJiZWxsIiBjbGFzcz0ic3ZnLWlubGluZS0tZmEgZmEtYmVsbCBmYS13LTE0IiByb2xlPSJpbWciIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDQ0OCA1MTIiPjxwYXRoIGZpbGw9ImN1cnJlbnRDb2xvciIgZD0iTTIyNCA1MTJjMzUuMzIgMCA2My45Ny0yOC42NSA2My45Ny02NEgxNjAuMDNjMCAzNS4zNSAyOC42NSA2NCA2My45NyA2NHptMjE1LjM5LTE0OS43MWMtMTkuMzItMjAuNzYtNTUuNDctNTEuOTktNTUuNDctMTU0LjI5IDAtNzcuNy01NC40OC0xMzkuOS0xMjcuOTQtMTU1LjE2VjMyYzAtMTcuNjctMTQuMzItMzItMzEuOTgtMzJzLTMxLjk4IDE0LjMzLTMxLjk4IDMydjIwLjg0QzExOC41NiA2OC4xIDY0LjA4IDEzMC4zIDY0LjA4IDIwOGMwIDEwMi4zLTM2LjE1IDEzMy41My01NS40NyAxNTQuMjktNiA2LjQ1LTguNjYgMTQuMTYtOC42MSAyMS43MS4xMSAxNi40IDEyLjk4IDMyIDMyLjEgMzJoMzgzLjhjMTkuMTIgMCAzMi0xNS42IDMyLjEtMzIgLjA1LTcuNTUtMi42MS0xNS4yNy04LjYxLTIxLjcxeiI+PC9wYXRoPjwvc3ZnPg==';
    const settingsControl =
        '<div class="perfecty-push-settings-container">' +
        '  <div id="perfecty-push-settings-form">' +
        ' 	 <div>' + options.title + '</div>' +
        '    <input type="checkbox" id="perfecty-push-settings-subscribed" />' +
        '    <label for="perfecty-push-settings-subscribed">' + options.opt_in + '</label>' +
        '    <div id="perfecty-push-settings-notification"></div>' +
        '  </div>' +
        '	 <div id="perfecty-push-settings-open">' +
        '    <img src="' + svg + '" alt="Settings" width="30"/>' +
        '  </div>' +
        '</div>';
    document.body.insertAdjacentHTML('beforeend', settingsControl);

    const subscribedControl = document.getElementById('perfecty-push-settings-subscribed');
    subscribedControl.checked = localStorage.getItem("perfecty_is_user_active") === 'yes';
}

function setUIUserActive(isActive) {
    const subscribedControl = document.getElementById('perfecty-push-settings-subscribed');
    subscribedControl.checked = isActive;
    localStorage.setItem('perfecty_is_user_active', isActive ? 'yes' : 'no');
}

function showSettingsFormControl() {
    const control = document.getElementById('perfecty-push-settings-form');
    control.style.display = "block";
}

function hideSettingsFormControl() {
    const control = document.getElementById('perfecty-push-settings-form');
    control.style.display = "none";
}

function toggleSettingsFormControl() {
    const control = document.getElementById('perfecty-push-settings-form');
    const isDisplayed = control.style.display == 'block';

    control.style.display = isDisplayed ? 'none' : 'block';
    if (control.style.display == 'block') {
        listenToOutsideClick(control);
    }
}

function listenToOutsideClick(formControl) {
    // from jquery: https://github.com/jquery/jquery/blob/master/src/css/hiddenVisibleSelectors.js
    const isVisible = elem => !!elem && !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);

    const documentClickListener = (event) => {
        if (!formControl.contains(event.target) && isVisible(formControl)) {
            toggleSettingsFormControl();
            removeClickListener();
        }
    }
    const removeClickListener = () => {
        document.removeEventListener('click', documentClickListener);
    }

    document.addEventListener('click', documentClickListener);
}

// taken from https://github.com/mozilla/serviceworker-cookbook/blob/e912ace6e9566183e06a35ef28516af7bd1c53b2/tools.js
function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function showMessage(message) {
    const divMessage = document.getElementById('perfecty-push-settings-notification');
    divMessage.textContent = message;
}

function setUserActive(nonce, siteUrl, userId, isActive) {
    const path = siteUrl + "/wp-json/perfecty-push/v1/user/active"
    const payload = {
        user_id: userId,
        is_active: isActive
    }

    return fetch(path, {
        method: 'put',
        headers: {
            'Content-type': 'application/json',
            'X-WP-Nonce': nonce
        },
        body: JSON.stringify(payload)
    })
        .then(resp => resp.json())
        .then(data => {
            if (data && data.success && data.success === true) {
                return true;
            } else {
                return false;
            }
        });
}

function detectConflictInstallations(unregisterConflicts) {
    let conflictDetected = false
    let perfectyPushFound = false
    return navigator.serviceWorker.getRegistration("/").then(function (registration) {
        let promises = []
        if (typeof registration !== "undefined" && registration.active != null && registration.active.scriptURL != null) {
            if (/perfecty/i.test(registration.active.scriptURL)) {
                perfectyPushFound = true
            } else {
                conflictDetected = true

                if (unregisterConflicts === true) {
                    console.log("Unregistering conflict installation: " + registration.active.scriptURL)
                    promises.push(registration.unregister())
                }
            }
        }
        return Promise.all(promises).then(() => {
            return Promise.resolve([conflictDetected, perfectyPushFound])
        })
    });
}

async function perfectyStart(options) {
    if (checkFeatures() && !options.disabled) {
        // Draw dialog
        drawDialogControl(options.dialogControl);
        drawSettingsControl(options.settingsControl);

        // Notification permission
        let permission = Notification.permission;
        let askedForNotifications = localStorage.getItem("perfecty_asked_notifications") === "yes";
        if (permission === 'default' && !askedForNotifications) {
            showDialogControl();
        } else if (permission === 'granted') {
            // as we already have 'granted' permissions, we check if it was an external worker
            detectConflictInstallations(options.unregisterConflicts).then(([conflictDetected, perfectyPushFound]) => {
                if ((conflictDetected && options.unregisterConflicts) || !perfectyPushFound) {
                    // we didn't find our worker or we removed an external worker
                    // so we register ours again
                    registerServiceWorker(options.path, options.siteUrl, options.vapidPublicKey, options.nonce);
                }
            })
        }

        document.getElementById('perfecty-push-dialog-subscribe').onclick = async () => {
            localStorage.setItem("perfecty_asked_notifications", "yes");
            hideDialogControl();
            permission = await askForPermission();
            if (permission === 'granted') {
                // We only register the service worker and the push manager
                // when the user has granted us permissions or if there's already existing installs
                registerServiceWorker(options.path, options.siteUrl, options.vapidPublicKey, options.nonce);
            } else {
                console.log('Notification permission not granted')
            }
        };

        document.getElementById('perfecty-push-dialog-cancel').onclick = async () => {
            localStorage.setItem("perfecty_asked_notifications", "yes");
            hideDialogControl();
        }

        document.getElementById('perfecty-push-settings-open').onclick = async (e) => {
            e.stopPropagation();
            toggleSettingsFormControl();
        }

        document.getElementById('perfecty-push-settings-subscribed').onchange = async (event) => {
            const checked = event.target.checked;
            if (checked == true && permission === 'default') {
                showDialogControl();
            } else if (checked === true && permission === 'denied') {
                showMessage("You need to allow notifications for this website");
            } else if (checked === true && permission === 'granted') {
                // Activate the user
                const userId = localStorage.getItem("perfecty_user_id");
                setUserActive(options.nonce, options.siteUrl, userId, true)
                    .then((success) => {
                        if (success === true) {
                            setUIUserActive(true);
                        } else {
                            showMessage("Could not change the preference, try again");
                        }
                    })
            } else {
                // Deactivate the user
                const userId = localStorage.getItem("perfecty_user_id");
                setUserActive(options.nonce, options.siteUrl, userId, false)
                    .then((success) => {
                        if (success === true) {
                            setUIUserActive(false);
                        } else {
                            showMessage("Could not change the preference, try again");
                        }
                    });
            }
        }
    } else {
        console.log('Browser doesn\'t support notifications or the widget is disabled');
    }
}

window.onload = () => {
    // defined outside in the html body
    const options = window.PerfectyPushOptions;
    perfectyStart(options);
};