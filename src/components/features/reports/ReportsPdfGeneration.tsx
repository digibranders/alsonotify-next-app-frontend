import React from 'react';
// Imports removed to be dynamic

import dayjs from '@/utils/dayjs';
import BrandLogo from '@/assets/images/logo.png';
import { RequirementReport, TaskReport, EmployeeReport, ReportKPI, EmployeeKPI, TaskReportsResponse } from '../../../services/report';
import { getCurrencySymbol } from '@/utils/currencyUtils';

// --- Types ---
export interface MemberRow {
    id: string | number;
    member: string;
    department: string;
    designation?: string;
    taskStats: { assigned: number; completed: number; inProgress: number; delayed: number };
    totalWorkingHrs: number;
    actualEngagedHrs: number;
    costPerHour: number;
    billablePerHour: number;
    utilization: number;
    efficiency: number;
}

export interface WorklogRow {
    id: string | number;
    date: string;
    task: string;
    details: string;
    startTime: string;
    endTime: string;
    engagedTime: string;
}

interface ReportsPdfTemplateProps {
    activeTab: 'requirement' | 'task' | 'member';
    data: RequirementReport[] | TaskReport[] | EmployeeReport[];
    kpis: ReportKPI | EmployeeKPI | TaskReportsResponse['kpi'];
    dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
    companyName?: string;
    timezone?: string;
    currency?: string;
}

// --- Pagination Constants ---
// Approximate row limits to ensure safety margins.
// A4 @ 96 DPI is ~794px width x 1123px height.
// We are scaling by 2 for quality, but the DOM layout is 1:1.
const PAGE_1_ROWS = 12; // Fewer rows due to KPIs
const PAGE_N_ROWS = 20; // More rows on subsequent pages (no KPIs)

// --- Helper Functions ---
const chunkData = <T,>(data: T[], firstPageSize: number, otherPageSize: number): T[][] => {
    const chunks = [];
    if (data.length === 0) return [];

    // First chunk
    chunks.push(data.slice(0, firstPageSize));

    // Subsequent chunks
    let i = firstPageSize;
    while (i < data.length) {
        chunks.push(data.slice(i, i + otherPageSize));
        i += otherPageSize;
    }
    return chunks;
};

const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'completed' || s === 'done') return { bg: '#E8F5E9', text: '#0F9D58', label: 'Completed' };
    if (s === 'in progress' || s === 'in-progress' || s === 'in_progress') return { bg: '#E3F2FD', text: '#2F80ED', label: 'In Progress' };
    if (s === 'delayed') return { bg: '#FFF5F5', text: '#ff3b3b', label: 'Delayed' };
    if (s === 'review' || s === 'in review' || s === 'in-review') return { bg: '#F3E5F5', text: '#9C27B0', label: 'In Review' };
    if (s === 'stuck' || s === 'impediment') return { bg: '#FFF3E0', text: '#EF6C00', label: status.charAt(0).toUpperCase() + status.slice(1) };
    if (s === 'paid' || s === 'payment received') return { bg: '#E8F5E9', text: '#7ccf00', label: 'Payment Received' };
    if (s === 'billed' || s === 'invoice sent') return { bg: '#E3F2FD', text: '#2196F3', label: 'Invoice Sent' };
    if (s === 'draft') return { bg: '#F5F5F5', text: '#666666', label: 'Draft' };
    return { bg: '#F5F5F5', text: '#4B5563', label: status };
};


// --- Components ---

export const ReportsPdfTemplate = ({ activeTab, data, kpis, dateRange, companyName, timezone, currency }: ReportsPdfTemplateProps) => {
    const currSym = getCurrencySymbol(currency || 'USD');
    const generatedDate = dayjs().tz(timezone || 'Asia/Kolkata').format('MMM DD, YYYY');
    const periodStart = dateRange && dateRange[0] ? dateRange[0].format('MMM DD, YYYY') : 'Start';
    const periodEnd = dateRange && dateRange[1] ? dateRange[1].format('MMM DD, YYYY') : 'End';

    // Chunk Data
    const chunks = chunkData(data as unknown[], PAGE_1_ROWS, PAGE_N_ROWS);
    const totalPages = chunks.length || 1;

    // If no data, render at least one page
    if (chunks.length === 0) {
        chunks.push([]);
    }

    return (
        <div id="pdf-report-container" style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            {chunks.map((chunk, pageIndex) => (
                <div
                    key={pageIndex}
                    className="pdf-page"
                    style={{
                        width: '210mm',
                        height: '296mm', // Fixed A4 height
                        padding: '40px',
                        backgroundColor: 'white',
                        fontFamily: "'Inter', sans-serif",
                        color: '#111111',
                        position: 'relative',
                        boxSizing: 'border-box',
                        overflow: 'hidden', // Ensure no overflow
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Header Section (On every page for context, or Simplified?) */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderBottom: '2px solid #EEEEEE',
                        paddingBottom: '20px',
                        marginBottom: '20px',
                        flexShrink: 0
                    }}>
                        <div className="brand-section">
                            <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '24px', margin: 0, color: '#111111' }}>
                                {companyName || 'Company Name'}
                            </h1>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '12px', color: '#666666' }}>
                            <span style={{
                                fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '16px', color: '#111111', marginBottom: '4px', display: 'block'
                            }}>
                                {activeTab === 'requirement' ? 'Requirements Report' : activeTab === 'task' ? 'Tasks Report' : 'Employees Report'}
                            </span>
                            <span>Generated: {generatedDate}</span><br />
                            <span>Period: {periodStart} - {periodEnd}</span>
                        </div>
                    </div>

                    {/* KPIs (Page 1 Only) */}
                    {pageIndex === 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: activeTab === 'member' ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
                            gap: '15px',
                            marginBottom: '30px',
                            flexShrink: 0
                        }}>
                            {activeTab === 'requirement' && renderRequirementKPIs(kpis as ReportKPI)}
                            {activeTab === 'task' && renderTaskKPIs(kpis as TaskReportsResponse['kpi'])}
                            {activeTab === 'member' && renderEmployeeKPIs(kpis as EmployeeKPI, currSym)}
                        </div>
                    )}

                    {/* Table Section */}
                    <div style={{ flex: 1 }}> {/* Table takes remaining space */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr>
                                    {activeTab === 'requirement' && renderReqHeader()}
                                    {activeTab === 'task' && renderTaskHeader()}
                                    {activeTab === 'member' && renderEmpHeader()}
                                </tr>
                            </thead>
                            <tbody>
                                {chunk.map((row, idx) => {
                                    // Calculate global index
                                    const globalIdx = (pageIndex === 0 ? idx : PAGE_1_ROWS + (pageIndex - 1) * PAGE_N_ROWS + idx);
                                    return (
                                        <tr key={idx} style={idx % 2 === 0 ? {} : { backgroundColor: '#F9FAFB' }}>
                                            {activeTab === 'requirement' && renderReqRow(row as unknown as RequirementReport, globalIdx, timezone, currSym)}
                                            {activeTab === 'task' && renderTaskRow(row as unknown as TaskReport, globalIdx)}
                                            {activeTab === 'member' && renderEmpRow(row as unknown as EmployeeReport, globalIdx, currSym)}
                                        </tr>
                                    );
                                })}
                                {chunk.length === 0 && (
                                    <tr><Td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>No data available for this period.</Td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Section - Absolute bottom to ensure margin */}
                    <div style={{
                        position: 'absolute',
                        bottom: '40px',
                        left: '40px',
                        right: '40px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        borderTop: '1px solid #EEEEEE',
                        paddingTop: '20px'
                    }}>
                        <img src={BrandLogo.src} alt="Alsonotify" className="h-6 object-contain" />
                        <span style={{ fontSize: '10px', color: '#999999' }}>Page {pageIndex + 1} of {totalPages}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};


export const IndividualEmployeePdfTemplate = ({ member, worklogs, dateRange, companyName, timezone, currency }: { member: MemberRow, worklogs: WorklogRow[], dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null, companyName?: string, timezone?: string, currency?: string }) => {
    const generatedDate = dayjs().tz(timezone || 'Asia/Kolkata').format('MMM DD, YYYY');
    const periodStart = dateRange && dateRange[0] ? dateRange[0].format('MMM DD, YYYY') : 'Start';
    const periodEnd = dateRange && dateRange[1] ? dateRange[1].format('MMM DD, YYYY') : 'End';
    const taskEfficiency = member.efficiency;
    const occupancy = member.utilization;

    // Chunk worklogs
    // Page 1: Profile + KPIs + History Header + ~5 rows
    // Page N: History Header + ~20 rows
    const EMP_PAGE_1_ROWS = 8;
    const EMP_PAGE_N_ROWS = 25;

    const chunks = chunkData(worklogs, EMP_PAGE_1_ROWS, EMP_PAGE_N_ROWS);
    const totalPages = chunks.length || 1;
    if (chunks.length === 0) chunks.push([]);

    return (
        <div id="pdf-individual-report-container" style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            {chunks.map((chunk, pageIndex) => (
                <div
                    key={pageIndex}
                    className="pdf-page"
                    style={{
                        width: '210mm',
                        height: '296mm',
                        padding: '40px',
                        backgroundColor: 'white',
                        fontFamily: "'Inter', sans-serif",
                        color: '#111111',
                        position: 'relative',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderBottom: '2px solid #EEEEEE',
                        paddingBottom: '20px',
                        marginBottom: '30px'
                    }}>
                        <div className="brand-section">
                            <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '24px', margin: 0, color: '#111111' }}>
                                {companyName || 'Company Name'}
                            </h1>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '12px', color: '#666666' }}>
                            <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '16px', color: '#111111', marginBottom: '4px', display: 'block' }}>
                                Employee Performance Report
                            </span>
                            <span>Generated: {generatedDate}</span><br />
                            <span>Period: {periodStart} - {periodEnd}</span>
                        </div>
                    </div>

                    {/* Profile & KPIs (Page 1 Only) */}
                    {pageIndex === 0 && (
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                            {/* Profile Card */}
                            <div style={{ flex: 1, padding: '20px', background: '#FAFAFA', border: '1px solid #EEEEEE', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#111111',
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '20px', fontFamily: "'Manrope', sans-serif", fontWeight: 700
                                    }}>
                                        {member.member.charAt(0)}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#111111', fontFamily: "'Manrope', sans-serif" }}>{member.member}</div>
                                        <div style={{ fontSize: '13px', color: '#666666' }}>{member.department}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', flex: 3 }}>
                                <div style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #EEEEEE', backgroundColor: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 500, color: '#666666', textTransform: 'uppercase' }}>Total Hours</span>
                                    <span style={{ fontSize: '20px', fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: '#111111' }}>{member.totalWorkingHrs}h</span>
                                </div>
                                <div style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #EEEEEE', backgroundColor: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 500, color: '#666666', textTransform: 'uppercase' }}>Engaged</span>
                                    <span style={{ fontSize: '20px', fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: '#111111' }}>{member.actualEngagedHrs}h</span>
                                </div>
                                <div style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #EEEEEE', backgroundColor: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 500, color: '#666666', textTransform: 'uppercase' }}>Efficiency</span>
                                    <span style={{ fontSize: '20px', fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: taskEfficiency >= 75 ? '#0F9D58' : taskEfficiency >= 50 ? '#2196F3' : '#FF3B3B' }}>
                                        {taskEfficiency}%
                                    </span>
                                </div>
                                <div style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #EEEEEE', backgroundColor: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 500, color: '#666666', textTransform: 'uppercase' }}>Occupancy</span>
                                    <span style={{ fontSize: '20px', fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: occupancy >= 70 ? '#0F9D58' : '#FF3B3B' }}>
                                        {occupancy}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table Section */}
                    <div style={{ marginBottom: '15px' }}>
                        {/* Title only page 1 */}
                        {pageIndex === 0 && (
                            <h3 style={{ fontSize: '14px', fontWeight: 700, fontFamily: "'Manrope', sans-serif", color: '#111111', textTransform: 'uppercase', marginBottom: '15px' }}>Work History</h3>
                        )}

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr>
                                    <Th style={{ width: '100px' }}>Date</Th>
                                    <Th style={{ width: '150px' }}>Task</Th>
                                    <Th>Details</Th>
                                    <Th style={{ width: '120px', textAlign: 'right' }}>Time</Th>
                                    <Th style={{ width: '80px', textAlign: 'right' }}>Duration</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {chunk.map((log, idx) => (
                                    <tr key={idx} style={idx % 2 === 0 ? {} : { backgroundColor: '#F9FAFB' }}>
                                        <Td style={{ fontWeight: 500, color: '#111111' }}>{dayjs(log.date).format('MMM DD')}</Td>
                                        <Td style={{ fontWeight: 500, color: '#111111' }}>{log.task}</Td>
                                        <Td style={{ color: '#666666' }}>{log.details}</Td>
                                        <Td style={{ textAlign: 'right', color: '#666666' }}>{log.startTime} - {log.endTime}</Td>
                                        <Td style={{ textAlign: 'right', fontWeight: 700, color: '#111111' }}>{log.engagedTime}</Td>
                                    </tr>
                                ))}
                                {chunk.length === 0 && pageIndex === 0 && (
                                    <tr><Td style={{ textAlign: 'center', color: '#999' }} colSpan={5}>No work history found.</Td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div style={{
                        position: 'absolute',
                        bottom: '40px',
                        left: '40px',
                        right: '40px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        borderTop: '1px solid #EEEEEE',
                        paddingTop: '20px'
                    }}>
                        <img src={BrandLogo.src} alt="Alsonotify" className="h-6 object-contain" />
                        <span style={{ fontSize: '10px', color: '#999999' }}>Page {pageIndex + 1} of {totalPages}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};


// --- Generator Function ---

export const generatePdf = async (fileName: string, containerId: string = 'pdf-report-container') => {
    // If containerId is generic, we might want to be specific, but for now strict IDs are passed.
    // However, for the individual report, we passed 'pdf-report-container' by prop default or override.
    // The components above use hardcoded IDs 'pdf-report-container' and 'pdf-individual-report-container'.
    // We should ensure the caller passes the right ID or we query based on presence.

    // Actually, let's select ALL elements with class 'pdf-page' inside the container.
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`PDF Container ${containerId} not found`);
        return;
    }

    const pages = container.querySelectorAll('.pdf-page');
    if (pages.length === 0) {
        console.error('No PDF pages found');
        return;
    }

    try {
        const jsPDF = (await import('jspdf')).default;
        const html2canvas = (await import('html2canvas')).default;

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < pages.length; i++) {
            const pageEl = pages[i] as HTMLElement;

            // Render the page
            const canvas = await html2canvas(pageEl, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: pageEl.offsetWidth, // Ensure we capture full width/height
                height: pageEl.offsetHeight
            });

            const imgData = canvas.toDataURL('image/png');

            if (i > 0) pdf.addPage();

            // Add image full scale to PDF page
            // We set DOM element to 210mm x 297mm, so it maps 1:1
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }

        pdf.save(fileName);
        return true;
    } catch (error) {
        console.error('PDF Generation failed:', error);
        throw error;
    }
};


// --- Render Helpers (Split out for cleaner code) ---
function renderReqHeader() {
    return (
        <>
            <Th style={{ width: '50px' }}>No</Th>
            <Th style={{ width: '25%' }}>Requirement</Th>
            <Th style={{ width: '15%' }}>Contact Person</Th>
            <Th style={{ width: '15%' }}>Timeline</Th>
            <Th style={{ width: '20%' }}>Hours Utilization</Th>
            <Th style={{ width: '10%' }}>Revenue</Th>
            <Th style={{ width: '10%' }}>Status</Th>
        </>
    )
}

function renderTaskHeader() {
    return (
        <>
            <Th style={{ width: '50px' }}>No</Th>
            <Th>Task</Th>
            <Th>Requirement</Th>
            <Th>Leader</Th>
            <Th>Assigned</Th>
            <Th>Duration</Th>
            <Th>Status</Th>
        </>
    )
}

function renderEmpHeader() {
    return (
        <>
            <Th style={{ width: '50px' }}>No</Th>
            <Th style={{ width: '18%' }}>Employee</Th>
            <Th style={{ width: '22%' }}>Tasks Performance</Th>
            <Th style={{ width: '15%' }}>Load</Th>
            <Th style={{ width: '12%' }}>Expenses</Th>
            <Th style={{ width: '12%' }}>Revenue</Th>
            <Th style={{ width: '12%' }}>Net Profit</Th>
        </>
    )
}

function renderReqRow(row: RequirementReport, idx: number, timezone?: string, currSym: string = '$') {
    return (
        <>
            <Td>{idx + 1}</Td>
            <Td>
                <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '13px', color: '#111111' }}>{row.requirement}</div>
                <div style={{ fontSize: '11px', color: '#666666' }}>{row.partner}</div>
            </Td>
            <Td>{row.manager || '-'}</Td>
            <Td>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{row.startDate ? dayjs(row.startDate).tz(timezone || 'Asia/Kolkata').format('MMM DD') : '-'}</span>
                    <span style={{ color: '#999', fontSize: '10px' }}>to {row.endDate ? dayjs(row.endDate).tz(timezone || 'Asia/Kolkata').format('MMM DD') : '-'}</span>
                </div>
            </Td>
            <Td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ fontWeight: 700, color: row.engagedHrs > row.allottedHrs ? '#FF3B3B' : '#111111' }}>{row.engagedHrs}h</span>
                        <span style={{ color: '#666666' }}>of {row.allottedHrs}h</span>
                    </div>
                    <ProgressBar filled={row.engagedHrs} total={row.allottedHrs} color={row.engagedHrs > row.allottedHrs ? '#FF3B3B' : '#111111'} />
                </div>
            </Td>
            <Td style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700 }}>{currSym}{(row.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</Td>
            <Td>
                <div style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: getStatusColor(row.status).bg,
                    color: getStatusColor(row.status).text,
                    whiteSpace: 'nowrap'
                }}>
                    {getStatusColor(row.status).label}
                </div>
            </Td>
        </>
    )
}

function renderTaskRow(row: TaskReport, idx: number) {
    return (
        <>
            <Td>{idx + 1}</Td>
            <Td style={{ fontWeight: 600, color: '#111' }}>{row.task}</Td>
            <Td style={{ color: '#666' }}>{row.requirement}</Td>
            <Td style={{ color: '#666' }}>{row.leader}</Td>
            <Td>{row.assigned}</Td>
            <Td style={{ fontWeight: 700 }}>{row.engagedHrs}h / {row.allottedHrs}h</Td>
            <Td>
                <div style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: getStatusColor(row.status).bg,
                    color: getStatusColor(row.status).text,
                    whiteSpace: 'nowrap'
                }}>
                    {getStatusColor(row.status).label}
                </div>
            </Td>
        </>
    )
}

function renderEmpRow(row: EmployeeReport, idx: number, currSym: string = '$') {
    return (
        <>
            <Td>{idx + 1}</Td>
            <Td>
                <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '13px', color: '#111111' }}>{row.member}</div>
                <div style={{ fontSize: '11px', color: '#666666' }}>{row.designation} <span style={{ color: '#E5E5E5' }}>|</span> {row.department}</div>
            </Td>
            <Td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px' }}>{row.taskStats.assigned} <span style={{ fontWeight: 400, color: '#666' }}>Assigned</span></span>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: '#666' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0F9D58' }}></div> {row.taskStats.completed}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A73E8' }}></div> {row.taskStats.inProgress}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF3B3B' }}></div> {row.taskStats.delayed}</div>
                    </div>
                </div>
            </Td>
            <Td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ fontWeight: 700, color: '#111111' }}>{row.utilization}%</span>
                    </div>
                    <ProgressBar filled={row.utilization} total={100} color={row.utilization > 100 ? '#FF3B3B' : '#111111'} />
                </div>
            </Td>
            <Td style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: '#111111' }}>{currSym}{(row.expenses || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</Td>
            <Td style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: '#111111' }}>{currSym}{(row.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</Td>
            <Td style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: row.profit >= 0 ? '#0F9D58' : '#FF3B3B' }}>
                {row.profit >= 0 ? '+' : ''}{currSym}{(row.profit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Td>
        </>
    )
}

// Reuse Sub-components like KPICard, Th, Td, ProgressBar from before
const KPICard = ({ label, value, color = '#111111', subValue = null }: { label: string, value: string | number, color?: string, subValue?: React.ReactNode }) => (
    <div style={{
        background: '#FAFAFA',
        border: '1px solid #EEEEEE',
        borderRadius: '12px',
        padding: '15px'
    }}>
        <span style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#666666',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '5px',
            display: 'block'
        }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <p style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 700,
                fontSize: '20px',
                margin: 0,
                color: color
            }}>{value}</p>
            {subValue}
        </div>
    </div>
);

const Th = ({ children, style, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th style={{
        backgroundColor: '#111111',
        color: 'white',
        fontFamily: "'Manrope', sans-serif",
        fontWeight: 600,
        textAlign: 'left',
        padding: '12px 15px',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        ...style
    }} {...props}>
        {children}
    </th>
);

const Td = ({ children, style, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td style={{
        padding: '12px 15px',
        borderBottom: '1px solid #EEEEEE',
        fontWeight: 500,
        verticalAlign: 'middle',
        color: '#111111',
        ...style
    }} {...props}>
        {children}
    </td>
);

const ProgressBar = ({ filled, total, color }: { filled: number, total: number, color: string }) => {
    const pct = Math.min((filled / (total || 1)) * 100, 100);
    return (
        <div style={{ width: '100%', height: '6px', backgroundColor: '#F0F0F0', borderRadius: '50px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '50px' }}></div>
        </div>
    )
}

function renderRequirementKPIs(kpi: ReportKPI) {
    if (!kpi) return null;
    return (
        <>
            <KPICard label="Total Requirements" value={kpi.totalRequirements} />
            <KPICard label="On Time Completed" value={kpi.onTimeCompleted} color="#0F9D58" />
            <KPICard label="In Progress" value={kpi.inProgress} />
            <KPICard
                label="Delayed"
                value={kpi.delayed}
                color="#FF3B3B"
                subValue={kpi.totalExtraHrs > 0 ? <span style={{ fontSize: '12px', fontWeight: 500, color: '#666' }}>(+{kpi.totalExtraHrs}h)</span> : null}
            />
            <KPICard label="Efficiency" value={`${kpi.efficiency}%`} color="#2196F3" />
        </>
    )
}

function renderTaskKPIs(kpis: TaskReportsResponse['kpi']) {
    if (!kpis) return null;
    return (
        <>
            <KPICard label="Total Tasks" value={kpis.totalTasks} />
            <KPICard label="On Time Completed" value={kpis.onTimeCompleted} color="#0F9D58" />
            <KPICard label="In Progress" value={kpis.inProgress} />
            <KPICard
                label="Delayed"
                value={kpis.delayed}
                color="#FF3B3B"
                subValue={kpis.totalExtraHrs > 0 ? <span style={{ fontSize: '12px', fontWeight: 500, color: '#666' }}>(+{kpis.totalExtraHrs}h)</span> : null}
            />
            <KPICard label="Efficiency" value={`${kpis.efficiency}%`} color="#2196F3" />
        </>
    )
}

function renderEmployeeKPIs(kpi: EmployeeKPI, currSym: string = '$') {
    if (!kpi) return null;
    return (
        <>
            <KPICard label="Total Expenses" value={`${currSym}${(kpi.totalExpenses || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            <KPICard label="Total Revenue" value={`${currSym}${(kpi.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} color="#0F9D58" />
            <KPICard label="Net Profit" value={`${kpi.netProfit >= 0 ? '' : '-'}${currSym}${Math.abs(kpi.netProfit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} color={kpi.netProfit >= 0 ? "#0F9D58" : "#FF3B3B"} />
            <KPICard label="Avg. Rate/Hr" value={`${currSym}${(kpi.avgRatePerHr || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} color="#2196F3" />
            <KPICard label="Occupancy" value={`${kpi.avgOccupancy}%`} color={kpi.avgOccupancy >= 70 ? "#0F9D58" : "#FF3B3B"} />
            <KPICard label="Efficiency" value={`${kpi.avgEfficiency}%`} color={kpi.avgEfficiency >= 75 ? "#0F9D58" : "#FF3B3B"} />
        </>
    )
}
