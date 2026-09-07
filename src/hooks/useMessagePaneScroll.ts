'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * How close to the bottom still counts as "reading the newest messages".
 * Roughly one line of slack, so a partially-scrolled last message still
 * follows the conversation.
 */
const NEAR_BOTTOM_PX = 80;

function isNearBottom(pane: HTMLElement): boolean {
  return pane.scrollHeight - pane.scrollTop - pane.clientHeight < NEAR_BOTTOM_PX;
}

/**
 * Scroll the message pane to the bottom.
 *
 * Sets scrollTop on the pane itself rather than calling scrollIntoView on a
 * sentinel element: scrollIntoView walks up the ancestor chain and scrolls
 * every scrollable ancestor, so on a nested container it can move the whole
 * page. scrollTo where the browser offers it, for the smooth behaviour; plain
 * assignment otherwise.
 */
function scrollToBottom(pane: HTMLElement): void {
  if (typeof pane.scrollTo === 'function') {
    pane.scrollTo({ top: pane.scrollHeight, behavior: 'smooth' });
    return;
  }
  pane.scrollTop = pane.scrollHeight;
}

/**
 * Keep a chat transcript pinned to its newest message, but only while the
 * reader is actually down there.
 *
 * Both message views used to scroll unconditionally on every change to
 * `messages.length`. Under the old 15s poll that fired rarely; under realtime
 * it fires on every inbound message, so reading back through history got
 * yanked to the bottom mid-sentence — and a delete or a poll returning a
 * different page size did it too.
 *
 * `wasAtBottom` is recorded on scroll rather than measured in the effect,
 * because by the time the effect runs the pane has already grown by the new
 * message and nobody is near the bottom any more.
 *
 * @param messageCount changes when a message is added or removed
 * @returns `paneRef` and `onScroll` to spread onto the scrolling element, and
 *   `followNextUpdate` to call when the user does something that IS a request
 *   to be at the bottom, such as pressing send.
 */
export function useMessagePaneScroll(messageCount: number) {
  const paneRef = useRef<HTMLDivElement>(null);
  /** Starts true so a freshly opened conversation opens on its newest message. */
  const wasAtBottomRef = useRef(true);
  const followOnceRef = useRef(false);

  const onScroll = useCallback(() => {
    const pane = paneRef.current;
    if (pane) wasAtBottomRef.current = isNearBottom(pane);
  }, []);

  const followNextUpdate = useCallback(() => {
    followOnceRef.current = true;
  }, []);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    if (!wasAtBottomRef.current && !followOnceRef.current) return;

    followOnceRef.current = false;
    wasAtBottomRef.current = true;
    scrollToBottom(pane);
  }, [messageCount]);

  return { paneRef, onScroll, followNextUpdate };
}
