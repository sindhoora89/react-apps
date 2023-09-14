import { useEffect, useState } from 'react';

// TODO: This is generic enough to move into the @telescope/engine paackage.
const useElementSize = (elementRef, defaultWidth = 0, defaultHeight = 0) => {
    const [width, setWidth] = useState(defaultWidth);
    const [height, setHeight] = useState(defaultHeight);

    useEffect(() => {
        if (!elementRef.current) {
            return;
        }

        const onContainerResize = () => {
            const rect = elementRef.current.getBoundingClientRect();
            setWidth(rect.width);
            setHeight(rect.height);
        };

        const observer = new ResizeObserver(onContainerResize);
        observer.observe(elementRef.current);

        return () => observer.disconnect();
    });

    return [width, height];
};

export default useElementSize;
