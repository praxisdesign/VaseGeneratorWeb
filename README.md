# VaseGeneratorWeb

VaseGeneratorWeb is a browser-based parametric vase and continuous Cartesian toolpath generator designed for concrete extrusion printing. It starts with a 35 mm nozzle and 20 mm layer-height equipment profile, combines editable revolved profile curves with optional woven surface relief, and exports a continuous spiral G-code path for further machine validation.

## Features

- Eight editable profile presets
- Interactive SVG profile editor
- Live Three.js revolved-vase preview
- Optional woven surface pattern
- Vertical ribs, horizontal bands, diamond, spiral, cellular, and seeded noise patterns
- Editable height mask for fading surface patterns through the vase
- Layer-offset buildability heatmaps in the profile and 3D bead preview
- Maximum overhang marker with adjustable offset threshold
- G-code-order print simulation with layer, height, line, and time readouts
- Concrete printer dimensions and speed controls
- Continuous Cartesian G-code export using configurable geometry
- Responsive local browser interface

## Getting started

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal. Create a production build with `npm run build`.

## Controls

- Select a preset from the left panel.
- Drag profile points to reshape the vase.
- Orbit, pan, and zoom the 3D preview with the mouse or touch.
- Adjust dimensions, safety threshold, surface pattern, and height mask in the right panel.
- Switch between material, bead, and heatmap preview modes.
- Play the print simulation or jump directly to a G-code line.
- Download the generated Cartesian toolpath using **Download G-code**.

> Generated toolpaths must be validated against the printer controller, pump commands, machine envelope, material mix, and physical test prints before operation.
