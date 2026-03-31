# Design System Specification: The Digital Greenhouse

## 1. Overview & Creative North Star
**Creative North Star: The Living Journal**
This design system rejects the sterile, "app-like" feel of traditional productivity tools. Instead, it draws inspiration from high-end editorial stationery and modern architectural botanical gardens. It is a space designed for "Growth & Consistency," where the UI feels like a living organism—structured yet organic.

To break the "template" look, we utilize **Intentional Asymmetry**. Layouts should avoid perfect bilateral symmetry; instead, use overlapping "paper" layers where cards slightly bleed over container edges, and utilize a "Scale of Importance" where typography moves from massive, editorial display faces to tiny, precise monospace data points.

## 2. Colors & Surface Philosophy
The palette is rooted in nature, moving away from the harshness of pure black and white. We use `#fbfaee` (warm cream) as our canvas and a range of forest and sprout greens to define depth.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through background color shifts.
*   **Primary Surface:** `surface` (#fbfaee).
*   **Secondary Sectioning:** `surface_container_low` (#f5f4e8).
*   **Active/Inset Areas:** `surface_container_highest` (#e4e3d7).
Separation is achieved through "Tonal Proximity"—the eye perceives the edge where one cream shifts to a soft sage, creating a cleaner, more premium interface.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
1.  **The Base:** `surface`.
2.  **The Plate:** `surface_container` (used for main content blocks).
3.  **The Highlight:** `surface_container_lowest` (#ffffff) for high-priority floating cards.
4.  **The Depth:** `surface_dim` (#dbdbcf) for background utility areas.

### The "Glass & Gradient" Rule
To create "soul," avoid flat blocks of color for major interactions.
*   **Main CTAs:** Use a subtle linear gradient from `primary` (#006e2f) to `primary_container` (#22c55e).
*   **Glassmorphism:** For overlays or navigation bars, use `surface_variant` at 70% opacity with a `backdrop-filter: blur(20px)`. This allows the "foliage" (the content) to peek through the frost.

## 3. Typography: The Editorial Contrast
We pair a humanistic sans-serif with a technical monospace to represent the duality of "Growth" (Organic) and "Consistency" (Data).

*   **The Narrative Layer (Manrope):** Used for all headers and body. It feels approachable and modern.
    *   *Display-LG (3.5rem):* Used for daily greetings and "Big Wins." Treat this like a magazine headline.
    *   *Headline-MD (1.75rem):* For section titles.
*   **The Technical Layer (Space Grotesk):** Used for `label-md` and `label-sm`. 
    *   **Rule:** Every statistic, time-stamp, streak count, and date *must* use Space Grotesk. This creates a visual "stamping" effect, like a date-stamp in a physical journal.

## 4. Elevation & Depth
Depth in this system is achieved through **Tonal Layering** rather than structural shadows.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` section to create a soft, natural lift. 
*   **Ambient Shadows:** When an element must "float" (e.g., a modal), use a high-spread, low-opacity shadow tinted by the brand color.
    *   *Token:* `rgba(27, 28, 21, 0.06)` with a `40px` blur and `10px` Y-offset.
*   **The "Ghost Border" Fallback:** If a container requires further definition for accessibility, use the `outline_variant` (#bccbb9) at 20% opacity. Never use 100% opacity for lines.

## 5. Components

### Buttons: Tactile & Weighted
*   **Primary:** Background: Gradient (`primary` to `primary_container`). Shape: `full` (9999px). Shadow: Small ambient glow of the same color.
*   **Secondary:** Background: `surface_container_highest`. Text: `on_surface`. Tactile feel: On `:hover`, the button should scale to 1.02 and shift color slightly to `surface_dim`.
*   **Tactile State:** All buttons should use a `0.2s ease-out` transition.

### Cards & Progress
*   **Cards:** Use `DEFAULT` (1rem) or `lg` (2rem) corner radius. 
*   **The Streak Component:** Use the `tertiary` (#9d4300) streak orange for the number, paired with `Space Grotesk`. 
*   **Progress Bars:** Background: `surface_container_high`. Fill: `primary_container`. Height should be substantial (at least `spacing-2`) with `full` rounding to feel like a "pod."

### Input Fields
*   **Style:** Minimalist. No bottom line. Use `surface_container_low` as a background.
*   **Focus State:** The background shifts to `surface_container_lowest` and a soft `outline` appears at 30% opacity. 

### Lists & Spacing
*   **Rule:** Forbid the use of divider lines. 
*   **Mechanism:** Use `spacing-4` (1.4rem) between list items. Use subtle background shifts (`surface_container_low` vs `surface_container_high`) to denote grouping.

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetry:** Place your headers slightly off-center or allow images to break the container grid.
*   **Embrace Space:** Use `spacing-12` (4rem) and `spacing-16` (5.5rem) to let the design breathe. It is a study planner; the user needs mental "white space."
*   **Tint Your Greys:** Every "grey" in this system must have a hint of green or cream. Use `on_surface_variant` (#3d4a3d).

### Don't:
*   **Don't use pure black (#000) or pure white (#FFF).** It breaks the organic "journal" vibe.
*   **Don't use 1px borders.** If you feel the need for a line, use a background color change instead.
*   **Don't use the Monospace font for body text.** It is strictly for numbers, dates, and labels to act as a "data layer."