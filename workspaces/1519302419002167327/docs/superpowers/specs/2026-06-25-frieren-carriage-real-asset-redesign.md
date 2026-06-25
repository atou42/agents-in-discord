# Frieren Carriage Real Asset Redesign

## Goal

Upgrade the carriage-window showroom from a code-drawn mock into a real visual prototype that can be judged on mood, composition, and asset quality.

## Visual Standard

The first viewport must feel like a cinematic still from inside a horse-drawn carriage, not a diagram. Frieren must be visible inside the carriage. The carriage window remains the main narrative device, and the outside layer stays replaceable by video.

The art direction is melancholic, painterly, and grounded. It should avoid toy-like flat shapes, obvious UI-card composition, and decorative fantasy clutter. The main image should carry the page. Text and buttons are secondary.

## Asset Plan

Generate two primary assets with image2.

The cabin asset is a wide cinematic interior. It contains the wood carriage, seat, curtains, window frame, warm evening light, and a white-haired elven mage seated in the carriage. The outside view through the window should be simple enough to cut out cleanly.

The outside asset is a wide memory landscape. It is not a literal road view. It mixes hills, old campfire light, ruins, a distant village, and soft ghosted silhouettes, so the window feels like reality and recollection overlapping.

Create derived production assets locally.

The cabin image becomes a transparent-window overlay. The window aperture is cut out so the video layer can sit behind it. The outside asset becomes a slow looping window video through pan, light drift, and memory haze. Glass reflections and interior light are kept as separate overlays so the future real video can still blend naturally.

## Page Structure

The page remains one full-screen composition. The layer order is background, window video, generated cabin overlay, glass/light/grain overlays, and small story controls.

The user-facing controls stay minimal. “凝视” pauses motion. “进入记忆” cycles the memory sentence and increases the window-memory overlay.

## Responsive Rule

Desktop should preserve a wide cinematic frame. Mobile should crop the same scene intentionally instead of restacking it. Frieren must remain visible on mobile, and the headline must not cover her face.

## Verification Method

Run the local page in a browser and capture desktop and mobile screenshots. Reject the result if the scene reads as flat mock art, if the generated character is hidden, if the window does not look like a real opening, or if text covers the character.

Click both controls locally and on the published Cohub work. Check that all resources load with successful HTTP status and the browser console has no errors.

Publish only the cleaned site directory to Cohub work. Verify the public URL with a browser screenshot after publishing.
