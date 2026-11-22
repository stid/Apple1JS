import React, { useEffect, useMemo, useState } from 'react';
import { RegisterRow } from './RegisterRow';
import { useWorkerData } from '../contexts/WorkerDataContext';
import type { WorkerManager } from '../services/WorkerManager';
import type { InspectableData } from '../core/types/components';
import {
    BOARD_PARTS,
    BOARD_REGIONS,
    BOARD_SIZE,
    BOARD_TRACES,
    BUS_LABELS,
    describeNode,
    findNode,
    type BoardPart,
    type BoardTrace,
} from './board/boardModel';
import {
    computeBoardActivity,
    isPartActive,
    isTraceActive,
    rateLabel,
    readActivitySample,
} from './board/boardActivity';
import type { BoardActivitySample } from '../apple1/types/worker-messages';

interface BoardViewProps {
    /** Structure of the running machine, as returned by the worker. */
    root: InspectableData;
    workerManager: WorkerManager;
}

const DEFAULT_PART_ID = 'cpu';
const LINE_HEIGHT = 16;

// Static literal class names so Tailwind's content scanner keeps them.
const typeColorClass: Record<string, string> = {
    RAM: 'text-component-ram',
    ROM: 'text-component-rom',
    Bus: 'text-component-bus',
    CPU: 'text-component-cpu',
    CPU6502: 'text-component-cpu',
    PIA6820: 'text-component-pia',
    IoComponent: 'text-component-io',
    Clock: 'text-component-clock',
};

const traceClass: Record<BoardTrace['bus'], string> = {
    address: 'stroke-data-address',
    data: 'stroke-data-value',
    control: 'stroke-surface-quaternary',
};

const busLabelClass = {
    address: 'fill-data-address',
    data: 'fill-data-value',
} as const;

/** The lines of text inside a part, vertically centred as a block. */
const PartText: React.FC<{ part: BoardPart; dim?: boolean; rate?: string | undefined }> = ({ part, dim = false, rate }) => {
    const lines = [
        { text: part.label, className: dim ? 'fill-text-tertiary' : 'fill-text-primary font-semibold text-xs' },
        { text: part.detail, className: dim ? 'fill-text-tertiary' : 'fill-text-secondary' },
        { text: part.address, className: 'fill-data-address' },
        { text: rate, className: 'fill-text-secondary' },
    ].filter((line): line is { text: string; className: string } => line.text !== undefined);
    const centerX = part.x + part.w / 2;
    const firstBaseline = part.y + part.h / 2 - ((lines.length - 1) * LINE_HEIGHT) / 2 + 4;

    return (
        <>
            {lines.map((line, index) => (
                <text
                    key={index}
                    x={centerX}
                    y={firstBaseline + index * LINE_HEIGHT}
                    textAnchor="middle"
                    className={`font-mono text-2xs select-none ${line.className}`}
                >
                    {line.text}
                </text>
            ))}
        </>
    );
};

interface PartProps {
    part: BoardPart;
    selected: boolean;
    /** Accessed during the last sample interval. */
    active: boolean;
    /** Read/write rate line, for parts on the address bus. */
    rate?: string | undefined;
    onSelect: (part: BoardPart) => void;
}

const InteractivePart: React.FC<PartProps> = ({ part, selected, active, rate, onSelect }) => {
    const pinY = [part.y + 1.5, part.y + part.h - 1.5];
    return (
        <g
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={part.label}
            data-active={active}
            className="group cursor-pointer focus:outline-hidden"
            onClick={() => onSelect(part)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(part);
                }
            }}
        >
            {/* Selection is a soft halo; keyboard focus on a selected part turns it solid. */}
            {selected && (
                <rect
                    x={part.x - 3}
                    y={part.y - 3}
                    width={part.w + 6}
                    height={part.h + 6}
                    rx={5}
                    className="fill-none stroke-text-accent opacity-25 group-focus-visible:opacity-100"
                    strokeWidth={4}
                />
            )}
            <rect
                x={part.x}
                y={part.y}
                width={part.w}
                height={part.h}
                rx={3}
                strokeWidth={selected ? 2 : 1}
                className={
                    selected
                        ? 'fill-surface-primary stroke-text-accent'
                        : `fill-surface-primary group-hover:fill-surface-hover group-focus-visible:stroke-text-accent ${
                              active ? 'stroke-semantic-success' : 'stroke-border-secondary'
                          }`
                }
            />
            {/* Activity lamp: a second cue besides the outline, and the only one on a selected part. */}
            <circle
                cx={part.x + part.w - 10}
                cy={part.y + 11}
                r={3}
                className={active ? 'fill-semantic-success' : 'fill-surface-quaternary'}
            />
            {part.kind === 'chip' &&
                pinY.map((y) => (
                    <line
                        key={y}
                        x1={part.x + 8}
                        y1={y}
                        x2={part.x + part.w - 8}
                        y2={y}
                        strokeWidth={3}
                        strokeDasharray="0 6"
                        strokeLinecap="round"
                        className="stroke-text-tertiary"
                    />
                ))}
            <PartText part={part} rate={rate} />
        </g>
    );
};

const DimPart: React.FC<{ part: BoardPart }> = ({ part }) => (
    <g>
        <rect
            x={part.x}
            y={part.y}
            width={part.w}
            height={part.h}
            rx={3}
            strokeDasharray="4 3"
            className="fill-surface-secondary stroke-border-secondary"
        />
        <PartText part={part} dim />
    </g>
);

/**
 * The Apple 1 board as a way into the running machine: every emulated part is a
 * button that selects the component behind it, and the card below lists that
 * component's config and live debug values.
 */
const BoardView: React.FC<BoardViewProps> = ({ root, workerManager }) => {
    const { debugInfo, setDebuggerActive } = useWorkerData();
    const [selectedPartId, setSelectedPartId] = useState<string>(DEFAULT_PART_ID);

    // Debug info is polled only while a view that shows it is on screen.
    useEffect(() => {
        setDebuggerActive(true);
        return () => setDebuggerActive(false);
    }, [setDebuggerActive]);

    const selectedPart = BOARD_PARTS.find((part) => part.id === selectedPartId);
    const selectedNodeId = selectedPart?.nodeId;
    const node = useMemo(() => (selectedNodeId ? findNode(root, selectedNodeId) : undefined), [root, selectedNodeId]);
    const fields = useMemo(() => (node ? describeNode(node, debugInfo) : []), [node, debugInfo]);

    // Each poll delivers a new tree with a new sample. Rates come from the last
    // two, so the previous one is kept in state, updated while rendering.
    const sample = useMemo(() => readActivitySample(root), [root]);
    const [samples, setSamples] = useState<{
        previous: BoardActivitySample | undefined;
        current: BoardActivitySample | undefined;
    }>({ previous: undefined, current: sample });
    if (samples.current !== sample) {
        setSamples({ previous: samples.current, current: sample });
    }
    const activity = useMemo(() => computeBoardActivity(samples.previous, samples.current), [samples]);

    return (
        <div className="flex flex-col h-full overflow-auto gap-md">
            <div className="flex items-center justify-between gap-md flex-wrap">
                <span className="eyebrow">{'// board · stylised, not to scale'}</span>
                <div className="flex items-center gap-md font-mono text-2xs text-text-secondary">
                    <span className="inline-flex items-center gap-xs">
                        <span
                            aria-hidden="true"
                            className="w-3 h-3 rounded-sm border-2 border-text-accent bg-surface-primary"
                        />
                        selected
                    </span>
                    <span className="inline-flex items-center gap-xs">
                        <span
                            aria-hidden="true"
                            className="w-3 h-3 rounded-sm border border-dashed border-border-secondary bg-surface-secondary"
                        />
                        not emulated
                    </span>
                    <span className="inline-flex items-center gap-xs">
                        <span aria-hidden="true" className="w-2 h-2 rounded-full bg-semantic-success" />
                        in use
                    </span>
                </div>
            </div>

            <svg
                viewBox={`0 0 ${BOARD_SIZE.width} ${BOARD_SIZE.height}`}
                role="group"
                aria-label="Apple 1 board"
                className="w-full h-auto flex-none"
            >
                <rect
                    x={0.5}
                    y={0.5}
                    width={BOARD_SIZE.width - 1}
                    height={BOARD_SIZE.height - 1}
                    rx={8}
                    className="fill-surface-sunken stroke-border-primary"
                />

                {BOARD_REGIONS.map((region) => (
                    <g key={region.id}>
                        <rect
                            x={region.x}
                            y={region.y}
                            width={region.w}
                            height={region.h}
                            rx={5}
                            strokeDasharray={region.dim ? '4 3' : undefined}
                            className={
                                region.dim
                                    ? 'fill-none stroke-border-primary'
                                    : 'fill-surface-secondary stroke-border-primary'
                            }
                        />
                        <text
                            x={region.x + 12}
                            y={region.y + 20}
                            className="fill-text-tertiary font-mono text-2xs font-medium uppercase tracking-caps select-none"
                        >
                            {`// ${region.label}`}
                        </text>
                        {region.note && (
                            <text
                                x={region.x + 12}
                                y={region.y + region.h - 20}
                                className="fill-text-tertiary font-mono text-2xs select-none"
                            >
                                {region.note}
                            </text>
                        )}
                    </g>
                ))}

                <g aria-hidden="true">
                    {BOARD_TRACES.map((trace) => {
                        const lit = isTraceActive(activity, trace, BOARD_PARTS);
                        return (
                            <line
                                key={trace.id}
                                data-trace={trace.id}
                                data-active={lit}
                                x1={trace.x1}
                                y1={trace.y1}
                                x2={trace.x2}
                                y2={trace.y2}
                                strokeWidth={trace.trunk ? 3 : 2}
                                className={`${traceClass[trace.bus]} ${lit ? '' : 'opacity-40'}`}
                            />
                        );
                    })}
                    {BUS_LABELS.map((label) => (
                        <text
                            key={label.bus}
                            x={label.x}
                            y={label.y}
                            className={`font-mono text-2xs select-none ${busLabelClass[label.bus]}`}
                        >
                            {label.label}
                        </text>
                    ))}
                </g>

                {BOARD_PARTS.map((part) =>
                    part.kind === 'dim' ? (
                        <DimPart key={part.id} part={part} />
                    ) : (
                        <InteractivePart
                            key={part.id}
                            part={part}
                            selected={part.nodeId === selectedNodeId}
                            active={isPartActive(activity, part)}
                            rate={rateLabel(sample, activity, part)}
                            onSelect={(next) => setSelectedPartId(next.id)}
                        />
                    ),
                )}
            </svg>

            {selectedPart && (
                <section className="card flex-none" aria-label="Selected part">
                    <div className="eyebrow mb-xs">{'// selected'}</div>
                    <div className="flex items-baseline gap-sm flex-wrap mb-md">
                        <h3 className="card-title">{selectedPart.label}</h3>
                        {node && (
                            <>
                                <span
                                    className={`font-mono text-xs font-medium ${typeColorClass[node.type] ?? 'text-text-primary'}`}
                                >
                                    {node.type}
                                </span>
                                <span className="font-mono text-xs text-text-secondary">{node.id}</span>
                                {node.name && <span className="text-xs text-text-secondary">{node.name}</span>}
                            </>
                        )}
                    </div>
                    {!node && <p className="text-sm text-text-secondary">Not present in the running machine.</p>}
                    {node && fields.length === 0 && (
                        <p className="text-sm text-text-secondary">This component reports no fields.</p>
                    )}
                    {fields.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-lg gap-y-xs">
                            {fields.map((field) => (
                                <RegisterRow
                                    key={field.key}
                                    label={field.key}
                                    value={field.value}
                                    type={field.kind}
                                    workerManager={workerManager}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default BoardView;
