// ==UserScript==
// @name         Text Expander
// @namespace    https://github.com/emrcaca
// @version      1.0.0
// @description  Basit metin genişletici.
// @author       emrcaca
// @match        *://*/*
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════════════════
       CONSTANTS & CONFIG
       ═══════════════════════════════════════════════════════════════════════════ */

    const CONSTANTS = Object.freeze({
        STORAGE_KEY: 'te_config',
        TIMING: {
            SELECTION_DEBOUNCE: 200,
            CLICK_THRESHOLD: 250,
        },
        EDITABLE_INPUT_TYPES: Object.freeze(
            new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number'])
        ),
    });

    const DEFAULT_CONFIG = Object.freeze({
        triggers: Object.freeze({
            '"1': "Owo h",
            '"2': "Owo b",
            '"3': "Owo",
            '"4': "Owo pray",
            '"5': "Owo pray 1349602152976355379",
            'date': new Date().toLocaleDateString('tr-TR'),
        }),
        expander: Object.freeze({
            enabled: true,
        }),
    });

    /* ═══════════════════════════════════════════════════════════════════════════
       CONFIGURATION MANAGER (Minimal)
       ═══════════════════════════════════════════════════════════════════════════ */

    const ConfigManager = (() => {
        let config = null;
        let triggerKeys = [];

        const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
        const sortKeysByLength = (obj) =>
            Object.keys(obj || {}).sort((a, b) => b.length - a.length);

        const updateKeys = () => {
            triggerKeys = sortKeysByLength(config.triggers);
        };

        const load = () => {
            config = deepClone(DEFAULT_CONFIG);
            updateKeys();
        };

        const get = (path) => {
            if (!path) return config;
            return path.split('.').reduce((obj, key) => obj?.[key], config);
        };

        const getTriggerKeys = () => triggerKeys;

        load(); // Initialize

        return Object.freeze({ get, getTriggerKeys });
    })();

    /* ═══════════════════════════════════════════════════════════════════════════
       ORIGINAL DOM UTILITIES (ORİJİNAL KODLAR - DOKUNULMADI)
       ═══════════════════════════════════════════════════════════════════════════ */

    const DOMUtils = (() => {
        const inputSetter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value'
        )?.set;
        const textareaSetter = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype,
            'value'
        )?.set;

        const isEditable = (el) => {
            if (!el || el.disabled || el.readOnly) return false;
            if (el.isContentEditable) return true;
            if (el.tagName === 'TEXTAREA') return true;
            if (el.tagName === 'INPUT') {
                const type = (el.type || 'text').toLowerCase();
                return CONSTANTS.EDITABLE_INPUT_TYPES.has(type);
            }
            return el.getAttribute?.('contenteditable') === 'true';
        };

        const getActiveEditable = () => {
            const el = document.activeElement;
            return isEditable(el) ? el : null;
        };

        const getText = (el) => {
            if (!el) return '';
            return el.isContentEditable ? (el.textContent ?? '') : (el.value ?? '');
        };

        const moveCursorToEnd = (el) => {
            requestAnimationFrame(() => {
                try {
                    const sel = window.getSelection();
                    if (!sel) return;
                    sel.removeAllRanges();
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    range.collapse(false);
                    sel.addRange(range);
                } catch (e) {
                    // Ignore cursor errors
                }
            });
        };

        const setInputText = (el, text) => {
            const setter = el.tagName === 'TEXTAREA' ? textareaSetter : inputSetter;

            if (setter) {
                setter.call(el, text);
            } else {
                el.value = text;
            }

            const tracker = el._valueTracker;
            if (tracker) {
                tracker.setValue('');
            }

            el.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: text
            }));
            el.dispatchEvent(new Event('change', { bubbles: true }));

            try {
                el.setSelectionRange?.(text.length, text.length);
            } catch (e) {
                // Ignore selection errors
            }
        };

        const setContentEditableText = (el, text) => {
            el.focus();
            const sel = window.getSelection?.();
            const range = document.createRange();

            try {
                range.selectNodeContents(el);
                sel?.removeAllRanges();
                sel?.addRange(range);

                const beforeInputEvent = new InputEvent('beforeinput', {
                    inputType: 'insertText',
                    data: text,
                    bubbles: true,
                    cancelable: true,
                });

                if (!el.dispatchEvent(beforeInputEvent)) return;

                el.textContent = text;
                el.dispatchEvent(
                    new InputEvent('input', {
                        inputType: 'insertText',
                        data: text,
                        bubbles: true,
                    })
                );
                moveCursorToEnd(el);
                return;
            } catch (e) {
                // Fall through
            }

            try {
                range.selectNodeContents(el);
                sel?.removeAllRanges();
                sel?.addRange(range);
                if (document.execCommand?.('selectAll')) {
                    document.execCommand('insertText', false, text);
                    moveCursorToEnd(el);
                    return;
                }
            } catch (e) {
                // Fall through
            }

            el.textContent = text;
            moveCursorToEnd(el);
        };

        const setText = (el, text) => {
            if (!el) return;
            if (el.isContentEditable) {
                setContentEditableText(el, text);
            } else {
                setInputText(el, text);
            }
        };

        const hasSelection = (el) => {
            if (!el) return false;
            if (el.isContentEditable) {
                const sel = window.getSelection();
                return sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed;
            }
            return el.selectionStart !== el.selectionEnd;
        };

        const isCursorAtEnd = (el) => {
            if (!el) return false;
            if (el.isContentEditable) {
                const sel = window.getSelection();
                if (!sel.rangeCount) return false;
                const range = sel.getRangeAt(0);
                if (!range.collapsed) return false;
                const textLength = el.textContent.length;
                const cursorPos = range.startOffset;
                return cursorPos === textLength;
            }
            return el.selectionStart === el.value.length;
        };

        const clearSelection = (el) => {
            if (!el) return;
            if (el.isContentEditable) {
                moveCursorToEnd(el);
            } else {
                try {
                    el.setSelectionRange(el.value.length, el.value.length);
                } catch (e) {
                    // Ignore selection errors
                }
            }
        };

        return Object.freeze({
            isEditable,
            getActiveEditable,
            getText,
            setText,
            hasSelection,
            isCursorAtEnd,
            clearSelection,
        });
    })();

    /* ═══════════════════════════════════════════════════════════════════════════
       ORIGINAL UNDO MANAGER (ORİJİNAL KODLAR - DOKUNULMADI)
       ═══════════════════════════════════════════════════════════════════════════ */

    const UndoManager = (() => {
        const stacks = new WeakMap();
        let lastAction = { element: null, afterText: null };

        const getStack = (el) => {
            if (!stacks.has(el)) {
                stacks.set(el, { undo: [], redo: [] });
            }
            return stacks.get(el);
        };

        const push = (el, before, after) => {
            const stack = getStack(el);
            stack.undo.push({ before, after });
            stack.redo = [];
            lastAction = { element: el, afterText: after };
        };

        const undo = (el) => {
            const stack = getStack(el);
            const item = stack.undo.pop();
            if (item) {
                stack.redo.push(item);
                return item.before;
            }
            return null;
        };

        const canUndo = (el) => getStack(el).undo.length > 0;
        const canQuickUndo = (el, currentText) => {
            return (
                lastAction.element === el &&
                lastAction.afterText === currentText &&
                canUndo(el)
            );
        };

        const clearQuickUndo = () => {
            lastAction = { element: null, afterText: null };
        };

        return Object.freeze({ push, undo, canUndo, canQuickUndo, clearQuickUndo });
    })();

    /* ═══════════════════════════════════════════════════════════════════════════
       EXPANDER ENGINE (Sadece Trigger Modu Aktif)
       ═══════════════════════════════════════════════════════════════════════════ */

    const ExpanderEngine = (() => {
        let shouldSkip = false;
        let debounceTimer = null;

        const scheduleCheck = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(check, 10);
        };

        const check = () => {
            if (!ConfigManager.get('expander.enabled') || shouldSkip) {
                shouldSkip = false;
                return;
            }

            const element = DOMUtils.getActiveEditable();
            if (!element || DOMUtils.hasSelection(element)) return;

            const text = DOMUtils.getText(element);
            if (!text) return;

            // Sadece Triggerları kontrol ediyoruz (AI komutları kaldırıldı)
            for (const trg of ConfigManager.getTriggerKeys()) {
                const replacement = ConfigManager.get(`triggers.${trg}`);
                if (text.endsWith(trg) && replacement !== undefined) {
                    executeTrigger(element, text, trg, replacement);
                    return;
                }
            }
        };

        const executeTrigger = (element, text, trigger, replacement) => {
            const result = text.slice(0, -trigger.length) + replacement;
            UndoManager.push(element, text, result);
            DOMUtils.setText(element, result);
        };

        const skip = () => {
            shouldSkip = true;
        };

        return Object.freeze({
            scheduleCheck,
            skip,
        });
    })();

    /* ═══════════════════════════════════════════════════════════════════════════
       EVENT HANDLERS (ORİJİNAL INPUT LOGIC)
       ═══════════════════════════════════════════════════════════════════════════ */

    const EventHandlers = (() => {
        const onInput = (e) => {
            const inputType = e.inputType;

            if (inputType === 'historyUndo' || inputType === 'historyRedo') {
                requestAnimationFrame(() => {
                    DOMUtils.clearSelection(DOMUtils.getActiveEditable());
                });
                ExpanderEngine.skip();
                return;
            }

            if (!inputType || /^(insert|delete)/.test(inputType)) {
                ExpanderEngine.scheduleCheck();
            }
        };

        const onKeydown = (e) => {
            const element = DOMUtils.getActiveEditable();
            if (!element) return;

            if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

            // Backspace Undo
            if (e.key === 'Backspace' && !DOMUtils.hasSelection(element) && DOMUtils.isCursorAtEnd(element)) {
                const currentText = DOMUtils.getText(element);
                if (UndoManager.canQuickUndo(element, currentText)) {
                    e.preventDefault();
                    const text = UndoManager.undo(element);
                    if (text !== null) DOMUtils.setText(element, text);
                    UndoManager.clearQuickUndo();
                    ExpanderEngine.skip();
                    return;
                }
            }

            // Navigation keys
            if (/^(Arrow|Home|End|Page)/.test(e.key)) {
                ExpanderEngine.skip();
                return;
            }

            ExpanderEngine.scheduleCheck();
        };

        const onMousedown = () => ExpanderEngine.skip();
        const onFocusin = () => ExpanderEngine.skip();

        return Object.freeze({
            onInput,
            onKeydown,
            onMousedown,
            onFocusin,
        });
    })();

    /* ═══════════════════════════════════════════════════════════════════════════
       INIT
       ═══════════════════════════════════════════════════════════════════════════ */

    const App = (() => {
        const registerEventListeners = () => {
            document.addEventListener('input', EventHandlers.onInput, true);
            document.addEventListener('keydown', EventHandlers.onKeydown, true);
            document.addEventListener('mousedown', EventHandlers.onMousedown, true);
            document.addEventListener('focusin', EventHandlers.onFocusin, true);
        };

        const init = () => {
            registerEventListeners();
            console.log('%cExpander Engine Ready (Original)', 'color: #00ff00; font-weight: bold;');
        };

        return Object.freeze({ init });
    })();

    App.init();
})();
