// 3D donut chart on a <canvas>: slices, leader labels, hover tooltip and image export.
// DonutChartInterop (C#) calls createDonutChart once, then render() on every change.

/** One slice, as sent by DonutChartOptions (C#). */
export interface DonutSlice {
    label: string;
    color: string;
    value: number;
    valueText: string;
    percentText: string;
}

/** Chart data, as sent by DonutChartOptions (C#). */
export interface DonutChartOptions {
    title: string;
    depth: number;
    tilt: number;
    rotation: number;
    slices: DonutSlice[];
}

/** Canvas colors, read from the active theme of tokens.css. */
interface Theme {
    background: string;
    text: string;
    line: string;
    pillBackground: string;
    pillBorder: string;
    rim: string;
    separator: string;
    shadow: string;
    shadowEnd: string;
}

/** Center and radii of the two ellipses (outer and hole) of the donut. */
interface Shape {
    cx: number;
    cy: number;
    outerRx: number;
    outerRy: number;
    innerRx: number;
    innerRy: number;
}

/** Angles of a slice, in radians. */
interface Arc {
    start: number;
    end: number;
    slice: DonutSlice;
}

interface Label {
    anchorX: number;
    anchorY: number;
    elbowX: number;
    elbowY: number;
    x: number;
    y: number;
    toRight: boolean;
    color: string;
    text: string;
}

type Point = [number, number];

type WallKind = 'outer' | 'inner';

// The chart is always painted at 800 x 540; the canvas scales it for the screen and for export.
const WIDTH = 800;
const HEIGHT = 540;
const EXPORT_SCALE = 4;

// Slices with value 0 still get this angle, so they can be seen and hovered.
const MIN_ANGLE = 0.018;

const FULL_TURN = Math.PI * 2;
const FONT_FAMILY = "Jost, 'Helvetica Neue', Arial, sans-serif";

export function createDonutChart(canvas: HTMLCanvasElement, tooltip: HTMLElement): DonutChart {
    return new DonutChart(canvas, tooltip);
}

export class DonutChart {
    private readonly canvas: HTMLCanvasElement;
    private readonly tooltip: HTMLElement;
    private readonly themeObserver: MutationObserver;
    private options: DonutChartOptions | null = null;
    private arcs: Arc[] = [];
    private hovered = -1;
    private frame = 0;

    constructor(canvas: HTMLCanvasElement, tooltip: HTMLElement) {
        this.canvas = canvas;
        this.tooltip = tooltip;

        canvas.addEventListener('mousemove', this.onMouseMove);
        canvas.addEventListener('mouseleave', this.onMouseLeave);

        // Repaint when the theme changes.
        this.themeObserver = new MutationObserver(() => this.schedule());
        this.themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-bs-theme', 'data-theme'],
        });

        // Repaint when Jost is ready, so the text doesn't stay in the fallback font.
        document.fonts.load(`500 16px ${FONT_FAMILY}`).then(() => this.schedule(), () => undefined);
    }

    render(options: DonutChartOptions): void {
        this.options = options;
        this.schedule();
    }

    async exportImage(format: string): Promise<void> {
        if (!this.options) {
            return;
        }

        const image = document.createElement('canvas');
        image.width = WIDTH * EXPORT_SCALE;
        image.height = HEIGHT * EXPORT_SCALE;

        const context = image.getContext('2d');
        if (!context) {
            return;
        }

        context.scale(EXPORT_SCALE, EXPORT_SCALE);
        paint(context, this.options, readTheme(this.canvas), -1);

        const extension = format === 'jpg' ? 'jpg' : 'png';
        const type = extension === 'jpg' ? 'image/jpeg' : 'image/png';
        const blob = await new Promise<Blob | null>(resolve => image.toBlob(resolve, type, 0.95));
        if (!blob) {
            return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chartwave-donut.${extension}`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }

    dispose(): void {
        cancelAnimationFrame(this.frame);
        this.themeObserver.disconnect();
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
    }

    // Many changes in a row (a slider being dragged) become one paint per frame.
    private schedule(): void {
        cancelAnimationFrame(this.frame);
        this.frame = requestAnimationFrame(() => this.draw());
    }

    private draw(): void {
        this.frame = 0;

        // Canvas pixels follow the screen density, so the chart stays sharp on high-DPI screens.
        const ratio = window.devicePixelRatio || 1;
        const width = Math.round(WIDTH * ratio);
        const height = Math.round(HEIGHT * ratio);
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }

        const context = this.canvas.getContext('2d');
        if (!context || !this.options) {
            return;
        }

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.arcs = paint(context, this.options, readTheme(this.canvas), this.hovered);
    }

    private readonly onMouseMove = (event: MouseEvent): void => {
        if (!this.options) {
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (WIDTH / rect.width);
        const y = (event.clientY - rect.top) * (HEIGHT / rect.height);
        const found = hitTest(this.arcs, shapeFor(this.options.tilt), x, y);

        if (found !== this.hovered) {
            this.hovered = found;
            this.schedule();
        }

        if (found < 0) {
            this.hideTooltip();
            return;
        }

        // Text nodes, never innerHTML: the label is typed by the user.
        const slice = this.arcs[found].slice;
        const name = document.createElement('strong');
        name.textContent = slice.label;
        this.tooltip.replaceChildren(name, document.createTextNode(`: ${slice.valueText} (${slice.percentText})`));

        const host = (this.tooltip.offsetParent as HTMLElement | null) ?? this.canvas;
        const hostRect = host.getBoundingClientRect();
        this.tooltip.style.left = `${event.clientX - hostRect.left + 14}px`;
        this.tooltip.style.top = `${event.clientY - hostRect.top - 30}px`;
        this.tooltip.style.opacity = '1';
    };

    private readonly onMouseLeave = (): void => {
        this.hovered = -1;
        this.hideTooltip();
        this.schedule();
    };

    private hideTooltip(): void {
        this.tooltip.style.opacity = '0';
    }
}

/** Paints the whole chart at WIDTH x HEIGHT and returns the slice arcs, for hit testing. */
function paint(context: CanvasRenderingContext2D, options: DonutChartOptions, theme: Theme, hovered: number): Arc[] {
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.fillStyle = theme.background;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    const shape = shapeFor(options.tilt);

    if (options.title) {
        context.fillStyle = theme.text;
        context.font = `500 ${Math.round(WIDTH * 0.026)}px ${FONT_FAMILY}`;
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.fillText(options.title, shape.cx, HEIGHT * 0.022);
    }

    const arcs = buildArcs(options);
    if (arcs.length === 0) {
        return arcs;
    }

    drawShadow(context, shape, options.depth, theme);

    for (const arc of arcs) {
        drawWall(context, shape, arc, options.depth, 'inner');
    }

    for (const arc of arcs) {
        drawWall(context, shape, arc, options.depth, 'outer');
    }

    arcs.forEach((arc, index) => drawTop(context, shape, arc, theme, index === hovered));

    context.strokeStyle = theme.rim;
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(shape.cx, shape.cy, shape.outerRx, shape.outerRy, 0, 0, FULL_TURN);
    context.stroke();
    context.beginPath();
    context.ellipse(shape.cx, shape.cy, shape.innerRx, shape.innerRy, 0, 0, FULL_TURN);
    context.stroke();

    drawLabels(context, shape, arcs, theme);
    return arcs;
}

function shapeFor(tilt: number): Shape {
    const squash = tilt / 100;
    const outerRx = WIDTH * 0.219;
    const innerRx = outerRx * 0.52;

    return {
        cx: WIDTH / 2,
        cy: HEIGHT / 2 + HEIGHT * 0.037,
        outerRx,
        outerRy: outerRx * squash,
        innerRx,
        innerRy: innerRx * squash,
    };
}

function buildArcs(options: DonutChartOptions): Arc[] {
    const slices = options.slices;
    const total = slices.reduce((sum, slice) => sum + Math.max(slice.value, 0), 0);
    if (slices.length === 0 || total <= 0) {
        return [];
    }

    const zeroCount = slices.filter(slice => slice.value <= 0).length;
    const available = FULL_TURN - zeroCount * MIN_ANGLE;
    let angle = -Math.PI / 2 + (options.rotation * Math.PI) / 180;

    return slices.map(slice => {
        const sweep = slice.value <= 0 ? MIN_ANGLE : (slice.value / total) * available;
        const arc: Arc = { start: angle, end: angle + sweep, slice };
        angle += sweep;
        return arc;
    });
}

function middle(arc: Arc): number {
    return (arc.start + arc.end) / 2;
}

function ellipsePoint(cx: number, cy: number, rx: number, ry: number, angle: number): Point {
    return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)];
}

// ─── 3D walls ───
// Slices touch each other, so their cut faces are never visible and are not drawn.
// Within a layer (inner walls, outer walls, top faces) slices don't overlap, so no sorting is needed.

/** Angles where each wall faces the viewer: the front half of the outer wall, the back half of the hole. */
const VISIBLE_RANGE: Record<WallKind, [number, number]> = {
    outer: [0, Math.PI],
    inner: [Math.PI, FULL_TURN],
};

// Brightness across the wall, left to right, as a lit cylinder.
const WALL_LIGHT: Record<WallKind, [number, number][]> = {
    outer: [[0, 0.5], [0.42, 0.8], [0.58, 0.77], [1, 0.46]],
    inner: [[0, 0.62], [0.5, 0.42], [1, 0.62]],
};

function drawWall(context: CanvasRenderingContext2D, shape: Shape, arc: Arc, depth: number, kind: WallKind): void {
    const rx = kind === 'outer' ? shape.outerRx : shape.innerRx;
    const ry = kind === 'outer' ? shape.outerRy : shape.innerRy;

    const gradient = context.createLinearGradient(shape.cx - rx, 0, shape.cx + rx, 0);
    for (const [stop, light] of WALL_LIGHT[kind]) {
        gradient.addColorStop(stop, darken(arc.slice.color, light));
    }

    for (const [from, to] of visibleParts(arc, kind)) {
        const count = Math.max(8, Math.ceil(((to - from) / FULL_TURN) * 180));
        const step = (to - from) / count;

        context.beginPath();
        for (let i = 0; i <= count; i++) {
            const [x, y] = ellipsePoint(shape.cx, shape.cy, rx, ry, from + step * i);
            if (i === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
        }
        for (let i = count; i >= 0; i--) {
            const [x, y] = ellipsePoint(shape.cx, shape.cy, rx, ry, from + step * i);
            context.lineTo(x, y + depth);
        }
        context.closePath();
        fillWithoutSeams(context, gradient);
    }
}

/** Parts of the arc inside the visible range of the wall (an arc can cross it twice). */
function visibleParts(arc: Arc, kind: WallKind): [number, number][] {
    const [low, high] = VISIBLE_RANGE[kind];
    const parts: [number, number][] = [];
    const first = Math.floor((arc.start - high) / FULL_TURN);
    const last = Math.ceil((arc.end - low) / FULL_TURN);

    for (let turn = first; turn <= last; turn++) {
        const from = Math.max(arc.start, low + turn * FULL_TURN);
        const to = Math.min(arc.end, high + turn * FULL_TURN);
        if (to > from) {
            parts.push([from, to]);
        }
    }

    return parts;
}

/** Fills and strokes with the same paint: the half-pixel stroke covers the antialiasing gap between neighbors. */
function fillWithoutSeams(context: CanvasRenderingContext2D, paint: string | CanvasGradient): void {
    context.fillStyle = paint;
    context.fill();
    context.strokeStyle = paint;
    context.lineWidth = 1;
    context.lineJoin = 'round';
    context.stroke();
}

/** Soft shadow under the donut, so it sits on the surface. */
function drawShadow(context: CanvasRenderingContext2D, shape: Shape, depth: number, theme: Theme): void {
    const cy = shape.cy + depth + shape.outerRy * 0.12;
    const rx = shape.outerRx * 1.08;
    const ry = shape.outerRy * 1.08 + 6;

    context.save();
    context.translate(shape.cx, cy);
    context.scale(1, ry / rx);
    // A ring under the outer edge; the floor seen through the hole stays clear.
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, rx);
    gradient.addColorStop(0.55, theme.shadowEnd);
    gradient.addColorStop(0.82, theme.shadow);
    gradient.addColorStop(1, theme.shadowEnd);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, rx, 0, FULL_TURN);
    context.fill();
    context.restore();
}

// ─── Top face ───

function drawTop(context: CanvasRenderingContext2D, shape: Shape, arc: Arc, theme: Theme, hovered: boolean): void {
    const color = arc.slice.color;
    const count = Math.max(40, Math.ceil((Math.abs(arc.end - arc.start) / FULL_TURN) * 180));
    const step = (arc.end - arc.start) / count;

    context.beginPath();
    for (let i = 0; i <= count; i++) {
        const [x, y] = ellipsePoint(shape.cx, shape.cy, shape.outerRx, shape.outerRy, arc.start + step * i);
        if (i === 0) {
            context.moveTo(x, y);
        } else {
            context.lineTo(x, y);
        }
    }
    for (let i = count; i >= 0; i--) {
        const [x, y] = ellipsePoint(shape.cx, shape.cy, shape.innerRx, shape.innerRy, arc.start + step * i);
        context.lineTo(x, y);
    }
    context.closePath();

    // Light from the top-left; the hovered slice is a bit brighter.
    const gradient = context.createLinearGradient(shape.cx - shape.outerRx, shape.cy - shape.outerRy, shape.cx + shape.outerRx, shape.cy + shape.outerRy);
    gradient.addColorStop(0, lighten(color, hovered ? 0.4 : 0.22));
    gradient.addColorStop(0.55, hovered ? lighten(color, 0.14) : color);
    gradient.addColorStop(1, darken(color, 0.9));
    fillWithoutSeams(context, gradient);

    // Thin separator between slices.
    context.strokeStyle = theme.separator;
    context.lineWidth = 1.2;
    context.beginPath();
    for (const angle of [arc.start, arc.end]) {
        const [ox, oy] = ellipsePoint(shape.cx, shape.cy, shape.outerRx, shape.outerRy, angle);
        const [ix, iy] = ellipsePoint(shape.cx, shape.cy, shape.innerRx, shape.innerRy, angle);
        context.moveTo(ix, iy);
        context.lineTo(ox, oy);
    }
    context.stroke();
}

// ─── Leader labels ───

function drawLabels(context: CanvasRenderingContext2D, shape: Shape, arcs: Arc[], theme: Theme): void {
    const fontSize = Math.round(WIDTH * 0.015);
    const labelHeight = fontSize * 1.8;
    const margin = WIDTH * 0.018;
    const elbowDistance = WIDTH * 0.044;

    const labels: Label[] = arcs.map(arc => {
        const angle = middle(arc);
        const elbowX = shape.cx + (shape.outerRx + elbowDistance) * Math.cos(angle);
        const elbowY = shape.cy + (shape.outerRy + elbowDistance) * Math.sin(angle);
        const toRight = Math.cos(angle) >= 0;

        return {
            anchorX: shape.cx + shape.outerRx * Math.cos(angle),
            anchorY: shape.cy + shape.outerRy * Math.sin(angle),
            elbowX,
            elbowY,
            x: toRight ? Math.min(elbowX + WIDTH * 0.028, WIDTH - margin) : Math.max(elbowX - WIDTH * 0.028, margin),
            y: elbowY,
            toRight,
            color: arc.slice.color,
            text: `${arc.slice.label}  ${arc.slice.percentText}`,
        };
    });

    // On each side, push labels down so they don't overlap.
    for (const side of [true, false]) {
        const group = labels.filter(label => label.toRight === side).sort((a, b) => a.y - b.y);
        for (let i = 1; i < group.length; i++) {
            if (group[i].y - group[i - 1].y < labelHeight) {
                group[i].y = group[i - 1].y + labelHeight;
            }
        }
    }

    const lineWidth = Math.max(1, WIDTH / 700);
    const radius = Math.max(4, fontSize * 0.5);

    for (const label of labels) {
        // Leader line
        context.strokeStyle = theme.line;
        context.lineWidth = lineWidth;
        context.setLineDash([]);
        context.beginPath();
        context.moveTo(label.anchorX, label.anchorY);
        context.lineTo(label.elbowX, label.elbowY);
        context.lineTo(label.toRight ? label.x - fontSize * 0.5 : label.x + fontSize * 0.5, label.y);
        context.stroke();

        // Dot on the slice edge
        context.fillStyle = label.color;
        context.beginPath();
        context.arc(label.anchorX, label.anchorY, Math.max(2.5, WIDTH * 0.0044), 0, FULL_TURN);
        context.fill();

        // Pill with the text
        context.font = `500 ${fontSize}px ${FONT_FAMILY}`;
        context.textBaseline = 'middle';
        context.textAlign = label.toRight ? 'left' : 'right';

        const pillWidth = context.measureText(label.text).width + fontSize * 1.3;
        const pillX = label.toRight ? label.x - fontSize * 0.65 : label.x - pillWidth + fontSize * 0.65;

        context.beginPath();
        context.roundRect(pillX, label.y - labelHeight / 2, pillWidth, labelHeight, radius);
        context.fillStyle = theme.pillBackground;
        context.fill();
        context.strokeStyle = theme.pillBorder;
        context.lineWidth = Math.max(0.5, lineWidth * 0.7);
        context.stroke();

        context.fillStyle = theme.text;
        context.fillText(label.text, label.x, label.y);
    }
}

// ─── Hit testing ───

/** Index of the slice under the point, or -1. Only the top face counts. */
function hitTest(arcs: Arc[], shape: Shape, x: number, y: number): number {
    const dx = x - shape.cx;
    const dy = y - shape.cy;
    const outer = Math.hypot(dx / shape.outerRx, dy / shape.outerRy);
    const inner = Math.hypot(dx / shape.innerRx, dy / shape.innerRy);
    if (outer > 1.08 || inner < 0.88) {
        return -1;
    }

    const angle = normalize(Math.atan2(dy / shape.outerRy, dx / shape.outerRx));

    return arcs.findIndex(arc => {
        // A single slice covers the whole turn.
        if (arc.end - arc.start >= FULL_TURN - 1e-9) {
            return true;
        }

        const start = normalize(arc.start);
        const end = normalize(arc.end);
        return start <= end ? angle >= start && angle <= end : angle >= start || angle <= end;
    });
}

function normalize(angle: number): number {
    const rest = angle % FULL_TURN;
    return rest < 0 ? rest + FULL_TURN : rest;
}

// ─── Colors ───

function readTheme(element: Element): Theme {
    const style = getComputedStyle(element);
    const token = (name: string): string => style.getPropertyValue(name).trim();
    const text = token('--text');

    return {
        background: token('--surface'),
        text,
        line: withAlpha(text, 0.35),
        pillBackground: withAlpha(token('--bg'), 0.88),
        pillBorder: token('--border'),
        rim: withAlpha(text, 0.08),
        separator: withAlpha(token('--surface'), 0.55),
        shadow: withAlpha(darken(token('--bg'), 0.3), 0.32),
        shadowEnd: withAlpha(darken(token('--bg'), 0.3), 0),
    };
}

/** Channels of a "#rrggbb", "#rgb" or "rgb(r, g, b)" color. */
function toRgb(color: string): [number, number, number] {
    const rgb = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgb) {
        return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    }

    let value = color.trim().replace('#', '');
    if (value.length === 3) {
        value = value.split('').map(c => c + c).join('');
    }

    return [
        parseInt(value.substring(0, 2), 16),
        parseInt(value.substring(2, 4), 16),
        parseInt(value.substring(4, 6), 16),
    ];
}

function darken(hex: string, factor: number): string {
    const [r, g, b] = toRgb(hex);
    return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

function lighten(hex: string, factor: number): string {
    const [r, g, b] = toRgb(hex);
    const mix = (c: number): number => Math.min(255, Math.round(c + (255 - c) * factor));
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function withAlpha(color: string, alpha: number): string {
    const [r, g, b] = toRgb(color);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
