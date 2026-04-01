/* ===== main.js — Perplexity Chatbot with RAG ===== */

const SUGGESTIONS = {
    monitor: [
        "Monitor a competitor daily for any changes",
        "Watch for job postings at target companies",
        "Track a market trend with weekly reports",
        "Track regulatory changes in my industry",
        "Watch industry news and flag important stories"
    ],
    organise: [
        "Create a weekly meal plan based on my preferences",
        "Organise my travel documents for the upcoming trip",
        "Set up a personal finance tracker for monthly expenses",
        "Plan a workout routine for the next 4 weeks",
        "Categorise my reading list by genre and priority"
    ],
    prototype: [
        "Draft a technical specification for a new mobile app",
        "Create a wireframe layout for a landing page",
        "Write a sample API contract for a weather service",
        "Generate a CSS color palette for a dark-themed UI",
        "Outline a database schema for a blog platform"
    ]
};

/* Wait for DOM to be fully ready */
document.addEventListener('DOMContentLoaded', function () {

    /* ---------- DOM references ---------- */
    var searchInput     = document.getElementById('search-input');
    var submitBtn       = document.getElementById('submit-btn');
    var uploadBtn       = document.getElementById('upload-btn');
    var fileInput       = document.getElementById('file-upload');
    var messagesBox     = document.getElementById('messages-container');
    var loader          = document.getElementById('loader');
    var suggestionsList = document.getElementById('suggestions-list');
    var fileStatusArea  = document.getElementById('file-status-area');
    var tabs            = document.querySelectorAll('.tab');

    /* Init Lucide icons */
    if (window.lucide) lucide.createIcons();

    /* ---------- Suggestions ---------- */
    function showSuggestions(category) {
        var items = SUGGESTIONS[category] || [];
        suggestionsList.innerHTML = '';
        items.forEach(function (text) {
            var pill = document.createElement('div');
            pill.className = 'suggestion-pill';
            pill.textContent = text;
            pill.addEventListener('click', function () { sendMessage(text); });
            suggestionsList.appendChild(pill);
        });
    }

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabs.forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
            showSuggestions(tab.getAttribute('data-category'));
        });
    });

    showSuggestions('monitor'); // default

    /* ---------- Chat ---------- */
    function sendMessage(text) {
        text = (text || '').trim();
        if (!text) return;

        messagesBox.classList.remove('hidden');
        appendMsg(text, 'user');
        searchInput.value = '';
        loader.classList.remove('hidden');

        fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            loader.classList.add('hidden');
            if (data.reply) {
                appendAI(data.reply);
            } else {
                appendMsg('Error: ' + (data.error || 'Unknown error'), 'ai');
            }
        })
        .catch(function (err) {
            loader.classList.add('hidden');
            appendMsg('Connection failed: ' + err.message, 'ai');
        });
    }

    function appendMsg(text, who) {
        var div = document.createElement('div');
        div.className = 'message ' + who;
        div.textContent = text;
        messagesBox.appendChild(div);
        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    function appendAI(text) {
        var div = document.createElement('div');
        div.className = 'message ai';
        div.textContent = text;

        var btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = 'Copy';
        btn.addEventListener('click', function () {
            navigator.clipboard.writeText(text).then(function () {
                btn.textContent = 'Copied!';
                setTimeout(function () { btn.textContent = 'Copy'; }, 2000);
            });
        });
        div.appendChild(btn);

        messagesBox.appendChild(div);
        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    /* Submit on button click */
    submitBtn.addEventListener('click', function () {
        sendMessage(searchInput.value);
    });

    /* Submit on Enter key */
    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage(searchInput.value);
        }
    });

    /* ---------- PDF Upload (RAG) ---------- */
    uploadBtn.addEventListener('click', function () {
        fileInput.click();
    });

    fileInput.addEventListener('change', function () {
        var file = fileInput.files[0];
        if (!file) return;

        var formData = new FormData();
        formData.append('file', file);
        loader.classList.remove('hidden');

        fetch('/api/upload', {
            method: 'POST',
            body: formData
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            loader.classList.add('hidden');
            if (data.success) {
                fileStatusArea.innerHTML =
                    '<div class="file-status-badge">' +
                    '📄 ' + file.name + ' loaded (' + data.pages + ' pages)' +
                    '  <button id="clear-pdf-btn" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:0.75rem;margin-left:8px;">✕ Clear</button>' +
                    '</div>';
                // Wire clear button
                document.getElementById('clear-pdf-btn').addEventListener('click', function () {
                    fetch('/api/clear', { method: 'POST' }).then(function () {
                        fileStatusArea.innerHTML = '';
                    });
                });
            } else {
                appendMsg('Upload error: ' + data.error, 'ai');
                messagesBox.classList.remove('hidden');
            }
        })
        .catch(function (err) {
            loader.classList.add('hidden');
            appendMsg('Upload failed: ' + err.message, 'ai');
            messagesBox.classList.remove('hidden');
        });

        // Reset so same file can be re-uploaded
        fileInput.value = '';
    });
});
