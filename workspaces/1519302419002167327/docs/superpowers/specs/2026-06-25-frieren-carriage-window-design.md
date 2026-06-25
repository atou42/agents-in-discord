# Frieren Carriage Window Showroom Design

## Goal

Build a first-pass web showroom for a Frieren-inspired travelling carriage scene. The page should feel like the viewer is inside a moving carriage with Frieren present in the foreground, while the window area is reserved for a future video that carries the outside world: present road, memories, and event echoes.

The first pass should prove the composition, layering, and mood. It should not depend on 3D.

## Core Experience

The first screen is the experience. There is no landing page before it.

Frieren sits inside the carriage near the window. She is visible and emotionally anchors the scene. Her motion is restrained: reading, pausing, looking toward the window, small hair or sleeve movement. The carriage interior gently moves with the road.

The window is the primary video aperture. For now it should contain a clearly marked placeholder that can later be replaced with a real video. Around the placeholder, gradient blend zones must make the window feel integrated with the carriage, not like a rectangular video pasted behind a frame.

The mood should be quiet and time-worn. The scene should suggest that outside the window, reality, memory, and old events can overlap.

## Recommended First Version

Use a 2.5D layered webpage.

The foreground includes Frieren, interior shadows, seat or robe occlusion, window frame, curtains, dust, glass reflection, and subtle light movement. These layers can be images or short loop videos. The first build may use placeholder assets, but the structure must support swapping them for generated video loops later.

The background window layer is a video slot. It should be masked to the window shape and softened by gradients at the edges. The placeholder should preserve aspect ratio and show where the future video will go.

CSS animation is enough for first-pass carriage movement. Use slow, low-amplitude motion so the page feels alive without becoming theatrical.

## Layering Model

Back layer: outside-window video placeholder.

Blend layer: window-edge gradients, fog, glass reflection, dust, and light falloff.

Interior layer: carriage wall, window frame, curtain, seat edge, and other occluders that hide asset seams.

Character layer: Frieren foreground loop or placeholder image. The first version should use a normal rectangular media asset hidden inside the carriage composition rather than true alpha video.

UI layer: minimal title, one short line of narration, and a reserved control area for pause or memory entry. UI should not dominate the scene.

## Media Strategy

Do not use GIF as final runtime media. GIF can be a preview format during production, but the webpage should expect MP4 or WebM loops for quality and size.

First build should favor masked rectangular foreground media over transparent video. It is more reliable and faster to make look good. True alpha video can be tested as a later branch if the first composition works.

Avoid green-screen keying for the first pass. It can create dirty edges and distract from the scene.

## Branches To Validate

The first implementation should make it easy to compare three visual branches later:

Steady branch: Frieren is a normal foreground media layer hidden by carriage shadows and occluders. This is the default.

Alpha branch: Frieren is replaced by a transparent video layer to test cleaner overlap with window light.

Narrative branch: the foreground stays steady while the outside-window video becomes more active, testing the contrast between still Frieren and turbulent time layers.

## Interaction

The first build can be mostly passive. It should reserve interaction slots without requiring the final story system.

The page should have room for a future pause or gaze control. It should also reserve a future memory-entry control that can open a detail panel or switch the outside video segment.

## Success Criteria

The page feels like a carriage interior, not a generic video frame.

Frieren is clearly present.

The window video slot is obvious and replaceable.

Gradient and occlusion zones make the placeholder feel naturally embedded.

The composition works on desktop and mobile without text or visual layers colliding.

The first pass can be run locally and inspected in a browser.
