// ==UserScript==
// @name         Text Expander
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Her tuşa basıldığında anında trigger-replace
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/**
 *          ___ _ __ ___  _ __ ___ __ _  ___ __ _
 *         / _ \ '_ ` _ \| '__/ __/ _` |/ __/ _` |
 *        |  __/ | | | | | | | (_| (_| | (_| (_| |
 *         \___|_| |_| |_|_|  \___\__,_|\___\__,_|
 *
 *                    Text-Expander-Mini
 *
 *    GitHub: https://github.com/emrcaca/Text-Expander
 *    Copyright (c) 2025 emrcaca | MIT License
 */

(function() {
    'use strict';

    class UniversalTextSetter {
        static getText(element) {
            if (!element) return '';
            return element.isContentEditable ? (element.textContent || '') : (element.value || '');
        }

        static setText(element, text) {
            if (!element) return;
            const textStr = String(text);
            if (element.isContentEditable) {
                this.setContentEditable(element, textStr);
            } else {
                this.setInputValue(element, textStr);
            }
        }

        static setInputValue(element, text) {
            const tagName = element.tagName;
            const prototype = tagName === 'TEXTAREA'
                ? HTMLTextAreaElement.prototype
                : HTMLInputElement.prototype;

            const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
            if (nativeSetter) {
                nativeSetter.call(element, text);
            } else {
                element.value = text;
            }

            element._valueTracker?.setValue(text);
            element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

            try {
                element.setSelectionRange?.(text.length, text.length);
            } catch {}
        }

        static setContentEditable(element, text) {
            element.focus();
            const selection = window.getSelection();
            const range = document.createRange();

            try {
                range.selectNodeContents(element);
                selection.removeAllRanges();
                selection.addRange(range);

                const beforeInputEvent = new InputEvent('beforeinput', {
                    inputType: 'insertText',
                    data: text,
                    bubbles: true,
                    cancelable: true
                });

                if (!element.dispatchEvent(beforeInputEvent)) return;

                element.textContent = text;

                element.dispatchEvent(new InputEvent('input', {
                    inputType: 'insertText',
                    data: text,
                    bubbles: true
                }));

                range.selectNodeContents(element);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
                return;
            } catch (e) {}

            try {
                range.selectNodeContents(element);
                selection.removeAllRanges();
                selection.addRange(range);
                if (document.execCommand('selectAll', false, null)) {
                    document.execCommand('insertText', false, text);
                    return;
                }
            } catch (e) {}

            element.textContent = text;
            try {
                range.selectNodeContents(element);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            } catch {}
        }

        static isEditable(element) {
            if (!element) return false;
            return element.tagName === 'INPUT' ||
                   element.tagName === 'TEXTAREA' ||
                   element.isContentEditable ||
                   element.getAttribute('contenteditable') === 'true';
        }

        static getActiveEditableElement() {
            const activeElement = document.activeElement;
            return this.isEditable(activeElement) ? activeElement : null;
        }
    }

    const TRIGGERS = [
        { trigger: 'hi', replace: 'Hello!' },
        { trigger: 'ok', replace: 'okey' },
        { trigger: 'brb', replace: 'Be right back' },
        { trigger: 'omw', replace: 'On my way' },
        { trigger: 'thx', replace: 'Thanks!' },
        { trigger: 'ty', replace: 'Thank you!' },
        { trigger: 'np', replace: 'No problem!' },
        { trigger: 'idk', replace: "I don't know" },
        { trigger: 'btw', replace: 'By the way' },
        { trigger: 'imo', replace: 'In my opinion' },
        { trigger: 'afaik', replace: 'As far as I know' },
        { trigger: ':mail', replace: 'ornek@email.com' },
        { trigger: ':mymail', replace: 'benim@email.com' },
        { trigger: '"1', replace: 'Owo h' },
        { trigger: '"2', replace: 'Owo b' },
        { trigger: '"3', replace: 'Owo' },
        { trigger: '"4', replace: 'Owo pray' },
        { trigger: ':tarih', replace: () => new Date().toLocaleDateString('tr-TR') },
        { trigger: ':date', replace: () => new Date().toLocaleDateString('en-US') },
        { trigger: ':saat', replace: () => new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) },
        { trigger: ':time', replace: () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
        { trigger: ':gun', replace: () => {
                const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                return days[new Date().getDay()];
            }
        },
        { trigger: ':heart', replace: '❤️' },
        { trigger: ':check', replace: '✓' },
        { trigger: ':cross', replace: '✗' },
    ];

    const SETTINGS = {
        wordBoundary: true,
        debug: false,
        debounceDelay: 0,
    };

    let processingReplace = false;
    let debounceTimer = null;

    function checkAndReplace() {
        if (processingReplace) return;

        const activeEl = UniversalTextSetter.getActiveEditableElement();
        if (!activeEl) return;

        const currentText = UniversalTextSetter.getText(activeEl);

        if (SETTINGS.debug) {
            console.log('[TextExpander] Checking text:', currentText);
        }

        const sortedTriggers = [...TRIGGERS].sort((a, b) => b.trigger.length - a.trigger.length);

        for (const item of sortedTriggers) {
            const trigger = item.trigger;

            if (SETTINGS.wordBoundary) {
                const regex = new RegExp(`(^|\\s)${escapeRegex(trigger)}$`);
                if (regex.test(currentText)) {
                    performReplace(activeEl, currentText, trigger, item.replace);
                    return;
                }
            } else {
                if (currentText.endsWith(trigger)) {
                    performReplace(activeEl, currentText, trigger, item.replace);
                    return;
                }
            }
        }
    }

    function performReplace(element, currentText, trigger, replacement) {
        processingReplace = true;

        const replaceText = typeof replacement === 'function' ? replacement() : replacement;

        const newText = currentText.slice(0, -trigger.length) + replaceText;

        if (SETTINGS.debug) {
            console.log('[TextExpander] Replacing:', trigger, '->', replaceText);
        }

        UniversalTextSetter.setText(element, newText);

        setTimeout(() => {
            processingReplace = false;
        }, 100);
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    document.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            checkAndReplace();
        }, SETTINGS.debounceDelay);
    }, true);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
            return;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            checkAndReplace();
        }, SETTINGS.debounceDelay);
    }, true);
})();
