import React, { useRef } from 'react';
import styled from 'styled-components';
import usePolarAreaChart from './usePolarAreaChart';

const Container = styled.div`
    width: 100%;
    height: 100%;
`;

const PolarAreaChart = ({ items, selectedIndex, onSelectIndex }) => {
    const containerRef = useRef();
    const canvasRef = useRef();

    usePolarAreaChart(containerRef, canvasRef, items, selectedIndex, onSelectIndex);

    return (
        <Container ref={containerRef}>
            <canvas ref={canvasRef} />
        </Container>
    );
};

export default PolarAreaChart;
