# World First Frame Product Design

Date: 2026-06-04

## Why This Exists

This product serves creators who have a creative impulse but do not yet have a precise visual target. They may start with a single emotion, theme, genre, character idea, reference image, or short phrase. They are not the users who already know the exact image they want and only need a prompt editor or image-to-image tool.

The product helps these creators discover and sharpen intent through repeated visual presentation, confirmation, rejection, and selection. The user does not need to understand prompt writing. The system turns a small starting intent into many visual possibilities, forces the user to make tradeoffs, and uses those choices to converge toward a world that feels alive enough to continue creating.

The first version should not become a complete worldbuilding suite. Its job is narrower. It should help the user produce one primary world direction, one first-frame image that feels like a photograph from that world, and an exportable pack of up to ten images that express the world strongly enough for future creative work.

## Target User

The target user has a feeling but not a finished concept. They may say only "anger", "a lonely future city", "a girl who should not be there", or upload a loose reference image. They want visual stimulus that helps them notice what attracts them and what does not.

The product should avoid optimizing for expert prompt users, strict reference reproduction, detailed design-system control, full lore management, or users who already have a finished mental image. Those users have better tools elsewhere.

## Product Shape

The product is a desktop web application. The first version should use a simple staged interaction rather than a complex canvas. The core loop is generation, selection, context update, and regeneration.

Each round has a finite goal and a clear exit. The user must make choices and give things up. If every image and every element can be kept, the product will produce a weak collage instead of a strong world direction.

## Starting Input

The user starts with a short intent. Shorter is better. A single word is allowed. A short phrase is allowed. The user may upload one reference image, but the reference image should be treated as inspiration, not as a strict target for composition, subject, or identity.

The product should frame the reference image as a source of mood, theme, element, texture, or emotional direction. It should not imply faithful image reproduction.

## Round One: Primary Direction

Round One finds the primary direction. It does not produce the final first frame.

The system generates three 3x3 grids through ImageTool. Each grid is cut into nine separate images, giving the user twenty-seven visual candidates while requiring only three generation calls. The prompt design for these three grids should intentionally spread the candidates across meaningfully different visual directions. The value of twenty-seven images is not volume alone. It is the feeling of a rich field of possibilities.

The user must choose exactly one primary direction from the twenty-seven candidates. This primary direction becomes the anchor for later rounds.

The user may also mark limited auxiliary elements from other candidates. An auxiliary element can be a subject, texture, material, lighting quality, spatial feeling, object, color relation, or mood detail. Auxiliary elements must remain subordinate to the primary direction. They cannot have equal weight.

The user should also reject directions that do not belong. Rejected directions are part of the context because they help prevent later generations from drifting into attractive but wrong territory.

Round One ends when the user has one primary direction, a small set of auxiliary elements, and a set of rejected directions. If the user cannot choose one primary direction, the round should continue with another twenty-seven candidates rather than moving forward with an unclear anchor.

## Round Two: First Frame

Round Two finds the first frame. The first frame should feel like a photograph taken inside the world, not a prompt collage, mood board, or generic concept art.

The system again uses twenty-seven candidates per generation pass. These candidates must align with the Round One primary direction and may use only the limited auxiliary elements as supporting material.

The user searches for one image that truly feels like it comes from the world. The first version requires one chosen first frame, not alternates.

If the user repeatedly finds that the generated images are not right, the product should allow the user to return to Round One and adjust the primary direction or auxiliary elements. This prevents infinite random generation when the real problem is an unstable anchor.

Round Two ends when the user selects the first frame.

## Round Three: World Photo Pack

Round Three expands outward from the first frame. It does not attempt to complete the whole world.

The system generates images that feel like additional photographs from the same world. These may show other places, people, moments, objects, incidents, scales, or textures of life, but they must remain aligned with the first frame and the Round One primary direction.

Each Round Three generation gives the user ten candidates. The user may keep images for the final pack and reject images that do not belong. The final pack has a hard limit of ten images.

This round should stop before the product becomes a full worldbuilding or lore-completion tool. Ten images are enough for a compact visual expression of creative intent. Larger expansion belongs to a later product stage.

Round Three ends when the user chooses to export the pack or reaches ten kept images and accepts the pack.

## Context Model

The system context should record the short starting intent, the optional reference image, the Round One primary direction, the limited auxiliary elements, rejected directions, the selected first frame, rejected first-frame attempts, kept pack images, and rejected pack images.

Positive and negative choices matter equally. Positive choices show what the user wants. Negative choices show where the system should stop drifting. The prompt context for later rounds must use both.

The context should stay small enough to remain usable. The product should not store every incidental preference as an equal rule. It should preserve only the choices that affect convergence.

## Export

The final export is a zip archive containing up to ten images.

The export should also include a short text summary with the original user intent, the primary direction, the selected first frame, the confirmed auxiliary elements, and the rejected directions. This lets the pack serve as input for other people, agents, or future products.

## First Version Scope

The first version should prove the staged visual convergence loop. It should not include a canvas, complex annotation tools, full prompt editing, collaboration, version trees, long document import, detailed lore fields, map systems, character sheets, timeline tools, or downstream product integrations.

The minimum useful product is a desktop web flow where a user enters a short intent, optionally uploads one reference image, chooses one primary direction from twenty-seven visual candidates, converges on one first-frame image, expands into a ten-image world photo pack, and exports the result.

## Success Criteria

The first version succeeds if a creator with only a vague starting impulse can complete the flow without writing prompts and leave with a first frame and a compact image pack that makes them want to continue creating.

The product fails if it becomes a prompt editor, a loose image gallery, a reference reproduction tool, or a worldbuilding database before the core convergence loop is proven.
