// ==UserScript==
// @name         EmR Text Expander
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Evrensel metin genişletici
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    const EXPANSIONS = {
        'slm': "Selam!",
        'nbr': "Naber?",
        ':mail': "example.mail.com",
        ':cp': 'Kopyalanan: {{clipb}}',
        ':time': '{{time}}',
        ':date': '{{date}}',
        ':ip': '{{ip}}'
    };

    const EXPANSION_KEYS = new Set(Object.keys(EXPANSIONS));

    const getSelection = window.getSelection.bind(window);
    const createRange = document.createRange.bind(document);

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
        const sel = getSelection();
        const fullRange = createRange();
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

        const endRange = createRange();
        endRange.selectNodeContents(el);
        endRange.collapse(false);

        sel.removeAllRanges();
        sel.addRange(endRange);
    }

    function expand() {
        const el = document.activeElement;
        if (!el || (!el.isContentEditable && el.value === undefined)) return;

        const text = getText(el);
        if (!text || text.length < 2) return;

        const key = text.slice(-2);
        if (!EXPANSION_KEYS.has(key)) return;

        const expanded = text.slice(0, -2) + EXPANSIONS[key];

        if (el.isContentEditable) {
            setContentEditable(el, expanded);
        } else {
            setTextInputElement(el, expanded);
        }
    }

    document.addEventListener("keyup", expand, { passive: true });
})();
