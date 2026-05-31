/* =========================================================
   Header skull mascot
   animation/skull/skull.js

   Tiny interactive mascot that sits next to the brand name.
   - idle: gentle float + occasional blink (frame-by-frame image swap)
   - 3 quick taps: "annoyed" nudge
   - 5 quick taps: "angry" (swaps image, glows), auto-resets
   - 5 MORE taps while angry: "dizzy" - spins 5 times, lands on the dizzy
     frame for a couple of seconds, then returns to idle

   Exposed as an ES module. Called from script.js inside init(),
   after renderNav() has placed #headerSkull into .brand-wrap.

   NOTE: img.src paths are resolved relative to the HTML document
   (index.html at the site root), NOT relative to this file. That's
   why they start at "animation/skull/assets/...".
   ========================================================= */

"use strict";

/* ----------------------------------------------------------------------
   Asset config - edit these to match your real filenames.
   BLINK_FRAMES must be in order: index 0 = fully open (resting), last =
   fully shut. The blink plays forward (open->shut) then back (shut->open).
---------------------------------------------------------------------- */
const ASSET_DIR = "animation/skull/assets/";

const BLINK_FRAMES = [
    "icon_blink_00_open.png", // 0 - fully open / resting
    "icon_blink_01.png",
    "icon_blink_02.png",
    "icon_blink_03.png",
    "icon_blink_04.png",
    "icon_blink_05.png",
    "icon_blink_06.png", // 6 - fully shut
];

const IDLE_FRAME = BLINK_FRAMES[0];        // shown between blinks
const ANGRY_FRAME = "skull-angry.png";     // shown while angry
const DIZZY_FRAME = "skull-dizzy.png";     // shown after the spin

// Per-frame hold time, in ms. Lower = faster blink.
const FRAME_MS = 28;

// How long the dizzy frame lingers before returning to idle (ms).
const DIZZY_HOLD_MS = 2500;

export function initSkull() {
    const skull = document.getElementById("headerSkull");
    if (!skull) return;

    const img = skull.querySelector("img");
    if (!img) return;

    let taps = 0;          // taps counted toward becoming angry
    let angryTaps = 0;     // taps counted while already angry (toward dizzy)
    let angry = false;
    let dizzy = false;
    let blinking = false;
    let blinkTimer = null;   // delay until next blink
    let frameTimer = null;   // stepping through blink frames
    let resetTimer = null;   // annoyed/angry reset
    let dizzyTimer = null;   // dizzy hold reset

    // Preload all frames so nothing stutters on first play.
    [...BLINK_FRAMES, ANGRY_FRAME, DIZZY_FRAME].forEach((name) => {
        const pre = new Image();
        pre.src = ASSET_DIR + name;
    });

    const setFrame = (name) => {
        img.src = ASSET_DIR + name;
    };

    // Play one full blink: 0->last->0 (open->shut->open), then reschedule.
    function playBlink() {
        if (angry || dizzy) {
            scheduleBlink();
            return;
        }

        blinking = true;

        const order = [];
        for (let i = 0; i < BLINK_FRAMES.length; i++) order.push(i);     // 0..6
        for (let i = BLINK_FRAMES.length - 2; i >= 0; i--) order.push(i); // 5..0

        let step = 0;

        const tick = () => {
            if (angry || dizzy) {
                blinking = false;
                return;
            }

            setFrame(BLINK_FRAMES[order[step]]);
            step++;

            if (step < order.length) {
                frameTimer = setTimeout(tick, FRAME_MS);
            } else {
                blinking = false;
                setFrame(IDLE_FRAME);
                scheduleBlink();
            }
        };

        tick();
    }

    function scheduleBlink() {
        clearTimeout(blinkTimer);

        const delay = 7000;

        blinkTimer = setTimeout(() => {
            if (angry || dizzy) {
                scheduleBlink();
                return;
            }

            playBlink();
        }, delay);
    }

    function returnToIdle() {
        angry = false;
        dizzy = false;
        blinking = false;
        taps = 0;
        angryTaps = 0;

        clearTimeout(frameTimer);
        clearTimeout(resetTimer);
        clearTimeout(dizzyTimer);

        skull.classList.remove("angry", "annoyed", "dizzy");
        setFrame(IDLE_FRAME);

        // Important: dizzy mode clears blinkTimer, so idle must restart it.
        scheduleBlink();
    }

    function becomeAngry() {
        angry = true;
        angryTaps = 0;

        clearTimeout(frameTimer);
        blinking = false;

        skull.classList.remove("annoyed");
        skull.classList.add("angry");

        setFrame(ANGRY_FRAME);

        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
            // Only auto-calm if we didn't escalate into a spin.
            if (!dizzy) returnToIdle();
        }, 3500);
    }

    function becomeDizzy() {
        // Lock out further taps during the spin/hold.
        dizzy = true;

        clearTimeout(resetTimer);
        clearTimeout(frameTimer);
        clearTimeout(blinkTimer);
        clearTimeout(dizzyTimer);
        blinking = false;

        // Spin: swap angry glow off, add the spin class (5 turns via CSS).
        skull.classList.remove("annoyed", "angry");
        skull.classList.add("dizzy");

        // Keep the angry face during the spin, then drop to dizzy frame when
        // the CSS spin animation ends.
        setFrame(ANGRY_FRAME);

        const finishDizzy = () => {
            setFrame(DIZZY_FRAME);
            dizzyTimer = setTimeout(returnToIdle, DIZZY_HOLD_MS);
        };

        // If the user prefers reduced motion, the spin animation is disabled in
        // CSS, so animationend never fires — go straight to the dizzy frame.
        const reduceMotion = window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (reduceMotion) {
            finishDizzy();
            return;
        }

        const onSpinEnd = () => {
            skull.removeEventListener("animationend", onSpinEnd);
            finishDizzy();
        };

        skull.addEventListener("animationend", onSpinEnd);
    }

    function becomeAnnoyed() {
        if (angry || dizzy) return;

        skull.classList.add("annoyed");

        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
            skull.classList.remove("annoyed");
        }, 1000);
    }

    function tap() {
        if (dizzy) return; // ignore taps during the spin/hold

        if (angry) {
            angryTaps++;

            if (angryTaps >= 5) {
                becomeDizzy();
            }

            return;
        }

        taps++;

        if (taps >= 5) {
            becomeAngry();
            return;
        }

        if (taps >= 3) {
            becomeAnnoyed();
        }
    }

    skull.addEventListener("click", tap);

    skull.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            tap();
        }
    });

    // Start on the resting frame, then begin the idle blink loop.
    setFrame(IDLE_FRAME);
    scheduleBlink();
}