# IMAGE PROMPT TEMPLATE

## 사용 전 확인

Replace every [VARIABLE] before using this prompt.

Do not leave placeholder text.

아래 대괄호 항목을 모두 국가별 값으로 교체한 뒤 사용한다.

최신 승인 기준 이미지를 반드시 함께 제공한다.

승인 기준 이미지가 없는 상태에서 카메라와 구도를 임의로 생성하지 않는다.

---

Create one production-ready vertical scrolling shooter background for a country-themed stage.

This is not a poster, map, infographic, UI screen, travel illustration, or collection of separate scenes.

It must be one continuous playable miniature world.

## COUNTRY

[COUNTRY]

## MASTER REFERENCE

Use the latest user-approved project reference image as the highest-priority composition and camera baseline.

Only an image explicitly approved by the user may be treated as the master reference.

If any sentence in this prompt conflicts with the approved reference image, follow the approved reference image.

Match its:

- oblique aerial camera
- miniature diorama scale
- visible roofs and building sides
- vertical depth
- central gameplay axis
- left and right landmark placement
- continuous intro-to-gameplay world
- combat readability
- overall spatial impression

Do not estimate or reinterpret the camera from numeric angles.

Do not change it into:

- top-down
- flat map
- side view
- isometric tilemap
- cinematic landscape
- wide horizon view
- tourism poster composition

## WORLD STRUCTURE

Compress the country into one continuous vertical diorama.

The entire image must feel like one connected terrain.

Do not stack independent landmark scenes vertically.

Do not create a collage.

Do not separate traditional, modern, natural, residential, or industrial areas into disconnected panels.

Country flow:

[REGION_1] → [REGION_2] → [REGION_3] → [REGION_4]

Connect the regions using:

[CONNECTING_ELEMENTS]

The top and bottom must feel like parts of the same scrolling world.

## CENTRAL GAMEPLAY AXIS

Use [AXIS] as the continuous movement axis from bottom to top.

The center must remain playable and visually readable.

The central axis may contain:

- roads
- water
- coastlines
- terrain
- low vegetation
- low structures
- subtle environmental details

The center must stay lower in visual priority than the player, enemies, and bullets.

Do not:

- block the center with large buildings
- place major landmarks in the center
- fill the center with bright reflections
- create bullet-like point lights
- create dense repetitive patterns
- divide the screen with a hard visual boundary
- make the center look empty and unfinished
- create a tourism-poster composition with no playable corridor

## INTRO

The intro camera focuses on [INTRO_LANDMARK].

After zooming out, the same landmark must remain naturally integrated into the side of the gameplay background.

The intro and gameplay must use the exact same world and space.

Do not create:

- a separate intro image
- a separate cinematic scene
- a disconnected close-up environment
- an intro-only landmark arrangement

## LANDMARK ORDER

1. [LANDMARK_1]
2. [LANDMARK_2]
3. [LANDMARK_3]
4. [LANDMARK_4]
5. [LANDMARK_5]

Place major landmarks mainly on the left and right sides.

Vary their scale and importance.

Do not present them as a tourist checklist.

Do not make every landmark equally large.

Keep important landmarks away from the image center and future chunk boundaries.

Make key landmarks recognizable by silhouette and structure, not by text labels.

## EDUCATIONAL FOCUS

The player should clearly recognize:

- [EDUCATIONAL_LANDMARK]
- [COUNTRY_FEATURE]
- [MEMORY_POINT]

Show these elements through the environment itself.

Do not add explanatory labels, captions, signs, or UI.

The educational elements must not reduce combat readability.

## ART STYLE

- premium pre-rendered 2.5D miniature diorama
- high-quality game environment
- large readable forms
- clear silhouettes
- refined materials
- cohesive lighting
- rich detail without reducing combat readability
- consistent visual style across all regions
- believable but compressed geography
- unified rendering quality across the entire image

Avoid:

- satellite imagery
- flat tourism maps
- photo collage
- low-cost low-poly toy style
- exaggerated cartoon rendering
- excessive cel shading
- inconsistent styles between regions
- excessive fog or bloom
- over-detailed micro-textures
- poster-like composition
- disconnected scene transitions

## LIGHTING

Use [DAY_OR_NIGHT].

Keep one consistent time of day across the entire stage.

Do not change lighting by region or chunk.

For night scenes:

- reduce bullet-like point lights
- keep the central axis readable
- preserve landmark silhouettes
- avoid excessive glowing windows and neon noise

## SCROLLING COMPOSITION

- true vertical 9:16 composition
- clear bottom-to-top progression
- no wide landscape framing
- no large sky area
- no poster-like top or bottom ending
- top and bottom must feel like parts of the same scrolling world
- preserve enough visual continuity for later vertical chunk division
- avoid placing key landmarks on future chunk boundaries

## DO NOT INCLUDE

- text
- labels
- explanatory signs
- flags used as UI
- HUD
- icons
- buttons
- borders
- split-screen layouts
- aircraft
- enemies
- bullets
- explosions
- damage numbers
- mission markers
- interface effects
- watermark

## OUTPUT

- exactly one clean environment background image
- output only the environment
- do not invent additional gameplay elements
- no UI or gameplay objects
- [OUTPUT_SIZE]
- [DAY_OR_NIGHT]
- suitable for intro zoom
- suitable for gameplay scrolling
- suitable for later vertical chunk division
- consistent with the latest user-approved reference image
