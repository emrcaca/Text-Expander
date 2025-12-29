// ==UserScript==
// @name         Text Expander
// @namespace    https://github.com/emrcaca
// @version      1.2.0
// @description  Basit metin genişletici.
// @author       emrcaca
// @match        *://*/*
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const CONSTANTS = Object.freeze({
        STORAGE_KEY: 'te_config',
        TIMING: {
            DEBOUNCE_DELAY: 0,
            FOCUS_DELAY: 100,
        },
        EDITABLE_INPUT_TYPES: Object.freeze(
            new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number'])
        ),
        MODIFIER_KEYS: Object.freeze(
            new Set(['Control', 'Alt', 'Shift', 'Meta'])
        ),
        NAVIGATION_KEY_PATTERN: /^(Arrow|Home|End|Page)/,
        INPUT_TYPE_PATTERN: /^(insert|delete)/,
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

    const Utils = (() => {
        const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
        
        const sortKeysByLength = (obj) =>
            Object.keys(obj || {}).sort((a, b) => b.length - a.length);

        return Object.freeze({ deepClone, sortKeysByLength });
    })();

    const ConfigManager = (() => {
        let config = null;
        let triggerKeys = [];

        const updateKeys = () => {
            triggerKeys = Utils.sortKeysByLength(config.triggers);
        };

        const load = () => {
            config = Utils.deepClone(DEFAULT_CONFIG);
            updateKeys();
        };

        const get = (path) => {
            if (!path) return config;
            return path.split('.').reduce((obj, key) => obj?.[key], config);
        };

        const getTriggerKeys = () => triggerKeys;

        load();

        return Object.freeze({ get, getTriggerKeys });
    })();

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
                  //
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
              //
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
              //
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
              //
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
                  //
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
        
        const canQuickUndo = (el, currentText) => 
            lastAction.element === el &&
            lastAction.afterText === currentText &&
            canUndo(el);

        const clearQuickUndo = () => {
            lastAction = { element: null, afterText: null };
        };

        return Object.freeze({ push, undo, canUndo, canQuickUndo, clearQuickUndo });
    })();

    const ExpanderEngine = (() => {
        let shouldSkip = false;
        let debounceTimer = null;
        let lastProcessedText = '';
        let lastProcessedElement = null;
        let isExpanding = false;

        const isValidForExpansion = (element, text) => {
            if (!ConfigManager.get('expander.enabled') || shouldSkip || isExpanding) {
                return false;
            }
            
            if (element === lastProcessedElement && text === lastProcessedText) {
                return false;
            }
            
            return element && !DOMUtils.hasSelection(element) && text;
        };

        const findMatchingTrigger = (text) => {
            for (const trigger of ConfigManager.getTriggerKeys()) {
                if (text.endsWith(trigger)) {
                    const replacement = ConfigManager.get(`triggers.${trigger}`);
                    if (replacement !== undefined) {
                        return { trigger, replacement };
                    }
                }
            }
            return null;
        };

        const executeTrigger = (element, text, trigger, replacement) => {
            isExpanding = true;
            
            const result = text.slice(0, -trigger.length) + replacement;
            
            lastProcessedElement = element;
            lastProcessedText = result;
            
            UndoManager.push(element, text, result);
            DOMUtils.setText(element, result);
            
            requestAnimationFrame(() => {
                DOMUtils.clearSelection(element);
                isExpanding = false;
            });
        };

        const performCheck = () => {
            if (shouldSkip) {
                shouldSkip = false;
                return;
            }

            const element = DOMUtils.getActiveEditable();
            const text = DOMUtils.getText(element);

            if (!isValidForExpansion(element, text)) {
                return;
            }

            const match = findMatchingTrigger(text);
            if (match) {
                executeTrigger(element, text, match.trigger, match.replacement);
            } else {
                lastProcessedElement = element;
                lastProcessedText = text;
            }
        };

        const scheduleCheck = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(performCheck, CONSTANTS.TIMING.DEBOUNCE_DELAY);
        };

        const skip = () => {
            shouldSkip = true;
            clearTimeout(debounceTimer);
        };

        const reset = () => {
            lastProcessedText = '';
            lastProcessedElement = null;
            shouldSkip = false;
            isExpanding = false;
            clearTimeout(debounceTimer);
        };

        return Object.freeze({ scheduleCheck, skip, reset });
    })();

    const EventHandlers = (() => {
        const isHistoryAction = (inputType) => 
            inputType === 'historyUndo' || inputType === 'historyRedo';

        const isTextModification = (inputType) =>
            !inputType || CONSTANTS.INPUT_TYPE_PATTERN.test(inputType);

        const handleHistoryAction = () => {
            requestAnimationFrame(() => {
                DOMUtils.clearSelection(DOMUtils.getActiveEditable());
            });
            ExpanderEngine.skip();
        };

        const onInput = (e) => {
            if (isHistoryAction(e.inputType)) {
                handleHistoryAction();
                return;
            }

            if (isTextModification(e.inputType)) {
                ExpanderEngine.scheduleCheck();
            }
        };

        const handleBackspaceUndo = (element, e) => {
            const hasNoSelection = !DOMUtils.hasSelection(element);
            const cursorAtEnd = DOMUtils.isCursorAtEnd(element);
            
            if (!hasNoSelection || !cursorAtEnd) {
                return false;
            }

            const currentText = DOMUtils.getText(element);
            if (UndoManager.canQuickUndo(element, currentText)) {
                e.preventDefault();
                const text = UndoManager.undo(element);
                if (text !== null) {
                    DOMUtils.setText(element, text);
                }
                UndoManager.clearQuickUndo();
                ExpanderEngine.skip();
                return true;
            }
            return false;
        };

        const onKeydown = (e) => {
            const element = DOMUtils.getActiveEditable();
            if (!element) return;

            if (CONSTANTS.MODIFIER_KEYS.has(e.key)) return;

            if (e.key === 'Backspace' && handleBackspaceUndo(element, e)) {
                return;
            }

            if (CONSTANTS.NAVIGATION_KEY_PATTERN.test(e.key)) {
                ExpanderEngine.skip();
                return;
            }

            ExpanderEngine.scheduleCheck();
        };

        const onMousedown = () => ExpanderEngine.skip();
        
        const onFocusin = () => {
            ExpanderEngine.reset();
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                setTimeout(() => {
                    ExpanderEngine.reset();
                }, CONSTANTS.TIMING.FOCUS_DELAY);
            }
        };

        return Object.freeze({
            onInput,
            onKeydown,
            onMousedown,
            onFocusin,
            onVisibilityChange,
        });
    })();

    const App = (() => {
        const EVENT_OPTIONS = { capture: true };

        const eventBindings = [
            ['input', EventHandlers.onInput],
            ['keydown', EventHandlers.onKeydown],
            ['mousedown', EventHandlers.onMousedown],
            ['focusin', EventHandlers.onFocusin],
        ];

        const registerEventListeners = () => {
            eventBindings.forEach(([event, handler]) => {
                document.addEventListener(event, handler, EVENT_OPTIONS);
            });
            
            document.addEventListener('visibilitychange', EventHandlers.onVisibilityChange);
        };

        const init = () => {
            registerEventListeners();
            console.log(
                '%cText Expander Ready v1.2.0',
                'color: #00ff00; font-weight: bold; font-size: 12px;'
            );
        };

        return Object.freeze({ init });
    })();

    App.init();
})();
