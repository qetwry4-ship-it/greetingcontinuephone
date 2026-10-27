import {
    addOneMessage,
    characters,
    chat,
    eventSource,
    event_types,
    getThumbnailUrl,
    name1,
    name2,
    saveChatConditional,
    substituteParams,
    this_chid,
} from '../../../../script.js';

const EXTENSION_NAME = 'Greeting Continue';
const PANEL_ID = 'greeting-continue-panel';

function getCharacter() {
    if (this_chid === undefined || this_chid === null) return null;
    return characters[this_chid] ?? null;
}

function getGreetings() {
    const character = getCharacter();
    if (!character) return [];

    const result = [];

    if (typeof character.first_mes === 'string' && character.first_mes.trim()) {
        result.push({
            index: 0,
            title: 'Greeting 1 (основное)',
            text: character.first_mes,
        });
    }

    const alternates = character.data?.alternate_greetings;
    if (Array.isArray(alternates)) {
        alternates.forEach((text, i) => {
            if (typeof text === 'string' && text.trim()) {
                result.push({
                    index: i + 1,
                    title: `Greeting ${i + 2}`,
                    text,
                });
            }
        });
    }

    return result;
}

function closePanel() {
    document.getElementById(PANEL_ID)?.remove();
}

function makeMessage(text, character) {
    return {
        name: character.name ?? name2,
        is_user: false,
        is_system: false,
        is_name: true,
        send_date: Math.floor(Date.now() / 1000),
        original_avatar: character.avatar,
        force_avatar: character.avatar && character.avatar !== 'none'
            ? getThumbnailUrl('avatar', character.avatar)
            : undefined,
        extra: {
            gen_id: Date.now() * Math.random(),
            greeting_continue: true,
        },
        mes: substituteParams(text.trim(), name1, character.name ?? name2),
    };
}

async function insertGreeting(greeting) {
    const character = getCharacter();
    if (!character) {
        toastr.warning('Персонаж не выбран.');
        return;
    }

    if (!Array.isArray(chat)) {
        toastr.error('Не удалось получить текущую историю чата.');
        return;
    }

    const text = greeting?.text?.trim();
    if (!text) return;

    closePanel();

    try {
        const message = makeMessage(text, character);

        chat.push(message);
        addOneMessage(message, {
            type: 'normal',
            scroll: true,
            showSwipes: true,
        });

        // Сохраняем именно текущий чат. Никакого запроса к модели здесь нет.
        await saveChatConditional();

        toastr.success(`${greeting.title} добавлен в текущий чат.`);
        eventSource.emit(event_types.CHARACTER_MESSAGE_RENDERED, chat.length - 1);
    } catch (error) {
        console.error(`[${EXTENSION_NAME}] Failed to insert greeting`, error);
        // Если добавление/сохранение сломалось, не оставляем полусохранённое сообщение.
        if (chat.length && chat[chat.length - 1]?.extra?.greeting_continue) {
            chat.pop();
        }
        toastr.error('Не удалось добавить greeting.');
    }
}

function openPanel() {
    closePanel();

    const greetings = getGreetings();
    if (!greetings.length) {
        toastr.info('У этого персонажа нет первого сообщения или alternate greetings.');
        return;
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'greeting-continue-panel';

    const header = document.createElement('div');
    header.className = 'greeting-continue-header';
    header.innerHTML = `
        <span>Продолжить готовым greeting</span>
        <button type="button" class="menu_button greeting-continue-close" title="Закрыть">×</button>
    `;
    panel.appendChild(header);

    const hint = document.createElement('div');
    hint.className = 'greeting-continue-hint';
    hint.textContent = 'Выбери готовое вступление из карточки. Оно будет добавлено как сообщение персонажа — генерации не будет.';
    panel.appendChild(hint);

    const list = document.createElement('div');
    list.className = 'greeting-continue-list';

    greetings.forEach((greeting) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'greeting-continue-item';
        button.innerHTML = `
            <span class="greeting-continue-title"></span>
            <span class="greeting-continue-preview"></span>
        `;
        button.querySelector('.greeting-continue-title').textContent = greeting.title;

        const preview = greeting.text.replace(/\s+/g, ' ').trim();
        button.querySelector('.greeting-continue-preview').textContent =
            preview.length > 180 ? `${preview.slice(0, 180)}…` : preview;

        button.addEventListener('click', () => {
            selectedGreetingIndex = greetings.indexOf(greeting);
            insertGreeting(greeting);
        });
        list.appendChild(button);
    });

    panel.appendChild(list);

    const closeButton = panel.querySelector('.greeting-continue-close');
    closeButton.addEventListener('click', closePanel);

    document.body.appendChild(panel);
}

function ensureButton() {
    if (document.getElementById('greeting-continue-prev')) return true;

    const sendButton = document.querySelector('#send_but');
    const textarea = document.querySelector('#send_textarea');

    if (!sendButton && !textarea) return false;

    const wrapper = document.createElement('div');
    wrapper.id = 'greeting-continue-controls';
    wrapper.className = 'greeting-continue-controls';

    const prev = document.createElement('button');
    prev.id = 'greeting-continue-prev';
    prev.type = 'button';
    prev.className = 'menu_button';
    prev.title = 'Предыдущее готовое greeting';
    prev.textContent = '‹';
    prev.addEventListener('click', () => cycleGreeting(-1));

    const indicator = document.createElement('button');
    indicator.id = 'greeting-continue-indicator';
    indicator.type = 'button';
    indicator.className = 'menu_button greeting-continue-indicator';
    indicator.title = 'Выбрать greeting';
    indicator.addEventListener('click', openPanel);

    const next = document.createElement('button');
    next.id = 'greeting-continue-next';
    next.type = 'button';
    next.className = 'menu_button';
    next.title = 'Следующее готовое greeting';
    next.textContent = '›';
    next.addEventListener('click', () => cycleGreeting(1));

    wrapper.append(prev, indicator, next);

    if (sendButton?.parentElement) {
        sendButton.parentElement.insertBefore(wrapper, sendButton);
    } else if (textarea?.parentElement) {
        textarea.parentElement.appendChild(wrapper);
    } else {
        document.body.appendChild(wrapper);
    }

    return true;
}

let selectedGreetingIndex = 0;

function cycleGreeting(direction) {
    const greetings = getGreetings();
    if (!greetings.length) return;

    selectedGreetingIndex =
        (selectedGreetingIndex + direction + greetings.length) % greetings.length;

    updateGreetingControls();
    // По стрелкам только выбираем готовый вариант.
    // Сообщение добавляется исключительно по клику на индикатор/выбор в списке.
}

function updateGreetingControls() {
    const greetings = getGreetings();
    const prev = document.getElementById('greeting-continue-prev');
    const indicator = document.getElementById('greeting-continue-indicator');
    const next = document.getElementById('greeting-continue-next');

    if (!prev || !indicator || !next) return;

    const enabled = !!getCharacter() && greetings.length > 0;
    prev.disabled = !enabled;
    indicator.disabled = !enabled;
    next.disabled = !enabled;

    if (!enabled) {
        indicator.textContent = 'Greeting';
        return;
    }

    if (selectedGreetingIndex >= greetings.length) {
        selectedGreetingIndex = 0;
    }

    const greeting = greetings[selectedGreetingIndex];
    indicator.textContent = `${selectedGreetingIndex + 1}/${greetings.length}`;
    indicator.title = `${greeting.title}: нажми, чтобы вставить`;
}


function refreshButton() {
    if (!document.getElementById('greeting-continue-prev')) {
        ensureButton();
    }
    updateGreetingControls();
}

function init() {
    ensureButton();
    refreshButton();

    eventSource.on(event_types.CHAT_CHANGED, () => {
        closePanel();
        selectedGreetingIndex = 0;
        setTimeout(refreshButton, 50);
    });

    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, () => {
        setTimeout(refreshButton, 50);
    });

    // ST dynamically rebuilds the bottom bar in some layouts.
    const observer = new MutationObserver(() => {
        if (!document.getElementById('greeting-continue-controls')) {
            ensureButton();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
