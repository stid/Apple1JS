import React, { useState } from 'react';
import { IInspectableComponent } from '../core/types/components';
import { OPCODES } from '../constants/opcodes';
import { MetricCard } from './MetricCard';
import { RegisterRow } from './RegisterRow';
import type { WorkerManager } from '../services/WorkerManager';
import { useWorkerData } from '../contexts/WorkerDataContext';

import type { InspectableData } from '../core/types/components';

interface InspectorViewProps {
    root: IInspectableComponent;
    workerManager?: WorkerManager;
}

const InspectorView: React.FC<InspectorViewProps> = ({ root, workerManager }) => {
    const { debugInfo } = useWorkerData();
    const [profilingEnabled, setProfilingEnabled] = useState<boolean>(false);

    // Helper function to translate hex opcode to human-readable mnemonic
    const getOpcodeMnemonic = (opcodeHex: string): string => {
        // Convert hex string like "$30" to number
        const opcodeNum = parseInt(opcodeHex.replace('$', ''), 16);
        const opcodeInfo = OPCODES[opcodeNum];
        return opcodeInfo ? opcodeInfo.name : opcodeHex; // Fall back to hex if not found
    };

    // Debug info is now provided by WorkerDataContext, no need to poll



    // Handler for profiling toggle
    const handleProfilingToggle = async () => {
        const newProfilingState = !profilingEnabled;
        setProfilingEnabled(newProfilingState);
        if (workerManager) {
            try {
                await workerManager.setCpuProfiling(newProfilingState);
            } catch (error) {
                console.error('Failed to toggle CPU profiling:', error);
            }
        }
    };

    // Get CPU performance data if available
    const cpuDebugData = debugInfo.cpu || {};
    const perfData = cpuDebugData._PERF_DATA as { 
        stats?: { instructionCount: number; totalInstructions: number; profilingEnabled: boolean };
        topOpcodes?: Array<{ opcode: string; count: number; cycles: number; avgCycles: number }>;
    } | undefined;

    // Type guard for children property
    function hasChildren(node: InspectableData): node is InspectableData & { children: InspectableData[] } {
        return Array.isArray((node as Record<string, unknown>).children);
    }

    // Use getInspectable() for architecture view
    const archRoot: InspectableData =
        typeof root.getInspectable === 'function' ? root.getInspectable() : (root as unknown as InspectableData);

    // Helper function to get debug data for a component based on its type and id
    const getDebugDataForComponent = (node: InspectableData): Record<string, string | number | boolean> => {
        if (!debugInfo || Object.keys(debugInfo).length === 0) return {};
        
        // Map component types to debug domains
        const typeToDebugDomain: Record<string, string> = {
            'CPU': 'cpu',
            'CPU6502': 'cpu',  // Real CPU6502 component type
            'PIA6820': 'pia', 
            'Bus': 'Bus',
            'Clock': 'clock'
        };
        
        const debugDomain = typeToDebugDomain[node.type];
        if (!debugDomain || !debugInfo[debugDomain]) return {};
        
        const domainData = debugInfo[debugDomain];
        
        // Handle CPU debug data (could be flat or nested depending on source)
        if (debugDomain === 'cpu' && typeof domainData === 'object') {
            const result: Record<string, string | number | boolean> = {};
            Object.entries(domainData).forEach(([key, value]) => {
                // Skip performance data - it's handled separately in the UI
                if (key === '_PERF_DATA') {
                    return;
                }
                
                if (typeof value === 'object' && value !== null) {
                    // Flatten nested objects like REG: { PC: '0x1234' } -> REG_PC: '0x1234'
                    Object.entries(value).forEach(([subKey, subValue]) => {
                        result[`${key}_${subKey}`] = subValue as string | number | boolean;
                    });
                } else {
                    // Keep flat values as-is (like REG_PC: '$1234')
                    result[key] = value as string | number | boolean;
                }
            });
            return result;
        }
        
        return domainData as Record<string, string | number | boolean>;
    };

    // Color legend for component types
    const getComponentColor = (type: string): string => {
        const colorMap: Record<string, string> = {
            RAM: 'text-component-ram',
            ROM: 'text-component-rom',
            Bus: 'text-component-bus',
            CPU: 'text-component-cpu',
            CPU6502: 'text-component-cpu',
            PIA6820: 'text-component-pia',
            IoComponent: 'text-component-io',
            Clock: 'text-component-clock',
            default: 'text-text-primary',
        };
        return colorMap[type] || colorMap.default;
    };

    // Render architecture component as a clean section
    function renderArchComponent(node: InspectableData, depth = 0, seen = new Map()): React.ReactNode[] {
        // Deduplicate by id, but prefer the node with more config fields
        const configKeys = Object.keys(node).filter(
            (key) =>
                !['id', 'type', 'name', 'children', 'mapping'].includes(key) &&
                typeof node[key] !== 'object' &&
                typeof node[key] !== 'function',
        );
        const prev = seen.get(node.id);
        if (prev) {
            const prevConfigKeys = prev.configKeys || [];
            if (configKeys.length > prevConfigKeys.length) {
                seen.set(node.id, { node, configKeys });
            } else {
                return [];
            }
        } else {
            seen.set(node.id, { node, configKeys });
        }

        // Extract config fields
        const configObj: Record<string, unknown> = {};
        for (const key in node) {
            if (
                key !== 'id' &&
                key !== 'type' &&
                key !== 'name' &&
                key !== 'children' &&
                key !== 'mapping' &&
                typeof node[key] !== 'object' &&
                typeof node[key] !== 'function'
            ) {
                configObj[key] = node[key];
            }
        }
        
        // Add debug data for this component if available
        const debugData = getDebugDataForComponent(node);
        const combinedConfig = { ...configObj, ...debugData };
        
        const filteredConfigEntries = Object.entries(combinedConfig).filter(([, v]) => v !== undefined && v !== null);
        
        // Component card - all components use same Top Instructions styling
        const componentCard = (
            <div key={node.id} className="bg-black/30 border border-border-subtle rounded-lg p-md mb-sm" style={{ marginLeft: `${depth * 16}px` }}>
                <div className="flex items-center justify-between mb-sm">
                    <div className="flex items-center">
                        {depth > 0 && (
                            <span className="text-text-secondary mr-2">
                                {'└─ '}
                            </span>
                        )}
                        <span className={`font-medium text-sm ${getComponentColor(node.type)}`}>
                            {node.type}
                        </span>
                        <span className="text-text-secondary text-xs ml-2 font-mono">
                            {node.id}
                        </span>
                    </div>
                    <span className="text-text-secondary text-xs">
                        {node.name || '(unnamed)'}
                    </span>
                </div>
                
                {filteredConfigEntries.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-lg gap-y-xs">
                        {filteredConfigEntries.map(([k, v]) => {
                            const isDebugData = k in debugData;
                            const formattedValue = formatValue(k, v as string | number | boolean);
                            return workerManager ? (
                                <RegisterRow 
                                    key={k} 
                                    label={k} 
                                    value={formattedValue}
                                    type={isDebugData ? getDataType(k) : 'status'}
                                    workerManager={workerManager}
                                />
                            ) : (
                                <RegisterRow 
                                    key={k} 
                                    label={k} 
                                    value={formattedValue}
                                    type={isDebugData ? getDataType(k) : 'status'}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        );
        
        // Helper function to format values with consistent width
        function formatValue(key: string, value: string | number | boolean): string {
            const strValue = String(value);
            
            // For known numeric fields that can vary in length, pad them
            if (key === 'drift' || key === 'actualFrequency') {
                // For drift percentage and frequency, ensure consistent decimal places
                if (typeof value === 'number') {
                    return value.toFixed(2);
                }
            }
            
            // For large numbers, add thousand separators for readability
            if (typeof value === 'number' && value > 999) {
                return value.toLocaleString();
            }
            
            return strValue;
        }

        // Helper function to determine data type for color coding
        function getDataType(key: string): 'address' | 'value' | 'flag' | 'status' {
            if (key.includes('ADDR') || key.includes('Address')) return 'address';
            if (key.includes('FLAG') || key.includes('Flag')) return 'flag';
            if (key.includes('REG_') || key.includes('DATA')) return 'value';
            return 'status';
        }
        
        let childrenNodes: React.ReactNode[] = [];
        if (hasChildren(node) && node.children.length > 0) {
            childrenNodes = node.children.flatMap((child) => renderArchComponent(child as InspectableData, depth + 1, seen));
        }
        return [componentCard, ...childrenNodes];
    }

    // Extract CPU register data for better display - always return data to prevent FOUC
    const cpuRegisterData = React.useMemo(() => {
        const cpu = debugInfo.cpu || {};
        return {
            pc: cpu.REG_PC || cpu.PC || '$0000',
            a: cpu.REG_A || cpu.A || '$00',
            x: cpu.REG_X || cpu.X || '$00',
            y: cpu.REG_Y || cpu.Y || '$00',
            s: cpu.REG_S || cpu.S || '$00',
            // Flags
            flagN: cpu.FLAG_N || cpu.N || 'CLR',
            flagZ: cpu.FLAG_Z || cpu.Z || 'CLR',
            flagC: cpu.FLAG_C || cpu.C || 'CLR',
            flagV: cpu.FLAG_V || cpu.V || 'CLR',
            flagI: cpu.FLAG_I || cpu.I || 'SET',
            flagD: cpu.FLAG_D || cpu.D || 'CLR',
            // Memory info
            ramBank2Address: cpu.ramBank2Address || '$F000 - $FFFF',
            piaAddress: cpu.piaAddress || '$D010 - $D013',
            // Execution
            hwAddr: cpu.HW_ADDR || '$FFFE',
            hwData: cpu.HW_DATA || '$00',
            hwOpcode: cpu.HW_OPCODE || '$00',
            hwCycles: cpu.HW_CYCLES || '40,259,072',
            irqLine: cpu.IRQ_LINE || 'INACTIVE',
            nmiLine: cpu.NMI_LINE || 'INACTIVE',
            irqPending: cpu.IRQ_PENDING || 'NO',
            nmiPending: cpu.NMI_PENDING || 'NO',
            execTmp: cpu.EXEC_TMP || '$00',
            execAddr: cpu.EXEC_ADDR || '$0000',
            perfEnabled: cpu.PERF_ENABLED || 'YES',
            perfInstructions: cpu.PERF_INSTRUCTIONS || '4,297,966',
        };
    }, [debugInfo.cpu]);

    return (
        <div className="flex flex-col h-full overflow-auto space-y-md">
            {/* Performance Section */}
            <section className="bg-surface-primary rounded-lg p-md border border-border-primary">
                <div className="flex items-center justify-between mb-md">
                    <h3 className="text-sm font-medium text-text-accent flex items-center">
                        <span className="mr-2">🔥</span>
                        CPU Performance Profiling
                    </h3>
                    <button
                        onClick={handleProfilingToggle}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            profilingEnabled
                                ? 'bg-success text-white hover:bg-success/80'
                                : 'bg-border-primary text-text-secondary hover:bg-border-secondary'
                        }`}
                    >
                        {profilingEnabled ? 'Disable Profiling' : 'Enable Profiling'}
                    </button>
                </div>
                
                {profilingEnabled && perfData && (
                    <div className="space-y-md">
                        <div className="grid grid-cols-3 gap-md">
                            <MetricCard 
                                label="Instructions" 
                                value={perfData.stats?.instructionCount.toLocaleString() || '0'}
                                status="info"
                            />
                            <MetricCard 
                                label="Unique Opcodes" 
                                value={perfData.stats?.totalInstructions || '0'}
                                status="info"
                            />
                            <MetricCard 
                                label="Status" 
                                value="ACTIVE"
                                status="success"
                            />
                        </div>
                        
                        {perfData.topOpcodes && perfData.topOpcodes.length > 0 && (
                            <div className="bg-black/30 rounded-lg p-md border border-border-subtle">
                                <div className="text-sm font-medium text-text-secondary mb-sm">Top Instructions</div>
                                <div className="space-y-sm">
                                    {perfData.topOpcodes.slice(0, 3).map((opcode) => (
                                        <div key={opcode.opcode} className="flex justify-between items-center text-sm font-mono">
                                            <span className="text-data-status font-medium">{getOpcodeMnemonic(opcode.opcode)}</span>
                                            <span className="text-data-value">{opcode.count.toLocaleString()}</span>
                                            <span className="text-data-flag">{opcode.avgCycles}c</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* CPU Registers Section */}
            <section className="bg-surface-primary rounded-lg p-md border border-border-primary">
                <h3 className="text-sm font-medium text-text-accent mb-md flex items-center">
                    <span className="mr-2">⚙️</span>
                    CPU Registers
                </h3>
                <div className="grid grid-cols-2 gap-x-lg gap-y-sm">
                    {workerManager ? (
                        <RegisterRow label="REG_PC" value={cpuRegisterData.pc} type="address" workerManager={workerManager} />
                    ) : (
                        <RegisterRow label="REG_PC" value={cpuRegisterData.pc} type="address" />
                    )}
                    <RegisterRow label="REG_A" value={cpuRegisterData.a} type="value" />
                    <RegisterRow label="REG_X" value={cpuRegisterData.x} type="value" />
                    <RegisterRow label="REG_Y" value={cpuRegisterData.y} type="value" />
                    <RegisterRow label="REG_S" value={cpuRegisterData.s} type="value" />
                    <RegisterRow label="FLAG_N" value={cpuRegisterData.flagN} type="flag" />
                    <RegisterRow label="FLAG_Z" value={cpuRegisterData.flagZ} type="flag" />
                    <RegisterRow label="FLAG_C" value={cpuRegisterData.flagC} type="flag" />
                    <RegisterRow label="FLAG_V" value={cpuRegisterData.flagV} type="flag" />
                    <RegisterRow label="FLAG_I" value={cpuRegisterData.flagI} type="flag" />
                    <RegisterRow label="FLAG_D" value={cpuRegisterData.flagD} type="flag" />
                </div>
            </section>

            {/* Memory & I/O Section */}
            <section className="bg-surface-primary rounded-lg p-md border border-border-primary">
                <h3 className="text-sm font-medium text-text-accent mb-md flex items-center">
                    <span className="mr-2">💾</span>
                    Memory & I/O
                </h3>
                <div className="space-y-sm">
                    {workerManager ? (
                        <>
                            <RegisterRow label="ramBank2Address" value={cpuRegisterData.ramBank2Address} type="address" workerManager={workerManager} />
                            <RegisterRow label="piaAddress" value={cpuRegisterData.piaAddress} type="address" workerManager={workerManager} />
                            <RegisterRow label="HW_ADDR" value={cpuRegisterData.hwAddr} type="address" workerManager={workerManager} />
                        </>
                    ) : (
                        <>
                            <RegisterRow label="ramBank2Address" value={cpuRegisterData.ramBank2Address} type="address" />
                            <RegisterRow label="piaAddress" value={cpuRegisterData.piaAddress} type="address" />
                            <RegisterRow label="HW_ADDR" value={cpuRegisterData.hwAddr} type="address" />
                        </>
                    )}
                    <RegisterRow label="HW_DATA" value={cpuRegisterData.hwData} type="value" />
                    <RegisterRow label="HW_OPCODE" value={cpuRegisterData.hwOpcode} type="value" />
                    <RegisterRow label="HW_CYCLES" value={cpuRegisterData.hwCycles} type="status" />
                    <RegisterRow label="IRQ_LINE" value={cpuRegisterData.irqLine} type="status" />
                    <RegisterRow label="NMI_LINE" value={cpuRegisterData.nmiLine} type="status" />
                    <RegisterRow label="IRQ_PENDING" value={cpuRegisterData.irqPending} type="flag" />
                    <RegisterRow label="NMI_PENDING" value={cpuRegisterData.nmiPending} type="flag" />
                    <RegisterRow label="EXEC_TMP" value={cpuRegisterData.execTmp} type="value" />
                    {workerManager ? (
                        <RegisterRow label="EXEC_ADDR" value={cpuRegisterData.execAddr} type="address" workerManager={workerManager} />
                    ) : (
                        <RegisterRow label="EXEC_ADDR" value={cpuRegisterData.execAddr} type="address" />
                    )}
                    <RegisterRow label="PERF_ENABLED" value={cpuRegisterData.perfEnabled} type="flag" />
                    <RegisterRow label="PERF_INSTRUCTIONS" value={cpuRegisterData.perfInstructions} type="status" />
                </div>
            </section>

            {/* Architecture Tree Section */}
            <section className="bg-surface-primary rounded-lg p-md border border-border-primary">
                <h3 className="text-sm font-medium text-text-accent mb-md flex items-center">
                    <span className="mr-2">🏗️</span>
                    Architecture Tree
                </h3>
                <div className="bg-black/30 rounded-lg p-md border border-border-subtle">
                    <div className="space-y-sm">
                        {renderArchComponent(archRoot)}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default InspectorView;
