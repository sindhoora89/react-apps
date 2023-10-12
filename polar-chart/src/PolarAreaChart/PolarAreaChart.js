// TODO: Some of these values are pixel values, and will need to be adjusted for 4k.
// These include, but may not be limited to:
// AreaRadiusBuffer
// StraightDownLabelPadding
// setLineDash([8, 3]);
// const textPadding = 6;
// x: cx + Math.cos(angle) * (radius + 20),
// y: cy - Math.sin(angle) * (radius + 20),
import EventBus from './EventBus';

const Tau = Math.PI * 2;
const StartAngle = Tau / 4;
const StraightDownAngle = (3 * Math.PI) / 2;
const SpikeLength = 40;


const ChartRadiusPercentOfSize = 0.72;
const AreaRadiusBuffer = 30;
const StraightDownLabelPadding = 30;

const rgba = (r, g, b, a) => {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const splitAngle = (a1, a2) => {
    if (a1 < a2) {
        return (a2 - a1) / 2 + a1;
    } else {
        return splitAngle(a2, a1 + Tau);
    }
};

const calculateArea = (cx, cy, angle1, angle2, radius) => {
    const p1 = { x: cx, y: cy };

    const p2 = {
        x: cx + Math.cos(angle1) * radius,
        y: cy - Math.sin(angle1) * radius,
    };

    const p3 = {
        x: cx + Math.cos(angle2) * radius,
        y: cy - Math.sin(angle2) * radius,
    };

    const [a, b, c] = [
        Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2)),
        Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)),
        // The order here is important. This last line is always the base.
        Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2)),
    ];

    // Heron's formula: https://youtu.be/9FYa8rxdy9s
    const S = (a + b + c) / 2; // semiperimeter
    const area = Math.sqrt(S * (S - a) * (S - b) * (S - c));
    const base = c;
    const height = (2 * area) / base;

    return { p1, p2, p3, a, b, c, area, base, height };
};

export const PolarAreaChartEvents = {
    ItemIndexSelect: 'itemIndexSelect',
};

class PolarAreaChart extends EventBus {
    constructor(canvas, items) {
        super();

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setItems(items);

        this.canvas.addEventListener('click', (event) => {
            const x = event.clientX - this.canvas.getBoundingClientRect().left;
            const y = event.clientY - this.canvas.getBoundingClientRect().top;
            const clickedAreaIndex = this.getActiveItemIndex(x, y);

            if (clickedAreaIndex !== -1) {
                this.emit(PolarAreaChartEvents.ItemIndexSelect, clickedAreaIndex);
            }
        });
    }

    getClickedAreaIndex = (x, y) => {
        const maxValue = Math.max(...this.itemValues);
        const maxRadius = this.chartRadius - AreaRadiusBuffer;

        for (let i = 0; i < this.itemValues.length; i++) {
            const value = this.itemValues[i];
            const percentOfMaxValue = value / maxValue;
            const spoke = this.calculateSpoke(this.width / 2, this.height / 2, i);
            const nextSpoke = this.calculateSpoke(this.width / 2, this.height / 2, (i + 1) % this.itemValues.length);
            const radius = percentOfMaxValue * maxRadius;
            const { p1, p2, p3 } = calculateArea(this.width / 2, this.height / 2, spoke.angle, nextSpoke.angle, radius);

            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.lineTo(p3.x, p3.y);
            this.ctx.lineTo(p1.x, p1.y);
            const point = this.ctx.isPointInPath(x, y);
            this.ctx.closePath();

            if (point) {
                return i;
            }
        }

        return -1;
    };

    destroy = () => {
        // TODO: Remove event listeners.
    };

    resize = (width, height) => {
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.canvasSizeMin = Math.min(this.width, this.height);
        this.chartRadius = Math.round((this.canvasSizeMin * ChartRadiusPercentOfSize) / 2);
        this.gridLineCount = Math.floor((this.chartRadius * 2) / 100);

        this.draw();
    };

    setHighlightedIndex = (highlightedIndex) => {
        this.highlightedIndex = highlightedIndex;
        this.draw();
    };

    setItems = (items) => {
        this.items = items;
        this.itemCount = this.items.length;
        this.itemValues = this.items.map((item) => item.value);
    };

    draw = () => {
        this.ctx.clearRect(0, 0, this.width, this.height);

        const cx = this.width / 2;
        const tempCy = this.height / 2;
        const shiftY = this.calculateYShift(cx, tempCy);
        const cy = this.height / 2 + shiftY;

        this.drawGridLines(cx, cy);
        this.drawAreas(cx, cy);
        this.drawOuterGradient(cx, cy)
        this.drawSpokes(cx, cy);
        this.drawLabels(cx, cy);
    };

    drawOuterGradient = (cx, cy) => {
        if (!Number.isInteger(this.highlightedIndex)) {
            return
        }

        const index = this.highlightedIndex;
        const spoke = this.calculateSpoke(cx, cy, index, this.chartRadius);
        const nextSpoke = this.calculateSpoke(cx, cy, (index + 1) % this.itemValues.length, this.chartRadius);
        const outerSpoke = this.calculateSpoke(cx, cy, index, this.chartRadius + SpikeLength);
        const outerNextSpoke = this.calculateSpoke(cx, cy, (index + 1) % this.itemValues.length, this.chartRadius + SpikeLength);

        let middle = {
            inner: {
                x: (spoke.x + nextSpoke.x) / 2,
                y: (spoke.y + nextSpoke.y) / 2
            },
            outer: {
                x: (outerSpoke.x + outerNextSpoke.x) / 2,
                y: (outerSpoke.y + outerNextSpoke.y) / 2
            }
        }
        
        const lgArea = this.ctx.createLinearGradient(middle.inner.x, middle.inner.y,middle.outer.x,middle.outer.y);
        lgArea.addColorStop(0, 'rgba(118, 219, 255, .4)');
        lgArea.addColorStop(.9, 'rgba(118, 219, 255, 0)');

        const lgLine1 = this.ctx.createLinearGradient(spoke.x, spoke.y,outerSpoke.x,outerSpoke.y);
        lgLine1.addColorStop(0, 'rgba(118, 219, 255, 1)');
        lgLine1.addColorStop(1, 'rgba(118, 219, 255, 0.1)');

        const lgLine2 = this.ctx.createLinearGradient(nextSpoke.x, nextSpoke.y,outerNextSpoke.x,outerNextSpoke.y);
        lgLine2.addColorStop(0, 'rgba(118, 219, 255, 1)');
        lgLine2.addColorStop(1, 'rgba(118, 219, 255, 0.1)');

        this.ctx.lineWidth = 5

        this.ctx.strokeStyle = lgLine1;
        this.ctx.beginPath()
        this.ctx.moveTo(spoke.x,spoke.y)
        this.ctx.lineTo(outerSpoke.x,outerSpoke.y);
        this.ctx.stroke()

        this.ctx.strokeStyle = lgLine2;
        this.ctx.beginPath()
        this.ctx.moveTo(nextSpoke.x,nextSpoke.y)
        this.ctx.lineTo(outerNextSpoke.x,outerNextSpoke.y);
        this.ctx.stroke()

        this.ctx.fillStyle = lgArea;
        this.ctx.beginPath()
        this.ctx.moveTo(spoke.x, spoke.y)
        this.ctx.lineTo(nextSpoke.x, nextSpoke.y)
        this.ctx.lineTo(outerNextSpoke.x, outerNextSpoke.y)
        this.ctx.lineTo(outerSpoke.x, outerSpoke.y)
        this.ctx.lineTo(spoke.x, spoke.y)
        this.ctx.closePath()
        this.ctx.fill();
    }

    drawSpokes = (cx, cy) => {
        this.ctx.strokeStyle = '#76DBFF';
        this.forEachSpoke(cx, cy, (angle, i, x, y) => {
            this.ctx.lineWidth = this.highlightedIndex === i || this.highlightedIndex + 1 === i ? 5 : 2;
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        });
    };

    getActiveItemIndex = (x, y) => {
        for (let i = 0; i < this.itemValues.length; i++) {
            const spoke = this.calculateSpoke(this.width / 2, this.height / 2, i);
            const nextSpoke = this.calculateSpoke(this.width / 2, this.height / 2, (i + 1) % this.itemValues.length);
            const { p1, p2, p3 } = calculateArea(this.width / 2, this.height / 2, spoke.angle, nextSpoke.angle, this.chartRadius);

            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.lineTo(p3.x, p3.y);
            this.ctx.lineTo(p1.x, p1.y);
            const point = this.ctx.isPointInPath(x, y);
            this.ctx.closePath();

            if (point) {
                return i;
            }
        }

        return -1;
    };

    drawGridLines = (cx, cy) => {
        this.ctx.lineWidth = 1;

        const radiusPer = this.chartRadius / this.gridLineCount;

        for (let i = 0; i < this.gridLineCount; i++) {
            const radius = radiusPer * (i + 1);
            const isLastLine = i === this.gridLineCount - 1;
            const alpha = isLastLine ? 1 : 0.7;
            let lastX;
            let lastY;

            this.ctx.strokeStyle = rgba(118, 219, 255, alpha);
            this.ctx.beginPath();

            if (isLastLine) {
                this.ctx.setLineDash([]);
            } else {
                this.ctx.setLineDash([8, 3]);
            }

            this.forEachSpoke(cx, cy, (angle) => {
                const x = cx + Math.cos(angle) * radius;
                const y = cy - Math.sin(angle) * radius;
                this.ctx.moveTo(x, y);

                if (lastX !== undefined && lastY !== undefined) {
                    this.ctx.lineTo(lastX, lastY);
                }

                lastX = x;
                lastY = y;
            });

            const { x: startX, y: startY } = this.calculateSpoke(cx, cy, 0, radius);
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(lastX, lastY);
            this.ctx.stroke();
        }
    };

    drawAreas = (cx, cy) => {
        const maxValue = Math.max(...this.itemValues);
        const maxRadius = this.chartRadius - AreaRadiusBuffer;
        let isMouseOverArea = false;

        for (let i = 0; i < this.itemValues.length; i++) {
            const value = this.itemValues[i];
            const percentOfMaxValue = value / maxValue;
            const spoke = this.calculateSpoke(cx, cy, i);
            const nextSpoke = this.calculateSpoke(cx, cy, (i + 1) % this.itemValues.length);
            const radius = percentOfMaxValue * maxRadius;
            const { p1, p2, p3 } = calculateArea(cx, cy, spoke.angle, nextSpoke.angle, radius);

            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.lineTo(p3.x, p3.y);
            this.ctx.lineTo(p1.x, p1.y);

            // const mouseInPath = this.ctx.isPointInPath(mouseX, mouseY);
            const mouseInPath = false;
            isMouseOverArea = isMouseOverArea || mouseInPath;

            // Beware of this voodoo.
            const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, this.chartRadius);
            g.addColorStop(0, 'rgba(118, 219, 255, 0.4)');
            g.addColorStop(0.5417, 'rgba(118, 219, 255, 0.64)');
            g.addColorStop(0.7344, 'rgba(118, 219, 255, 0.9)');
            g.addColorStop(1, 'rgba(118, 219, 255, 1)');
            this.ctx.fillStyle = g;
            this.ctx.fill();

            this.ctx.strokeStyle = rgba(118, 219, 255, 1);
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(p2.x, p2.y);
            this.ctx.lineTo(p3.x, p3.y);
            this.ctx.stroke();
        }

        this.canvas.style.cursor = isMouseOverArea ? 'pointer' : 'default';
    };

    drawLabels = (cx, cy) => {
        const textPadding = 6;

        this.ctx.font = '1.8rem Hitmarker Normal Regular';

        for (let i = 0; i < this.itemCount; i++) {
            const { label, value } = this.items[i];
            const spoke = this.calculateSpoke(cx, cy, i);
            const nextSpoke = this.calculateSpoke(cx, cy, (i + 1) % this.itemCount);
            const angle = splitAngle(spoke.angle, nextSpoke.angle);
            const { height } = calculateArea(cx, cy, spoke.angle, nextSpoke.angle, this.chartRadius);
            const radius = height + 1;
            const isStraightDown = Math.abs(StraightDownAngle - angle) < 0.001;

            const p1 = {
                x: cx + Math.cos(angle) * radius,
                y: cy - Math.sin(angle) * radius,
            };

            const p2 = {
                x: cx + Math.cos(angle) * (radius + 20),
                y: cy - Math.sin(angle) * (radius + 20) + (isStraightDown ? StraightDownLabelPadding : 0),
            };

            const pointRight = 1;
            const sign = isStraightDown ? pointRight : Math.sign(p2.x - cx) || pointRight;

            const p3 = {
                x: cx + sign * (this.width / 2),
                y: p2.y,
            };

            this.ctx.textAlign = sign < 0 ? 'start' : 'end';

            // Draw the lines.
            this.ctx.strokeStyle = this.highlightedIndex === i ? rgba(118, 219, 255, 1) : rgba(255, 255, 255, 0.6);
            this.ctx.lineWidth = this.highlightedIndex === i ? 4 : 1;
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.lineTo(p3.x, p3.y);
            this.ctx.stroke();

            // Draw the label.
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillStyle = this.highlightedIndex === i ? rgba(118, 219, 255, 1) : rgba(163, 163, 163, 0.8);
            this.ctx.fillText(label.toUpperCase(), p3.x, p3.y - textPadding);

            // Draw the value.
            this.ctx.textBaseline = 'top';
            this.ctx.fillStyle = this.highlightedIndex === i ? rgba(118, 219, 255, 1) : rgba(231, 231, 231, 0.8);
            this.ctx.fillText(value?.toString(), p3.x, p3.y + textPadding);
        }
    };

    calculateYShift = (cx, cy) => {
        const ys = this.mapSpokes(cx, cy, (angle, i, x, y) => y);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const diffMin = cy - minY;
        const diffMax = maxY - cy;
        return (diffMin - diffMax) / 2;
    };

    calculateSpoke = (cx, cy, i, radius) => {
        const sectionSize = Tau / this.itemCount;
        const angle = sectionSize * i + StartAngle;
        const x = cx + Math.cos(angle) * radius;
        const y = cy - Math.sin(angle) * radius;
        return { angle, x, y };
    };

    forEachSpoke = (cx, cy, fn) => {
        for (let i = 0; i <= this.itemCount; i++) {
            const { angle, x, y } = this.calculateSpoke(cx, cy, i, this.chartRadius);
            fn(angle, i, x, y, cx, cy);
        }
    };

    mapSpokes = (cx, cy, fn) => {
        const result = [];

        this.forEachSpoke(cx, cy, (...args) => {
            result.push(fn(...args));
        });

        return result;
    };
}

export default PolarAreaChart;
