// ==UserScript==
// @name         EmR Text Expander
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Evrensel metin genişletici
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    const EXP = {
        '"1': "Owo h",
        '"2': "Owo b",
        '"3': "Owo"
    };

    function getText(el) {
        return el.isContentEditable ? el.textContent : el.value;
    }

    function setTextInputElement(el, txt) {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
        setter ? setter.call(el, txt) : el.value = txt;

        el.dispatchEvent(new Event("input", { bubbles: true }));
        el._valueTracker?.setValue(txt);
        el.setSelectionRange?.(txt.length, txt.length);
    }

    function setContentEditable(el, txt) {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);

        sel.removeAllRanges();
        sel.addRange(range);

        try {
            el.dispatchEvent(new InputEvent("beforeinput", { inputType: "deleteContent", bubbles: true, cancelable: true }));
            el.dispatchEvent(new InputEvent("input", { inputType: "deleteContent", bubbles: true }));
        } catch {
            el.innerHTML = "";
        }

        try {
            el.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: txt, bubbles: true, cancelable: true }));
            el.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: txt, bubbles: true }));
        } catch {
            el.textContent = txt;
        }

        const end = document.createRange();
        end.selectNodeContents(el);
        end.collapse(false);
        sel.removeAllRanges();
        sel.addRange(end);
    }

    function expand() {
        const el = document.activeElement;
        if (!el) return;

        const t = getText(el);
        const k = t.slice(-2);
        if (!EXP[k]) return;

        const out = t.slice(0, -2) + EXP[k];

        if (el.isContentEditable) setContentEditable(el, out);
        else if (el.value !== undefined) setTextInputElement(el, out);
    }

    document.addEventListener("keydown", e => {
        if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
            setTimeout(expand, 0);
        }
    }, { passive: true });
})();
