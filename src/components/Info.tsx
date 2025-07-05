const StartInstructions = () => (
    <section className="mb-3">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">FIRST START / RESET</h3>
        <p className="text-slate-200">
            Press <span className="font-mono bg-slate-800 px-1 rounded">TAB</span>
        </p>
    </section>
);

const TestProgram = () => (
    <section className="mb-3">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">TEST PROGRAM</h3>
        <pre className="bg-slate-900 text-green-200 rounded p-2 text-xs font-mono leading-relaxed whitespace-pre">{`0:A9 0 AA 20 EF FF E8 8A 4C 2 0
0
R`}</pre>
    </section>
);

const BasicProgram = () => (
    <section className="mb-3">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">BASIC</h3>
        <pre className="bg-slate-900 text-green-200 rounded p-2 text-xs font-mono leading-relaxed whitespace-pre">{`E000R
10 PRINT "HELLO WORLD!"
20 GOTO 10
RUN`}</pre>
    </section>
);

const AnniversaryInfo = () => (
    <section className="mb-3">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">APPLE 30th ANNIVERSARY</h3>
        <pre className="bg-slate-900 text-green-200 rounded p-2 text-xs font-mono inline-block whitespace-pre">{`280R`}</pre>
    </section>
);

const RomTestProgram = () => (
    <section className="mb-3">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">
            ROM WRITE TEST (Triggers UI Logging)
        </h3>
        <pre className="bg-slate-900 text-green-200 rounded p-2 text-xs font-mono leading-relaxed whitespace-pre">{`0:A9 AA 8D 0 FF A9 BB 8D 1 FF A9 CC 8D 2 FF 4C 0 0
0
R`}</pre>
        <p className="text-xs text-slate-400 mt-1">Attempts to write to ROM addresses - watch Status Panel above!</p>
    </section>
);

const MemoryAddresses = () => (
    <section className="mb-3">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">LIST MEMORY ADDRESS</h3>
        <pre className="bg-slate-900 text-green-200 rounded p-2 text-xs font-mono inline-block whitespace-pre">{`0.FF`}</pre>
    </section>
);

const ManualLink = () => (
    <section className="mb-3">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">APPLE-1 OPERATION MANUAL</h3>
        <a
            href="http://apple1.chez.com/Apple1project/Docs/pdf/AppleI_Manual.pdf"
            className="text-green-400 underline hover:text-green-300 break-all"
            target="_blank"
            rel="noopener noreferrer"
        >
            http://apple1.chez.com/Apple1project/Docs/pdf/AppleI_Manual.pdf
        </a>
    </section>
);

const GitHubLink = () => (
    <section className="mb-3">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">GITHUB</h3>
        <a
            href="https://github.com/stid/Apple1JS"
            className="text-green-400 underline hover:text-green-300 break-all"
            target="_blank"
            rel="noopener noreferrer"
        >
            https://github.com/stid/Apple1JS
        </a>
    </section>
);

const Info = () => (
    <aside className="bg-black/80 rounded-xl px-2 py-2 md:px-3 md:py-3 w-full ml-auto mr-0 text-slate-100 shadow-lg border border-slate-800 flex flex-col gap-0.5">
        <StartInstructions />
        <TestProgram />
        <BasicProgram />
        <AnniversaryInfo />
        <RomTestProgram />
        <MemoryAddresses />
        <ManualLink />
        <GitHubLink />
    </aside>
);

export default Info;
