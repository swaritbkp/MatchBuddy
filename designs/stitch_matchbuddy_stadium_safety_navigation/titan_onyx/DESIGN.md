# Design System Philosophy: The Sentinel Interface

### 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Tactical Guardian."** 

In a high-pressure stadium environment, the UI must behave like a precision instrument—think of a Tesla dashboard or an aerospace cockpit. We are moving away from the "web-template" look of boxes and lines toward a fluid, high-contrast editorial experience. We achieve this through **Atmospheric Depth**: using light, shadow, and tonal shifts to guide the eye without the clutter of traditional structural elements. The interface should feel like it is projected onto glass rather than rendered on a flat screen.

### 2. Color & Atmospheric Layering
The palette is rooted in deep obsidian tones, punctuated by luminous signals.

*   **The "No-Line" Rule:** Under no circumstances are 1px solid borders to be used for sectioning or containment. Boundaries are defined by transitions between `surface_container_lowest` (#0E0E0E) and `surface_container_low` (#1C1B1B). If a section needs to feel "set in," use a darker tier; if it needs to "float," use a lighter tier.
*   **Surface Hierarchy & Nesting:**
    *   **Level 0 (Background):** `surface_dim` (#131313) – The base canvas.
    *   **Level 1 (Sub-sections):** `surface_container_low` (#1C1B1B) – Large organizational areas.
    *   **Level 2 (Active Cards):** `surface_container_high` (#2A2A2A) – Interactive elements.
    *   **Level 3 (Pop-overs):** `surface_container_highest` (#353534) – Temporary overlays.
*   **The Glass & Gradient Rule:** To achieve a "futuristic" polish, the `primary` (#ADC6FF) and `secondary` (#FFB4AB) tokens should rarely be used as flat fills. Instead, apply a subtle linear gradient from `primary` to `primary_container` (#4D8EFF) at a 135-degree angle. 
*   **Signature Textures:** For high-urgency SOS elements, use a 10% opacity "Inner Glow" using the `error` (#FFB4AB) token to simulate a physical LED backlight.

### 3. Typography: Editorial Authority
We use **Inter** with a heavy focus on hierarchy to communicate calm and urgency simultaneously.

*   **Display & Headline:** Use `display-lg` and `headline-lg` for critical status updates (e.g., "ZONE B SECURE"). Set these with a tight letter-spacing (-0.02em) to mimic premium editorial layouts.
*   **Title & Body:** `title-md` is your primary navigation and card header. Use `body-md` for descriptive text.
*   **Label Styles:** Use `label-md` and `label-sm` exclusively for technical metadata (e.g., timestamps, seat numbers, GPS coordinates). These should often use the `on_surface_variant` (#C2C6D6) to maintain a clean secondary hierarchy.

### 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "web-standard." We use **Ambient Lume** to define depth.

*   **The Layering Principle:** Instead of a shadow, place a `surface_container_high` card inside a `surface_container_lowest` "well." This creates a natural, recessed look that feels integrated into the stadium floor plan.
*   **Ambient Shadows:** For floating action buttons or critical alerts, use a shadow with a 32px blur, 0px offset, and 6% opacity of the `surface_tint` (#ADC6FF) color. This creates a "glow" rather than a "shadow."
*   **The "Ghost Border" Fallback:** If a layout requires a boundary for accessibility (e.g., an input field), use the `outline_variant` (#424754) at 15% opacity. It should be felt, not seen.
*   **Glassmorphism:** Overlays must use a 20px backdrop-blur combined with a semi-transparent `surface_container_highest`. This keeps the user grounded in the stadium map while focusing on the task at hand.

### 5. High-Impact Components

*   **Primary Action Buttons:** No flat fills. Use the `primary` to `primary_container` gradient. Border-radius must follow the `xl` (0.75rem) scale for a modern, friendly-yet-technical feel.
*   **SOS Toggle:** Use `error_container` (#93000A) as the base with an outer "lume" of `error` (#FFB4AB). This must be the most visually "heavy" element on any screen.
*   **Safety Status Chips:** Use `surface_container_highest` as the background. Status is indicated by a 6px glowing dot of `success` (#22C55E) or `tertiary` (#FFB786), never by coloring the entire chip.
*   **Input Fields:** Ghost-style inputs only. Use `surface_container_lowest` as a background well with a 1px `outline_variant` at 10% opacity. Label text should be `label-sm` and always visible (never placeholder-only).
*   **Cards & Lists:** **Prohibit dividers.** Separate list items using 12px of vertical white space (Spacing Scale). For complex lists, use alternating background shifts between `surface_container_low` and `surface_dim`.
*   **Live Map Overlays:** Use semi-transparent `surface_container_low` panels with `xl` rounding. Avoid sharp corners to maintain the "Apple Human Interface" fluidity.

### 6. Do’s and Don’ts

**Do:**
*   **Do** use intentional asymmetry. A map can bleed off one side of the screen while text is anchored to the other.
*   **Do** use `primary_fixed_dim` for icons to give them a subtle "lit from within" appearance.
*   **Do** prioritize "Breathing Room." Safety apps are stressful; the UI should provide a sense of calm through generous padding.

**Don’t:**
*   **Don’t** use pure white (#FFFFFF). All "white" text should be `on_surface` (#E5E2E1) to reduce eye strain in dark stadium environments.
*   **Don’t** use 100% opaque borders. They create "visual noise" and break the futuristic glass aesthetic.
*   **Don’t** use standard ease-in-out animations. Use "Spring" physics (damping 20, stiffness 100) for all transitions to mimic the tactile feel of high-end hardware.