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

    // Combined regex for both @users, #tasks, and URLs
    const regexPatterns = [];
    if (escapedUserNames.length > 0) regexPatterns.push(`(@(?:${escapedUserNames.join('|')}))`);
    if (escapedTaskNames.length > 0) regexPatterns.push(`(#(?:${escapedTaskNames.join('|')}))`);
    // Add URL pattern
    regexPatterns.push(`((?:https?://|www\\.)[\\w\\d.#?&%=+/@!$*,;-]+[\\w\\d/])`);

    if (regexPatterns.length === 0) return [text];

    const regex = new RegExp(regexPatterns.join('|'), 'gi');
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Push text before the match
        if (match.index > lastIndex) {
            result.push(<span key={`text-${match.index}`}>{text.substring(lastIndex, match.index)}</span>);
        }

        const matchedToken = match[0];
        const isTask = matchedToken.startsWith('#');
        const isMention = matchedToken.startsWith('@');
        const isUrl = !isTask && !isMention;

        if (isUrl) {
            const href = matchedToken.startsWith('www.') ? `https://${matchedToken}` : matchedToken;
            result.push(
                <a
                    key={`url-${match.index}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ff3b3b] underline hover:text-[#cc2f2f] transition-colors"
                >
                    {matchedToken}
                </a>
            );
        } else {
            result.push(
                <span
                    key={`token-${match.index}`}
                    className={isTask ? "task-token-highlight" : "mention-token-highlight"}
                    style={isTask ? {
                        color: '#2F80ED',
                        backgroundColor: '#EBF3FF',
                        padding: '0 4px',
                        borderRadius: '4px',
                        fontWeight: 500
                    } : undefined}
                >
                    {matchedToken}
                </span>
            );
        }
        lastIndex = match.index + matchedToken.length;
    }

    // Push remaining text
    if (lastIndex < text.length) {
        result.push(<span key={`text-end`}>{text.substring(lastIndex)}</span>);
    }

    return result;
};
