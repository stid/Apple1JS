const StartInstructions = () => (
    <section className="mb-6">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">FIRST START / RESET</h3>
        <p className="text-slate-200">Press <span className="font-mono bg-slate-800 px-1 rounded">TAB</span></p>
    </section>
);

const TestProgram = () => (
    <section className="mb-6">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">TEST PROGRAM</h3>
        <pre className="bg-slate-900 text-green-200 rounded p-2 text-xs font-mono leading-relaxed whitespace-pre-wrap">
            0:A9 0 AA 20 EF FF E8 8A 4C 2 0
            0
            R
        </pre>
    </section>
);

const BasicProgram = () => (
    <section className="mb-6">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">BASIC</h3>
        <pre className="bg-slate-900 text-green-200 rounded p-2 text-xs font-mono leading-relaxed whitespace-pre-wrap">
            E000R
            10 PRINT &quot;HELLO WORLD!&quot;
            20 GOTO 10
            RUN
        </pre>
    </section>
);

const AnniversaryInfo = () => (
    <section className="mb-6">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">APPLE 30th ANNIVERSARY</h3>
        <pre className="bg-slate-900 text-green-200 rounded p-2 text-xs font-mono inline-block">280R</pre>
    </section>
);

const MemoryAddresses = () => (
    <section className="mb-6">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">LIST MEMORY ADDRESS</h3>
        <pre className="bg-slate-900 text-green-200 rounded p-2 text-xs font-mono inline-block">0.FF</pre>
    </section>
);

const ManualLink = () => (
    <section className="mb-6">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">APPLE-1 OPERATION MANUAL</h3>
        <a
            href="http://apple1.chez.com/Apple1project/Docs/pdf/AppleI_Manual.pdf"
            className="text-green-400 underline hover:text-green-300 break-all"
            target="_blank" rel="noopener noreferrer"
        >
            http://apple1.chez.com/Apple1project/Docs/pdf/AppleI_Manual.pdf
        </a>
    </section>
);

const GitHubLink = () => (
    <section className="mb-6">
        <h3 className="text-green-300 font-bold text-sm tracking-wider uppercase mb-1">GITHUB</h3>
        <a
            href="https://github.com/stid/Apple1JS"
            className="text-green-400 underline hover:text-green-300 break-all"
            target="_blank" rel="noopener noreferrer"
        >
            https://github.com/stid/Apple1JS
        </a>
    </section>
);

const Info = () => (
    <aside className="bg-black/80 rounded-lg p-6 max-w-md ml-auto mr-0 text-slate-100 shadow-lg border border-slate-800">
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
