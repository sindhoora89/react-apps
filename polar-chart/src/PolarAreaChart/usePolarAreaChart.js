import { useEffect, useRef } from 'react';
import PolarAreaChart, { PolarAreaChartEvents } from './PolarAreaChart';

const usePolarAreaChart = (containerRef, canvasRef, items, selectedIndex, onSelectIndex) => {
    // Commenting out as ResizeObserver doesn't work in Telescope
    // const [width, height] = useElementSize(containerRef);

    const width =  1000;
    const height =  800;
    const chartRef = useRef();

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.setHighlightedIndex(selectedIndex);
        }
    }, [selectedIndex, chartRef]);

    // This initializes the class that controls and renders the chart.
    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }

        const chart = new PolarAreaChart(canvasRef.current, items);
        chartRef.current = chart;

        if (width !== 0 && height !== 0) {
            chart.resize(width, height);
            chart.setHighlightedIndex(selectedIndex);
        }

        chart.on(PolarAreaChartEvents.ItemIndexSelect, onSelectIndex);

        return () => {
            chart.off(PolarAreaChartEvents.ItemIndexSelect, onSelectIndex);
            chart.destroy();
        };
    }, [canvasRef]);

    // This resizes the chart when the parent container changes size.
    // This shouldn't need to be throttled because the parent container shouldn't
    // be changing size, if ever. However there should always be at least one call
    // here as the parent calculates the container size.
    useEffect(() => {
        if (!chartRef.current || width === 0 || height === 0) {
            return;
        }

        const chart = chartRef.current;
        chart.resize(width, height);
    }, [chartRef, width, height]);
};

export default usePolarAreaChart;
