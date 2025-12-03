// ==UserScript==
// @name         EmR Text Expander Minimal
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Sadece "1, "2 ve "3 kısayollarını genişletir
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    const EXPANSIONS = {
        ':hi': "Hello!",
        ':mail': "example@mail.com",
    };

    function getText(el) {
        return el.isContentEditable ? el.textContent : el.value;
    }

    function setTextInputElement(el, text) {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
        if (setter) setter.call(el, text);
        else el.value = text;

        el.dispatchEvent(new Event("input", { bubbles: true }));
        el._valueTracker?.setValue(text);
        el.setSelectionRange?.(text.length, text.length);
    }

    function setContentEditable(el, text) {
        const sel = window.getSelection();
        const fullRange = document.createRange();
        fullRange.selectNodeContents(el);

        sel.removeAllRanges();
        sel.addRange(fullRange);

        try {
            el.dispatchEvent(new InputEvent("beforeinput", { inputType: "deleteContent", bubbles: true, cancelable: true }));
            el.dispatchEvent(new InputEvent("input", { inputType: "deleteContent", bubbles: true }));
        } catch {
            el.innerHTML = "";
        }

        try {
            el.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: text, bubbles: true, cancelable: true }));
            el.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: text, bubbles: true }));
        } catch {
            el.textContent = text;
        }

        const endRange = document.createRange();
        endRange.selectNodeContents(el);
        endRange.collapse(false);

        sel.removeAllRanges();
        sel.addRange(endRange);
    }

    function findMatchingShortcut(text) {
        const keys = Object.keys(EXPANSIONS);
        const maxLen = Math.max(...keys.map(k => k.length));
        for (let len = maxLen; len >= 2; len--) {
            const ending = text.slice(-len);
            if (EXPANSIONS[ending]) {
                return { key: ending, length: len };
            }
        }
        return null;
    }

    function expand() {
        const el = document.activeElement;
        if (!el) return;

        const isEditable = el.isContentEditable;
        const hasValue = el.value !== undefined;
        if (!isEditable && !hasValue) return;

        const text = getText(el);
        if (!text) return;

        const match = findMatchingShortcut(text);
        if (!match) return;

        const expanded = EXPANSIONS[match.key];
        const newText = text.slice(0, -match.length) + expanded;

        if (isEditable) {
            setContentEditable(el, newText);
        } else if (hasValue) {
            setTextInputElement(el, newText);
        }
    }

    document.addEventListener("keyup", expand, { passive: true });
})();
