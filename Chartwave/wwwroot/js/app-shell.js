// App shell shared by every alexitp1125 app (copied from dev-conventions/pwa).
// Registers the service worker and runs the buttons an installed app needs:
//   data-app-install      Install button (hidden until the app can be installed)
//   data-app-ios-install  <dialog> with the steps for iPhone / iPad
//   data-app-ios-close    closes that dialog
//   data-app-back         back (to "/" when there is no history)
//   data-app-share        share the current page; data-copied = text shown after copying the link
//   data-app-reload       reload the page
// It also keeps <meta name="theme-color"> on the --bg of the active theme.
(function () {
    var installEvent = null;

    function isInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    // iPhone, iPod and iPad (iPadOS reports itself as a Mac with a touch screen).
    function isIos() {
        return /iphone|ipad|ipod/i.test(navigator.userAgent)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    // Install button: visible when the browser offered to install the app, or on iOS (steps).
    function syncInstallButton() {
        var canInstall = !isInstalled() && (installEvent !== null || isIos());
        document.querySelectorAll('[data-app-install]').forEach(function (button) {
            button.hidden = !canInstall;
        });
    }

    function showToast(text) {
        var toast = document.createElement('div');
        toast.setAttribute('role', 'status');
        toast.style.cssText = 'position:fixed;left:50%;bottom:calc(1.25rem + env(safe-area-inset-bottom));'
            + 'transform:translateX(-50%);z-index:2000;padding:.55rem 1rem;border-radius:999px;'
            + 'background:var(--surface);color:var(--text);border:2px solid var(--line);'
            + 'font:500 .85rem var(--font-title);box-shadow:3px 3px 0 var(--accent-2)';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(function () { toast.remove(); }, 2500);
    }

    function shareLink(copiedText) {
        var data = { title: document.title, url: location.href };
        if (navigator.share) {
            navigator.share(data).catch(function () { /* share sheet closed */ });
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(data.url).then(function () { showToast(copiedText || data.url); });
        }
    }

    // Title bar (PC) and status bar (Android) use the --bg of the active theme.
    function syncThemeColor() {
        var meta = document.querySelector('meta[name="theme-color"]');
        var bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
        if (meta && bg) {
            meta.setAttribute('content', bg);
        }
    }

    new MutationObserver(syncThemeColor).observe(document.documentElement,
        { attributes: true, attributeFilter: ['data-theme', 'data-bs-theme'] });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
    }

    // Chrome, Edge and other Chromium browsers: keep the event and show our own button.
    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        installEvent = e;
        syncInstallButton();
    });

    window.addEventListener('appinstalled', function () {
        installEvent = null;
        syncInstallButton();
    });

    document.addEventListener('click', function (e) {
        if (e.target.closest('[data-app-install]')) {
            if (installEvent) {
                installEvent.prompt();
                installEvent.userChoice.then(function () {
                    installEvent = null;
                    syncInstallButton();
                });
            } else {
                var steps = document.querySelector('[data-app-ios-install]');
                if (steps) {
                    steps.showModal();
                }
            }
            return;
        }

        var close = e.target.closest('[data-app-ios-close]');
        if (close) {
            close.closest('dialog').close();
            return;
        }

        if (e.target.closest('[data-app-back]')) {
            if (history.length > 1) {
                history.back();
            } else {
                location.href = '/';
            }
            return;
        }

        var share = e.target.closest('[data-app-share]');
        if (share) {
            shareLink(share.getAttribute('data-copied'));
            return;
        }

        if (e.target.closest('[data-app-reload]')) {
            location.reload();
        }
    });

    // Blazor enhanced navigation re-renders the page: sync the Install button and theme-color again.
    function hookEnhancedLoad(attempt) {
        if (window.Blazor && typeof window.Blazor.addEventListener === 'function') {
            window.Blazor.addEventListener('enhancedload', function () {
                syncInstallButton();
                syncThemeColor();
            });
        } else if (attempt < 100) {
            setTimeout(function () { hookEnhancedLoad(attempt + 1); }, 50);
        }
    }

    hookEnhancedLoad(0);
    syncInstallButton();
    syncThemeColor();
})();
