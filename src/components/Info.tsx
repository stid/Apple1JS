const StartInstructions = () => (
    <section className="bg-surface-primary rounded-lg p-md border border-border-primary mb-sm">
        <h3 className="text-sm font-medium text-text-accent mb-sm flex items-center">
            <span className="mr-2">🚀</span>
            FIRST START / RESET
        </h3>
        <p className="text-text-primary text-sm">
            Press <span className="font-mono bg-black/40 px-sm py-1 rounded text-data-value border border-border-subtle">TAB</span>
        </p>
    </section>
);

const TestProgram = () => (
    <section className="bg-surface-primary rounded-lg p-md border border-border-primary mb-sm">
        <h3 className="text-sm font-medium text-text-accent mb-sm flex items-center">
            <span className="mr-2">🧪</span>
            TEST PROGRAM
        </h3>
        <pre className="bg-black/40 text-data-value rounded p-sm text-xs font-mono leading-relaxed whitespace-pre border border-border-subtle">{`0:A9 0 AA 20 EF FF E8 8A 4C 2 0
0
R`}</pre>
    </section>
);

const BasicProgram = () => (
    <section className="bg-surface-primary rounded-lg p-md border border-border-primary mb-sm">
        <h3 className="text-sm font-medium text-text-accent mb-sm flex items-center">
            <span className="mr-2">💻</span>
            BASIC
        </h3>
        <pre className="bg-black/40 text-data-value rounded p-sm text-xs font-mono leading-relaxed whitespace-pre border border-border-subtle">{`E000R
10 PRINT "HELLO WORLD!"
20 GOTO 10
RUN`}</pre>
    </section>
);

const AnniversaryInfo = () => (
    <section className="bg-surface-primary rounded-lg p-md border border-border-primary mb-sm">
        <h3 className="text-sm font-medium text-text-accent mb-sm flex items-center">
            <span className="mr-2">🎉</span>
            APPLE 30th ANNIVERSARY
        </h3>
        <pre className="bg-black/40 text-data-value rounded p-sm text-xs font-mono inline-block whitespace-pre border border-border-subtle">{`280R`}</pre>
    </section>
);


const MemoryAddresses = () => (
    <section className="bg-surface-primary rounded-lg p-md border border-border-primary mb-sm">
        <h3 className="text-sm font-medium text-text-accent mb-sm flex items-center">
            <span className="mr-2">🔍</span>
            LIST MEMORY ADDRESS
        </h3>
        <pre className="bg-black/40 text-data-address rounded p-sm text-xs font-mono inline-block whitespace-pre border border-border-subtle">{`0.FF`}</pre>
    </section>
);

const ManualLink = () => (
    <section className="bg-surface-primary rounded-lg p-md border border-border-primary mb-sm">
        <h3 className="text-sm font-medium text-text-accent mb-sm flex items-center">
            <span className="mr-2">📖</span>
            APPLE-1 OPERATION MANUAL
        </h3>
        <a
            href="http://apple1.chez.com/Apple1project/Docs/pdf/AppleI_Manual.pdf"
            className="text-data-address underline hover:text-text-accent break-all text-sm transition-colors"
            target="_blank"
            rel="noopener noreferrer"
        >
            http://apple1.chez.com/Apple1project/Docs/pdf/AppleI_Manual.pdf
        </a>
    </section>
);

const GitHubLink = () => (
    <section className="bg-surface-primary rounded-lg p-md border border-border-primary mb-sm">
        <h3 className="text-sm font-medium text-text-accent mb-sm flex items-center">
            <span className="mr-2">🔗</span>
            GITHUB
        </h3>
        <a
            href="https://github.com/stid/Apple1JS"
            className="text-data-address underline hover:text-text-accent break-all text-sm transition-colors"
            target="_blank"
            rel="noopener noreferrer"
        >
            https://github.com/stid/Apple1JS
        </a>
    </section>
);

const Info = () => (
    <aside className="w-full ml-auto mr-0 flex flex-col space-y-md overflow-auto">
        <StartInstructions />
        <TestProgram />
        <BasicProgram />
        <AnniversaryInfo />
        <MemoryAddresses />
        <ManualLink />
        <GitHubLink />
    </aside>
);

export default Info;
