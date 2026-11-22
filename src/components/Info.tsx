import type { ReactNode } from 'react';

type SectionProps = {
    /** Mono eyebrow, read like a code comment. */
    eyebrow: string;
    title: string;
    children: ReactNode;
};

const Section = ({ eyebrow, title, children }: SectionProps) => (
    <section className="card flex flex-col gap-sm">
        <div className="flex flex-col gap-xxs">
            <span className="eyebrow">{`// ${eyebrow}`}</span>
            <h3 className="card-title">{title}</h3>
        </div>
        {children}
    </section>
);

// Text typed at the Apple 1 keyboard, exactly as entered.
const Listing = ({ children }: { children: string }) => (
    <pre className="well text-data-value p-sm text-sm leading-relaxed whitespace-pre overflow-x-auto">{children}</pre>
);

const ExternalLink = ({ href }: { href: string }) => (
    <a href={href} className="font-mono text-sm break-all" target="_blank" rel="noopener noreferrer">
        {href}
    </a>
);

const Info = () => (
    <aside className="w-full grid grid-cols-1 xl:grid-cols-2 gap-md content-start overflow-auto">
        <Section eyebrow="start" title="First start / reset">
            <p className="text-text-secondary">
                Press <kbd className="well text-text-primary text-xs px-sm py-xxs">TAB</kbd> to reset the machine and
                get the <span className="font-mono text-data-value">\</span> prompt.
            </p>
        </Section>

        <Section eyebrow="wozmon" title="Test program">
            <Listing>{`0:A9 0 AA 20 EF FF E8 8A 4C 2 0
0
R`}</Listing>
        </Section>

        <Section eyebrow="basic" title="BASIC">
            <Listing>{`E000R
10 PRINT "HELLO WORLD!"
20 GOTO 10
RUN`}</Listing>
        </Section>

        <Section eyebrow="demo" title="Apple 30th anniversary">
            <Listing>{`280R`}</Listing>
        </Section>

        <Section eyebrow="wozmon" title="List memory address">
            <Listing>{`0.FF`}</Listing>
        </Section>

        <Section eyebrow="docs" title="Apple-1 operation manual">
            <ExternalLink href="https://archive.org/details/Apple-1_Operation_Manual_1976_Apple_a" />
        </Section>

        <Section eyebrow="source" title="GitHub">
            <ExternalLink href="https://github.com/stid/Apple1JS" />
        </Section>
    </aside>
);

export default Info;
