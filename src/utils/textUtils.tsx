import React from 'react';

export interface MentionOption {
    value: string;
    label: string;
    key: string;
}

export const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const parseMentionsAndTasks = (
    text: string,
    mentionOptions: MentionOption[],
    taskOptions: MentionOption[]
): React.ReactNode[] => {
    if (!text) return [];

    const result: React.ReactNode[] = [];
    let lastIndex = 0;

    const allUserNames = mentionOptions.map(o => o.value).filter(n => n && n.trim().length > 0);
    const allTaskNames = taskOptions.map(o => o.value).filter(n => n && n.trim().length > 0);

    if (allUserNames.length === 0 && allTaskNames.length === 0) return [text];

    const escapedUserNames = allUserNames.map(escapeRegExp);
    const escapedTaskNames = allTaskNames.map(escapeRegExp);

    // Combined regex for both @users and #tasks
    const regexPatterns = [];
    if (escapedUserNames.length > 0) regexPatterns.push(`(@(?:${escapedUserNames.join('|')}))`);
    if (escapedTaskNames.length > 0) regexPatterns.push(`(#(?:${escapedTaskNames.join('|')}))`);

    if (regexPatterns.length === 0) return [text];

    const regex = new RegExp(regexPatterns.join('|'), 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Push text before the match
        if (match.index > lastIndex) {
            result.push(<span key={`text-${match.index}`}> { text.substring(lastIndex, match.index) } </span>);
    }

    const matchedToken = match[0];
    const isTask = matchedToken.startsWith('#');

    result.push(
        <span
                key={`mention-${match.index}`}
className = { isTask? "task-token-highlight": "mention-token-highlight" }
style = { isTask? {
    color: '#2F80ED',
        backgroundColor: '#EBF3FF',
            padding: '0 4px',
                borderRadius: '4px',
                    fontWeight: 500
} : undefined}
            >
    { matchedToken }
    </span>
        );
lastIndex = match.index + matchedToken.length;
    }

// Push remaining text
if (lastIndex < text.length) {
    result.push(<span key={`text-end`}> { text.substring(lastIndex) } </span>);
    }

return result;
};
