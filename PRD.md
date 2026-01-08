# Product Requirements Document (PRD): CAD Online

## 1. Introduction
**Product Name:** CAD Online
**Version:** 2.0.0
**Status:** Active Development

### 1.1 Vision
To provide a robust, web-based 2D CAD application that mimics the core functionality and user experience of industry-standard desktop CAD software (like AutoCAD). It aims to be lightweight, accessible directly from a browser, and capable of handling complex 2D drafting tasks with precision.

### 1.2 Target Audience
-   **Architects & Engineers:** Needing quick access to drawings without installing heavy software.
-   **Students & Educators:** For learning CAD concepts without licensing barriers.
-   **Hobbyists & Makers:** For creating 2D designs for laser cutting, CNC, or 3D printing preparation.

## 2. Functional Requirements

### 2.1 Drawing Tools
The application must support creating the following geometric entities with precision input:

*   **Line:** Single line segments. Support for continuous chaining.
*   **Polyline (LWPOLYLINE):** Connected sequence of line and arc segments. Support for width and start/end widths.
*   **Rectangle:** Created by two opposite corners.
*   **Circle:** Created by Center+Radius.
*   **Arc:** Created by Center+Start+End, 3-Points.
*   **Ellipse:** Created by Center+Axis endpoints.
*   **Spline:** Smooth curves defined by control points or fit points.
*   **Point:** Single coordinate points.
*   **Construction Lines:**
    *   **Ray:** Semi-infinite line starting from a point.
    *   **XLine:** Infinite line passing through two points.
*   **Donut:** Filled ring shape defined by inner and outer diameters.
*   **Hatch:** Filling closed areas with patterns (Solid, Lines, etc.). Boundary detection required.

### 2.2 Editing & Modification Tools
Users must be able to modify existing entities. Selection can be done via clicking, window selection (left-to-right), or crossing selection (right-to-left).

*   **Move:** Translate entities from a base point to a destination.
    *   *Direct Drag:* Support dragging selected entities without explicit command.
*   **Copy:** Duplicate entities with displacement.
*   **Rotate:** Rotate entities around a base point by a specified angle.
*   **Scale:** Resize entities relative to a base point by a scale factor.
*   **Mirror:** Create a mirrored copy of entities across a reflection line.
*   **Trim:** Cut entity segments to the nearest intersecting edges.
*   **Extend:** Extend entity segments to the nearest boundary edge.
*   **Offset:** Create parallel copies of lines/curves at a specified distance.
*   **Stretch:** Deform entities by moving specific vertices while keeping others fixed (via crossing selection).
*   **Explode:** Break complex entities (Polyline, Block, Rectangle) into simpler components (Lines, Arcs).
*   **Erase:** Delete selected entities.
*   **Array:** Create patterns of copies (Rectangular, Polar).
*   **Fillet/Chamfer:** Round or bevel corners between two lines.

### 2.3 Annotation & Dimensioning
Tools for documenting the design.

*   **Text:**
    *   **Single/Multi-line Text:** In-place text editor for creating annotations.
    *   *Real-time Preview:* Text content should be visible on cursor before placement.
*   **Dimensions:**
    *   **Linear:** Horizontal/Vertical distances.
    *   **Aligned:** Parallel to the measured element.
    *   **Angular:** Angle between two lines.
    *   **Radius/Diameter:** For Circles and Arcs.
    *   **Continue/Baseline:** Chain dimensioning tools.
    *   **Settings:** Customizable dimension styles (arrow size, text height, units).
*   **Table:** Create grid-based tables with row/column control.
*   **Leaders:** Arrows pointing to specific features with attached text.

### 2.4 Layer Management
Comprehensive system to organize drawing data.
*   **Create/Delete Layers:** Manage layer list.
*   **Properties:** Set Color, LineType, LineWeight per layer.
*   **States:**
    *   *On/Off:* Visibility toggle.
    *   *Lock/Unlock:* Prevent editing.
    *   *Freeze/Thaw:* Performance optimization (exclude from regeneration).

### 2.5 Precision Tools & Navigation
Critical for CAD workflows.

*   **Object Snaps (OSNAP):** Snap to specific geometric points:
    *   Endpoint, Midpoint, Center, Intersection, Nearest, Quadrant, Perpendicular.
*   **Ortho Mode:** Restrict cursor movement to Horizontal/Vertical axes.
*   **Polar Tracking:** Snap cursor to specific angles (e.g., 30°, 45°, 90°).
*   **Coordinate Input:** Support for absolute (X,Y) and relative (@X,Y) coordinates via Command Line.
*   **Navigation:**
    *   **Zoom:** Mouse Wheel (dynamic), Window, Extents (Fit), In/Out.
    *   **Pan:** Middle mouse drag to move the view.
    *   **ViewCube:** UI widget for quick orientation (Top, Standard Views).

### 2.6 User Interface (UI)
*   **Viewport:** Infinite 2D canavas (HTML5 Canvas / WebGL).
*   **Ribbon:** Tabbed toolbar organizing commands by category (Home, Insert, Annotate, View).
*   **Command Line:** Text-based input area for typing commands, aliases (L for LINE), and seeing prompts/history.
*   **Properties Panel:** View and edit attributes of selected objects (Color, Layer, Geometry info).

## 3. Non-Functional Requirements
*   **Performance:** Must handle drawings with 10,000+ entities without significant lag. Use WebGL acceleration (Three.js/Fiber).
*   **Compatibility:** Modern web browsers (Chrome, Firefox, Edge, Safari).
*   **State Management:** Robust React Context or State library (Zustand/Redux) to manage complex drawing state.
*   **Persistence:** Auto-save to LocalStorage to prevent data loss on refresh. Import/Export support for DXF/JSON formats.

## 4. Technical Stack
*   **Frontend Framework:** React (TypeScript)
*   **Rendering Engine:** @react-three/fiber (Three.js wrapper for React)
*   **UI Components:** Custom or Material UI / Tailwind.
*   **Math/Geometry:** Custom geometry utilities for intersections, distances, and transformations.

## 5. Roadmap
*   **Block Support:** Create and insert reusable blocks (Internal).
*   **DXF Parser:** Full read/write support for standard .dxf files.
*   **Layouts:** Paper space/Model space separation.
*   **Mobile Support:** Touch gestures for navigation and drawing.
