// Assistant Window Logic
console.log("Assistant Window: Script initialized.");
// Handles the display and interaction of the floating translation bubble

const btnSettings = document.getElementById('btn-bubble-settings');
const btnClose = document.getElementById('btn-close-bubble');
const btnTTS = document.getElementById('btn-bubble-tts');
const btnNotion = document.getElementById('btn-bubble-notion');
const btnFav = document.getElementById('btn-bubble-fav');
const loader = document.getElementById('assistant-loader');
const textContent = document.getElementById('bubble-text-content');
const fastResult = document.getElementById('bubble-fast-result');
const smartResult = document.getElementById('bubble-smart-result');
const vocabContainer = document.getElementById('bubble-vocab-container');
const vocabList = document.getElementById('bubble-vocab-list');
const snippetImg = document.getElementById('bubble-source-snippet');
const snippetContainer = document.getElementById('bubble-source-container');
const confDot = document.getElementById('bubble-confidence-dot');

const modeBtns = {
    game: document.getElementById('btn-mode-game'),
    movie: document.getElementById('btn-mode-movie'),
    tutor: document.getElementById('btn-mode-tutor'),
    flow: document.getElementById('btn-mode-flow')
};

const flowSelectorContainer = document.getElementById('flow-selector-container');
const flowSkillSelect = document.getElementById('flow-skill-select');

// Mode Switching
Object.keys(modeBtns).forEach(mode => {
    if (modeBtns[mode]) {
        modeBtns[mode].onclick = () => {
             updateActiveMode(mode);
             window.electronAPI.send('toMain', { type: 'assistant-setting', key: 'assistantMode', value: mode });
        }
    }
});

function updateActiveMode(active) {
    Object.keys(modeBtns).forEach(m => {
        if (modeBtns[m]) modeBtns[m].classList.toggle('active', m === active);
    });
    
    // Toggle Flow Selector visibility
    if (flowSelectorContainer) {
        flowSelectorContainer.classList.toggle('hidden', active !== 'flow');
    }
}

// Populate Skills
async function initFlowSkills() {
    try {
        const skills = await window.electronAPI.listSkills();
        if (skills && Array.isArray(skills)) {
            skills.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
                flowSkillSelect.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Assistant: Failed to list skills", e);
    }
}
initFlowSkills();

flowSkillSelect.onchange = () => {
    const skill = flowSkillSelect.value;
    window.electronAPI.send('toMain', { type: 'assistant-setting', key: 'activeSkill', value: skill });
};

btnSettings.onclick = () => {
    window.electronAPI.send('toMain', { type: 'assistant-action', action: 'settings' });
};

btnClose.onclick = () => {
    window.electronAPI.send('toMain', { type: 'assistant-hide' });
};

btnTTS.onclick = () => {
    const text = textContent.textContent;
    if (text) {
        window.electronAPI.send('toMain', { type: 'assistant-action', action: 'tts', text: text });
    }
};

btnFav.onclick = () => {
    const text = textContent.textContent;
    if (text) {
        btnFav.classList.toggle('active');
        window.electronAPI.send('toMain', { type: 'assistant-action', action: 'toggle-favorite', text: text, isFavorite: btnFav.classList.contains('active') });
    }
};

btnNotion.onclick = () => {
    const text = smartResult.innerText;
    if (text) {
        window.electronAPI.send('toMain', { type: 'assistant-action', action: 'notion', content: text });
    }
};

window.electronAPI.receive('fromMain', (arg) => {
    if (arg.type === 'assistant-update') {
        const { data, text, html, fastText, vocab, confidence, showSnippet, mode, isFavorite } = arg;
        
        if (mode) updateActiveMode(mode);
        if (isFavorite !== undefined) btnFav.classList.toggle('active', isFavorite);

        // Show loading if just data (image) received
        if (data && !text && !fastText) {
            loader.style.display = 'flex';
            smartResult.innerHTML = '';
            fastResult.innerHTML = '';
            textContent.textContent = '';
            textContent.style.display = 'block';
            vocabContainer.style.display = 'none';
            if (showSnippet) {
                snippetContainer.classList.remove('hidden');
                snippetImg.src = data;
            } else {
                snippetContainer.classList.add('hidden');
            }
        }
        
        // Update OCR result (Raw Text)
        if (text) {
            textContent.textContent = text;
            if (confidence) {
                confDot.className = 'confidence-dot';
                if (confidence > 0.8) confDot.classList.add('conf-high');
                else if (confidence > 0.5) confDot.classList.add('conf-med');
                else confDot.classList.add('conf-low');
            }
        }

        // Layer 1: Fast result
        if (fastText) {
            fastResult.innerHTML = fastText;
            loader.style.display = 'flex'; // Keep loader for smart result
        }
        
        // Layer 2: Smart result
        if (html) {
            loader.style.display = 'none';
            textContent.style.display = 'none';
            if (window.marked) {
                smartResult.innerHTML = marked.parse(html);
            } else {
                smartResult.innerHTML = html;
            }
        }

        // Vocab Breakdown
        if (vocab && Array.isArray(vocab)) {
            vocabContainer.style.display = 'block';
            vocabList.innerHTML = vocab.map(v => `<span class="vocab-tag" title="${v.definition || ''}">${v.word}: ${v.translation}</span>`).join('');
        }
    } else if (arg.type === 'assistant-clear') {
        textContent.textContent = '';
        smartResult.innerHTML = '';
        fastResult.innerHTML = '';
        snippetImg.src = '';
        snippetContainer.classList.add('hidden');
        loader.style.display = 'none';
        vocabContainer.style.display = 'none';
        btnFav.classList.remove('active');
    }
});
