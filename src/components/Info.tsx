import { styled } from '@stitches/react';

const InfoContainer = styled('div', {
    h3: {
        margin: '20px 0 0 0',
    },

    p: {
        marginTop: '4px',
        color: ' #607d8b',
    },

    'a:link': {
        color: 'green',
    },

    'a:visited': {
        color: 'green',
    },

    'a:hover': {
        color: '#a5ff90',
    },

    'a:active': {
        color: 'blue',
    },
});

const Info = (): JSX.Element => (
    <InfoContainer>
        <h3>FIRST START / RESET</h3>
        <p>Press TAB</p>

        <h3>TEST PROGRAM</h3>
        <p>
            0:A9 0 AA 20 EF FF E8 8A 4C 2 0<br />
            0<br />R
        </p>
        <h3>BASIC</h3>
        <p>
            E000R
            <br />
            10 PRINT &quot;HELLO WORLD!&quot;
            <br />
            20 GOTO 10
            <br />
            RUN
        </p>
        <h3>APPLE 30th ANNIVERSARY</h3>
        <p>280R</p>
        <h3>LIST MEMORY ADDRESS</h3>
        <p>0.FF</p>
        <h3>APPLE-1 OPERATION MANUAL</h3>
        <p>
            <a href={'http://apple1.chez.com/Apple1project/Docs/pdf/AppleI_Manual.pdf'}>
                http://apple1.chez.com/Apple1project/Docs/pdf/AppleI_Manual.pdf
            </a>
        </p>
        <h3>GITHUB</h3>
        <p>
            <a href={'https://github.com/stid/Apple1JS'}>https://github.com/stid/Apple1JS</a>
        </p>
    </InfoContainer>
);

export default Info;
