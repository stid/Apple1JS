import { useEffect, useState } from 'react';

const TimerComp = (): JSX.Element => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => {
            setVisible(!visible);
        }, 1000);

        return () => {
            clearTimeout(t);
        };
    }, [visible]);

    return (
        <div
            style={{
                display: `${visible ? 'block' : 'none'}`,
            }}
        >
            ABC
        </div>
    );
};

TimerComp.displayName = 'TimerComp';

export default TimerComp;
