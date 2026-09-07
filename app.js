// DOM Elements
const rawInput = document.getElementById('rawInput');
const output = document.getElementById('output');
const trimBtn = document.getElementById('trimBtn');
const dedupeBtn = document.getElementById('dedupeBtn');
const sqlBtn = document.getElementById('sqlBtn');
const upperBtn = document.getElementById('upperBtn');
const parseBtn = document.getElementById('parseBtn');
const commitBtn = document.getElementById('commitBtn');
const queueList = document.getElementById('queueList');
const queueStatus = document.getElementById('queueStatus');
const themeToggle = document.getElementById('themeToggle');

// State
let copyQueue = [];
let currentQueueIndex = -1;

// ==== THEME MANAGEMENT ====
function initTheme() {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('clipsandbox-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Default to dark theme, or use saved preference, or use system preference
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.textContent = '☀️';
    } else if (savedTheme === 'dark' || (!savedTheme && prefersDark) || !savedTheme) {
        document.body.classList.remove('light-theme');
        themeToggle.textContent = '🌙';
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    
    if (document.body.classList.contains('light-theme')) {
        themeToggle.textContent = '☀️';
        localStorage.setItem('clipsandbox-theme', 'light');
    } else {
        themeToggle.textContent = '🌙';
        localStorage.setItem('clipsandbox-theme', 'dark');
    }
}

// Initialize theme on page load
initTheme();

// Theme toggle button
themeToggle.addEventListener('click', toggleTheme);

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only auto-switch if user hasn't manually set a preference
    if (!localStorage.getItem('clipsandbox-theme')) {
        if (e.matches) {
            document.body.classList.remove('light-theme');
            themeToggle.textContent = '🌙';
        } else {
            document.body.classList.add('light-theme');
            themeToggle.textContent = '☀️';
        }
    }
});

// ==== TEXT PROCESSING FUNCTIONS ====
function trimAndRemoveEmptyLines(text) {
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '')
        .join('\n');
}

function removeDuplicates(text) {
    const lines = text.split('\n');
    const uniqueLines = [...new Set(lines.filter(line => line.trim() !== ''))];
    return uniqueLines.join('\n');
}

function toSQLArray(text) {
    const items = text.split('\n').map(item => item.trim()).filter(Boolean);
    return items.map(item => `'${item.replace(/'/g, "''")}'`).join(', ');
}

function toUpperCase(text) {
    return text.toUpperCase();
}

// New function: Parse text into name:value rows
function parseKeyValue(text) {
    // Split by newlines first
    const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
    const pairs = [];
    
    lines.forEach(line => {
        // Try to split by " : " (space colon space) pattern
        // But be careful: values may contain spaces
        // Strategy: find the last ": " that's followed by content
        const match = line.match(/^(.+?)\s*:\s*(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            if (key && value) {
                pairs.push(`${key}: ${value}`);
            }
        } else {
            // If no colon found, just add the line as-is
            pairs.push(line);
        }
    });
    
    return pairs.join('\n');
}

// ==== BUTTON HANDLERS ====
trimBtn.addEventListener('click', () => {
    output.value = trimAndRemoveEmptyLines(rawInput.value);
});

dedupeBtn.addEventListener('click', () => {
    output.value = removeDuplicates(rawInput.value);
});

sqlBtn.addEventListener('click', () => {
    output.value = toSQLArray(rawInput.value);
});

upperBtn.addEventListener('click', () => {
    output.value = toUpperCase(rawInput.value);
});

parseBtn.addEventListener('click', () => {
    const text = output.value.trim() || rawInput.value.trim();
    if (!text) return;
    output.value = parseKeyValue(text);
});

// ==== QUEUE MANAGEMENT ====
commitBtn.addEventListener('click', async () => {
    // Use output if available, otherwise use raw input
    const sourceText = output.value.trim() || rawInput.value.trim();
    if (!sourceText) {
        queueStatus.textContent = 'No text to queue';
        return;
    }

    copyQueue = sourceText.split('\n').filter(line => line.trim() !== '');
    currentQueueIndex = -1;
    
    renderQueue();
    commitBtn.textContent = "Add New Queue";
    
    // Start by loading the first item
    await advanceQueue();
});

function renderQueue() {
    queueList.innerHTML = '';
    copyQueue.forEach((item, index) => {
        const li = document.createElement('li');
        li.textContent = item;
        if (index === currentQueueIndex) {
            li.classList.add('active');
        } else if (index < currentQueueIndex) {
            li.classList.add('completed');
        }
        queueList.appendChild(li);
    });
}

async function advanceQueue() {
    if (copyQueue.length === 0) {
        queueStatus.textContent = 'Queue is empty';
        return;
    }

    currentQueueIndex++;
    
    if (currentQueueIndex >= copyQueue.length) {
        currentQueueIndex = copyQueue.length - 1;
        queueStatus.textContent = 'Queue completed!';
        return;
    }

    try {
        await navigator.clipboard.writeText(copyQueue[currentQueueIndex]);
        queueStatus.textContent = `Item ${currentQueueIndex + 1}/${copyQueue.length} copied`;
        renderQueue();
    } catch (err) {
        queueStatus.textContent = `Error: ${navigator.clipboard ? 'Copy failed' : 'Clipboard not supported'}`;
        console.error('Clipboard write failed:', err);
    }
}

// ==== GLOBAL KEYBOARD SHORTCUT ====
document.addEventListener('keydown', async (e) => {
    // Check for Alt+C
    if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (copyQueue.length > 0) {
            await advanceQueue();
        }
    }
});