// Dark/light theme: applies the saved theme on load and switches it with the [data-cw-theme-toggle] button.
(function () {
    // Same key in every app (CONVENTIONS §11): offline.html reads it to show the offline page in the saved theme.
    var storageKey = 'theme';

    function savedTheme() {
        try {
            return localStorage.getItem(storageKey);
        } catch (e) {
            return null;
        }
    }

    function apply(theme) {
        if (theme === 'light' || theme === 'dark') {
            document.documentElement.setAttribute('data-bs-theme', theme);
        }
    }

    apply(savedTheme());

    document.addEventListener('click', function (event) {
        if (!event.target.closest('[data-cw-theme-toggle]')) {
            return;
        }

        var next = document.documentElement.getAttribute('data-bs-theme') === 'light' ? 'dark' : 'light';
        apply(next);

        try {
            localStorage.setItem(storageKey, next);
        } catch (e) {
            // Without storage the theme still changes, it just isn't remembered.
        }
    });

    // Blazor's enhanced navigation can replace the <html> attributes; apply the theme again after it.
    document.addEventListener('DOMContentLoaded', function () {
        if (window.Blazor) {
            window.Blazor.addEventListener('enhancedload', function () {
                apply(savedTheme());
            });
        }
    });
})();
