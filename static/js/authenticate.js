import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

// Wrap in a function
export function initChatBot() {
    createChat({
        webhookUrl: 'https://jsdjfnkns.app.n8n.cloud/webhook/a889d2ae-2159-402f-b326-5f61e90f602e/chat',
        position: 'bottom-right',
        openOnStart: false,
        theme: 'light',
        label: 'Repo Analyzer Assistant',
    });
}
