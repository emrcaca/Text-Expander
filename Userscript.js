copyi buna ekle: // ==UserScript==
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
        '"1': "Owo h",
        '"2': "Owo b",
        '"3': "Owo"
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

    function expand() {
        const el = document.activeElement;
        if (!el) return;

        const text = getText(el);
        if (!text) return;

        const key = text.slice(-2);
        if (!(key in EXPANSIONS)) return;

        const expanded = text.slice(0, -2) + EXPANSIONS[key];

        if (el.isContentEditable) {
            setContentEditable(el, expanded);
        } else if (el.value !== undefined) {
            setTextInputElement(el, expanded);
        }
    }

    document.addEventListener("keyup", expand, { passive: true });
})();
