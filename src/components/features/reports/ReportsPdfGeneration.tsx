import dayjs from '@/utils/date/dayjs';
import { RequirementReport, TaskReport, EmployeeReport, ReportKPI, EmployeeKPI, TaskReportsResponse } from '../../../services/report';
import { getCurrencySymbol } from '@/utils/format/currencyUtils';
import { formatDecimalHours } from '../../../utils/date/timeFormat';

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
    sessionStatus?: string;
}

// --- Status Colors ---
type RGB = [number, number, number];

const getStatusColor = (status: string): { bg: RGB, text: RGB, label: string } => {
    const s = status?.toLowerCase();
    if (s === 'completed' || s === 'done') return { bg: [232, 245, 233], text: [15, 157, 88], label: 'Completed' };
    if (s === 'in progress' || s === 'in-progress' || s === 'in_progress') return { bg: [227, 242, 253], text: [47, 128, 237], label: 'In Progress' };
    if (s === 'delayed') return { bg: [255, 245, 245], text: [255, 59, 59], label: 'Delayed' };
    if (s === 'review' || s === 'in review' || s === 'in-review') return { bg: [243, 229, 245], text: [156, 39, 176], label: 'In Review' };
    if (s === 'assigned') return { bg: [255, 243, 224], text: [255, 152, 0], label: 'Assigned' };
    if (s === 'draft') return { bg: [245, 245, 245], text: [102, 102, 102], label: 'Draft' };
    return { bg: [245, 245, 245], text: [75, 85, 99], label: status || '-' };
};


// ==========================================================================
// Native jsPDF + jspdf-autotable PDF Generation
// ==========================================================================

// A4 dimensions in mm
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Font sizes in pt
const FONT = {
    title: 14,
    subtitle: 10,
    meta: 7,
    kpiLabel: 7,
    kpiValue: 14,
    tableHead: 7,
    tableBody: 7,
    tableBodySub: 6.5,
    footer: 6,
};

// Colors
const COLOR = {
    black: [17, 17, 17] as RGB,
    dark: [51, 51, 51] as RGB,
    gray: [102, 102, 102] as RGB,
    lightGray: [153, 153, 153] as RGB,
    border: [238, 238, 238] as RGB,
    bgLight: [250, 250, 250] as RGB,
    white: [255, 255, 255] as RGB,
    green: [15, 157, 88] as RGB,
    red: [255, 59, 59] as RGB,
    blue: [33, 150, 243] as RGB,
    orange: [255, 138, 0] as RGB,
    teal: [0, 163, 137] as RGB,
};

type JsPDFInstance = InstanceType<typeof import('jspdf').default>;

// Font name — Manrope is embedded for full Unicode currency symbol support
const PDF_FONT = 'Manrope';

// Load and register Manrope TTF font into jsPDF
async function registerManropeFont(pdf: JsPDFInstance) {
    const [regularBuf, boldBuf] = await Promise.all([
        fetch('/fonts/Manrope-Regular.ttf').then(r => r.arrayBuffer()),
        fetch('/fonts/Manrope-Bold.ttf').then(r => r.arrayBuffer()),
    ]);

    const toBase64 = (buf: ArrayBuffer) => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    };

    pdf.addFileToVFS('Manrope-Regular.ttf', toBase64(regularBuf));
    pdf.addFont('Manrope-Regular.ttf', PDF_FONT, 'normal');

    pdf.addFileToVFS('Manrope-Bold.ttf', toBase64(boldBuf));
    pdf.addFont('Manrope-Bold.ttf', PDF_FONT, 'bold');
}

// --- Header Drawing ---
function drawHeader(pdf: JsPDFInstance, companyName: string, reportTitle: string, generatedDate: string, periodStart: string, periodEnd: string) {
    const y = MARGIN;

    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(FONT.title);
    pdf.setTextColor(...COLOR.black);
    pdf.text(companyName || 'Company Name', MARGIN, y + 5);

    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(FONT.subtitle);
    pdf.setTextColor(...COLOR.black);
    pdf.text(reportTitle, PAGE_W - MARGIN, y + 2, { align: 'right' });

    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(FONT.meta);
    pdf.setTextColor(...COLOR.gray);
    pdf.text(`Generated: ${generatedDate}`, PAGE_W - MARGIN, y + 6, { align: 'right' });
    pdf.text(`Period: ${periodStart} - ${periodEnd}`, PAGE_W - MARGIN, y + 9.5, { align: 'right' });

    const lineY = y + 13;
    pdf.setDrawColor(...COLOR.border);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN, lineY, PAGE_W - MARGIN, lineY);

    return lineY + 4;
}

// --- KPI Cards Drawing ---
function drawKPICards(pdf: JsPDFInstance, kpis: Array<{ label: string; value: string; color?: RGB }>, startY: number): number {
    const count = kpis.length;
    const gap = 3;
    const cardW = (CONTENT_W - gap * (count - 1)) / count;
    const cardH = 16;

    kpis.forEach((kpi, i) => {
        const x = MARGIN + i * (cardW + gap);

        pdf.setFillColor(...COLOR.bgLight);
        pdf.setDrawColor(...COLOR.border);
        pdf.roundedRect(x, startY, cardW, cardH, 2, 2, 'FD');

        pdf.setFont(PDF_FONT, 'normal');
        pdf.setFontSize(FONT.kpiLabel);
        pdf.setTextColor(...COLOR.gray);
        pdf.text(kpi.label.toUpperCase(), x + 3, startY + 5);

        const valStr = String(kpi.value);
        const valFontSize = valStr.length > 12 ? 9 : valStr.length > 8 ? 11 : FONT.kpiValue;
        pdf.setFont(PDF_FONT, 'bold');
        pdf.setFontSize(valFontSize);
        pdf.setTextColor(...(kpi.color || COLOR.black));
        pdf.text(valStr, x + 3, startY + 12);
    });

    return startY + cardH + 5;
}

// --- Footer Drawing ---
function drawFooter(pdf: JsPDFInstance, pageNumber: number, totalPages: number) {
    const y = PAGE_H - MARGIN + 2;
    pdf.setDrawColor(...COLOR.border);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, y - 5, PAGE_W - MARGIN, y - 5);

    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(FONT.footer + 1);
    pdf.setTextColor(...COLOR.black);
    pdf.text('alsonotify', MARGIN, y);

    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(FONT.footer);
    pdf.setTextColor(...COLOR.lightGray);
    pdf.text(`Page ${pageNumber} of ${totalPages}`, PAGE_W - MARGIN, y, { align: 'right' });
}


// ==========================================================================
// Main Report PDF Generator
// ==========================================================================

export async function generateReportPdf(
    fileName: string,
    activeTab: 'requirement' | 'task' | 'member',
    data: RequirementReport[] | TaskReport[] | EmployeeReport[],
    kpis: ReportKPI | EmployeeKPI | TaskReportsResponse['kpi'],
    options: {
        dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
        companyName?: string;
        timezone?: string;
        currency?: string;
    }
) {
    const jsPDF = (await import('jspdf')).default;
    const { default: autoTable } = await import('jspdf-autotable');

    const pdf = new jsPDF('p', 'mm', 'a4');
    await registerManropeFont(pdf);

    const currSym = getCurrencySymbol(options.currency || 'USD');
    const tz = options.timezone || 'Asia/Kolkata';
    const generatedDate = dayjs().tz(tz).format('MMM DD, YYYY');
    const periodStart = options.dateRange?.[0]?.format('MMM DD, YYYY') || 'Start';
    const periodEnd = options.dateRange?.[1]?.format('MMM DD, YYYY') || 'End';

    const reportTitle = activeTab === 'requirement' ? 'Requirements Report' : activeTab === 'task' ? 'Tasks Report' : 'Employees Report';

    // --- Build KPI data ---
    let kpiCards: Array<{ label: string; value: string; color?: RGB }>;

    if (activeTab === 'requirement') {
        const k = kpis as ReportKPI;
        kpiCards = [
            { label: 'Total Requirements', value: String(k.totalRequirements) },
            { label: 'On Time Completed', value: String(k.onTimeCompleted), color: COLOR.green },
            { label: 'In Progress', value: String(k.inProgress) },
            { label: 'Delayed', value: `${k.delayed} (+${formatDecimalHours(k.totalExtraHrs)})`, color: COLOR.red },
            { label: 'Efficiency', value: `${k.efficiency}%`, color: COLOR.blue },
        ];
    } else if (activeTab === 'task') {
        const k = kpis as TaskReportsResponse['kpi'];
        kpiCards = [
            { label: 'Total Tasks', value: String(k.totalTasks) },
            { label: 'On Time Completed', value: String(k.onTimeCompleted), color: COLOR.green },
            { label: 'In Progress', value: String(k.inProgress) },
            { label: 'Delayed', value: `${k.delayed} (+${formatDecimalHours(k.totalExtraHrs)})`, color: COLOR.red },
            { label: 'Efficiency', value: `${k.efficiency}%`, color: COLOR.blue },
        ];
    } else {
        const k = kpis as EmployeeKPI;
        kpiCards = [
            { label: 'Total Expenses', value: `${currSym}${(k.totalExpenses || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
            { label: 'Total Revenue', value: `${currSym}${(k.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: COLOR.green },
            { label: 'Net Profit', value: `${k.netProfit >= 0 ? '' : '-'}${currSym}${Math.abs(k.netProfit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: k.netProfit >= 0 ? COLOR.green : COLOR.red },
            { label: 'Avg. Rate/Hr', value: `${currSym}${(k.avgRatePerHr || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: COLOR.blue },
            { label: 'Occupancy', value: `${k.avgOccupancy}%`, color: k.avgOccupancy >= 70 ? COLOR.green : COLOR.red },
            { label: 'Efficiency', value: `${k.avgEfficiency}%`, color: k.avgEfficiency >= 75 ? COLOR.green : COLOR.red },
        ];
    }

    // Draw first page header + KPIs
    let tableStartY = drawHeader(pdf, options.companyName || '', reportTitle, generatedDate, periodStart, periodEnd);
    tableStartY = drawKPICards(pdf, kpiCards, tableStartY);

    // --- Build table data ---
    let head: string[][];
    const body: Array<Array<string | { content: string; styles?: Record<string, unknown> }>> = [];
    let columnStyles: Record<number, Record<string, unknown>>;

    if (activeTab === 'requirement') {
        head = [['No', 'Requirement', 'Contact Person', 'Timeline', 'Hours Utilization', 'Rev', 'Revenue / P&L', 'Status']];
        columnStyles = {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 28 },
            3: { cellWidth: 22 },
            4: { cellWidth: 28 },
            5: { cellWidth: 12, halign: 'center' },
            6: { cellWidth: 25, halign: 'right' },
            7: { cellWidth: 20, halign: 'center' },
        };
        (data as RequirementReport[]).forEach((row, idx) => {
            const remaining = (row.allottedHrs || 0) - (row.engagedHrs || 0);
            const isBleeding = row.engagedHrs > (row.allottedHrs || 0);
            const hoursText = `${formatDecimalHours(row.engagedHrs || 0)}${(row.allottedHrs || 0) > 0 ? '/' + formatDecimalHours(row.allottedHrs) : ''}\n${isBleeding ? '+' + formatDecimalHours(Math.abs(remaining)) + ' over' : formatDecimalHours(remaining) + ' left'}`;
            const startDate = row.startDate ? dayjs(row.startDate).tz(tz).format('MMM DD') : '-';
            const endDate = row.endDate ? dayjs(row.endDate).tz(tz).format('MMM DD') : '-';
            const isOverdue = row.status !== 'Completed' && row.endDate && dayjs().isAfter(dayjs(row.endDate), 'day');
            const statusInfo = getStatusColor(row.status);

            body.push([
                String(idx + 1),
                `${row.requirement}${row.partner ? '\n' + row.partner : ''}${row.workspaceName ? '\n' + row.workspaceName : ''}${row.type ? '\n[' + row.type + ']' : ''}${row.priority ? ' [' + row.priority + ']' : ''}${row.department ? ' [' + row.department + ']' : ''}`,
                row.manager || 'Unassigned',
                { content: `${startDate}\nto ${endDate}`, styles: isOverdue ? { textColor: COLOR.red } : {} },
                { content: hoursText, styles: isBleeding ? { textColor: COLOR.red } : {} },
                row.revision > 0 ? `v${row.revision + 1}` : '-',
                `${currSym}${(row.revenue || 0).toLocaleString()}\n${row.profit >= 0 ? '+' : ''}${currSym}${(row.profit || 0).toLocaleString()}`,
                { content: statusInfo.label, styles: { textColor: statusInfo.text, fillColor: statusInfo.bg, halign: 'center' as const } },
            ]);
        });
    } else if (activeTab === 'task') {
        head = [['No', 'Task', 'Requirement', 'Leader', 'Assigned', 'Due Date', 'Hours Variance', 'Status']];
        columnStyles = {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30 },
            3: { cellWidth: 22 },
            4: { cellWidth: 22 },
            5: { cellWidth: 18 },
            6: { cellWidth: 28 },
            7: { cellWidth: 20, halign: 'center' },
        };
        (data as TaskReport[]).forEach((row, idx) => {
            const remaining = (row.allottedHrs || 0) - (row.engagedHrs || 0);
            const isBleeding = row.engagedHrs > (row.allottedHrs || 0);
            const hasEstimate = (row.allottedHrs || 0) > 0;
            const isOverdue = row.dueDate && new Date() > new Date(row.dueDate) && row.status !== 'Completed';
            const hoursText = `${formatDecimalHours(row.engagedHrs || 0)}${hasEstimate ? '/' + formatDecimalHours(row.allottedHrs || 0) : ''}\n${hasEstimate ? (isBleeding ? '+' + formatDecimalHours(Math.abs(remaining)) + ' over' : formatDecimalHours(remaining) + ' left') : 'No estimate'}`;
            const statusInfo = getStatusColor(row.status);

            body.push([
                String(idx + 1),
                `${row.task}${row.workspaceName ? '\n' + row.workspaceName : ''}`,
                row.requirement || '-',
                row.leader || '-',
                row.assigned || '-',
                { content: row.dueDate ? dayjs(row.dueDate).format('MMM DD') : '-', styles: isOverdue ? { textColor: COLOR.red, fontStyle: 'bold' } : {} },
                { content: hoursText, styles: isBleeding ? { textColor: COLOR.red } : {} },
                { content: statusInfo.label, styles: { textColor: statusInfo.text, fillColor: statusInfo.bg, halign: 'center' as const } },
            ]);
        });
    } else {
        head = [['No', 'Employee', 'Tasks Performance', 'Load', 'Expenses', 'Revenue', 'Net Profit']];
        columnStyles = {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 35 },
            3: { cellWidth: 18 },
            4: { cellWidth: 22 },
            5: { cellWidth: 22 },
            6: { cellWidth: 25 },
        };
        (data as EmployeeReport[]).forEach((row, idx) => {
            const profitColor = row.profit >= 0 ? COLOR.green : COLOR.red;
            body.push([
                String(idx + 1),
                `${row.member}\n${row.designation || ''} | ${row.department || ''}`,
                `${row.taskStats.assigned} Assigned\nC:${row.taskStats.completed}  P:${row.taskStats.inProgress}  D:${row.taskStats.delayed}`,
                `${row.utilization}%`,
                `${currSym}${(row.expenses || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                `${currSym}${(row.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                { content: `${row.profit >= 0 ? '+' : ''}${currSym}${(row.profit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, styles: { textColor: profitColor, fontStyle: 'bold' } },
            ]);
        });
    }

    let totalPages: number;

    autoTable(pdf, {
        head,
        body,
        startY: tableStartY,
        margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: MARGIN + 8 },
        styles: {
            fontSize: FONT.tableBody,
            cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
            textColor: COLOR.black,
            lineColor: COLOR.border,
            lineWidth: 0.2,
            overflow: 'linebreak',
            font: PDF_FONT,
            valign: 'middle',
        },
        headStyles: {
            fillColor: COLOR.black,
            textColor: COLOR.white,
            fontStyle: 'bold',
            fontSize: FONT.tableHead,
            cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
            halign: 'left',
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251],
        },
        columnStyles,
        didDrawPage: (hookData) => {
            totalPages = pdf.getNumberOfPages();
            if (hookData.pageNumber > 1) {
                drawHeader(pdf, options.companyName || '', reportTitle, generatedDate, periodStart, periodEnd);
            }
        },
        willDrawPage: (hookData) => {
            if (hookData.pageNumber > 1) {
                hookData.settings.startY = MARGIN + 17;
            }
        },
    });

    // Draw footers on all pages
    totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        drawFooter(pdf, i, totalPages);
    }

    pdf.save(fileName);
    return true;
}


// ==========================================================================
// Individual Employee PDF Generator
// ==========================================================================

export async function generateIndividualEmployeePdf(
    fileName: string,
    member: MemberRow,
    worklogs: WorklogRow[],
    options: {
        dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
        companyName?: string;
        timezone?: string;
        currency?: string;
    }
) {
    const jsPDF = (await import('jspdf')).default;
    const { default: autoTable } = await import('jspdf-autotable');

    const pdf = new jsPDF('p', 'mm', 'a4');
    await registerManropeFont(pdf);

    const tz = options.timezone || 'Asia/Kolkata';
    const generatedDate = dayjs().tz(tz).format('MMM DD, YYYY');
    const periodStart = options.dateRange?.[0]?.format('MMM DD, YYYY') || 'Start';
    const periodEnd = options.dateRange?.[1]?.format('MMM DD, YYYY') || 'End';

    let y = drawHeader(pdf, options.companyName || '', 'Employee Performance Report', generatedDate, periodStart, periodEnd);

    // --- Profile Section ---
    const profileH = 18;

    // Avatar circle
    pdf.setFillColor(...COLOR.black);
    pdf.circle(MARGIN + 6, y + profileH / 2, 5, 'F');
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...COLOR.white);
    pdf.text(member.member.charAt(0).toUpperCase(), MARGIN + 6, y + profileH / 2 + 1.5, { align: 'center' });

    // Name & designation/department
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...COLOR.black);
    pdf.text(member.member, MARGIN + 14, y + 6);
    pdf.setFont(PDF_FONT, 'normal');
    pdf.setFontSize(FONT.meta);
    pdf.setTextColor(...COLOR.gray);
    pdf.text(`${member.designation || ''} | ${member.department || ''}`, MARGIN + 14, y + 10);

    // KPI cards (inline)
    const empKpis = [
        { label: 'Total Hours', value: formatDecimalHours(member.totalWorkingHrs) },
        { label: 'Engaged', value: formatDecimalHours(member.actualEngagedHrs) },
        { label: 'Occupancy', value: `${member.utilization}%`, color: member.utilization >= 70 ? COLOR.green : COLOR.red },
        { label: 'Efficiency', value: `${member.efficiency}%`, color: member.efficiency >= 75 ? COLOR.green : member.efficiency >= 50 ? COLOR.blue : COLOR.red },
    ];

    const kpiStartX = MARGIN + 55;
    const kpiCardW = (CONTENT_W - 55 - 6) / 4;
    empKpis.forEach((kpi, i) => {
        const x = kpiStartX + i * (kpiCardW + 2);
        pdf.setFillColor(...COLOR.bgLight);
        pdf.setDrawColor(...COLOR.border);
        pdf.roundedRect(x, y, kpiCardW, profileH, 2, 2, 'FD');

        pdf.setFont(PDF_FONT, 'normal');
        pdf.setFontSize(5.5);
        pdf.setTextColor(...COLOR.gray);
        pdf.text(kpi.label.toUpperCase(), x + 2.5, y + 5);

        pdf.setFont(PDF_FONT, 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(...(kpi.color || COLOR.black));
        pdf.text(kpi.value, x + 2.5, y + 12.5);
    });

    y += profileH + 6;

    // --- Work History Title ---
    pdf.setFont(PDF_FONT, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...COLOR.black);
    pdf.text('WORK HISTORY', MARGIN, y);
    y += 4;

    // --- Work History Table (includes Status column matching UI drawer) ---
    const head = [['Date', 'Task', 'Details', 'Time', 'Status', 'Duration']];
    const body: Array<Array<string | { content: string; styles?: Record<string, unknown> }>> = worklogs.map(log => {
        const statusInfo = log.sessionStatus ? getStatusColor(log.sessionStatus) : null;
        return [
            dayjs(log.date).format('MMM DD'),
            log.task,
            log.details || '-',
            `${log.startTime} - ${log.endTime}`,
            statusInfo
                ? { content: statusInfo.label, styles: { textColor: statusInfo.text, fillColor: statusInfo.bg, halign: 'center' as const } }
                : '-',
            log.engagedTime,
        ];
    });

    if (body.length === 0) {
        body.push([{ content: 'No work history found.', colSpan: 6, styles: { halign: 'center', textColor: COLOR.lightGray } } as unknown as string, '', '', '', '', '']);
    }

    autoTable(pdf, {
        head,
        body,
        startY: y,
        margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: MARGIN + 8 },
        styles: {
            fontSize: FONT.tableBody,
            cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
            textColor: COLOR.black,
            lineColor: COLOR.border,
            lineWidth: 0.2,
            overflow: 'linebreak',
            font: PDF_FONT,
            valign: 'middle',
        },
        headStyles: {
            fillColor: COLOR.black,
            textColor: COLOR.white,
            fontStyle: 'bold',
            fontSize: FONT.tableHead,
            cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251],
        },
        columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 32 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 26 },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
        },
        didDrawPage: (hookData) => {
            if (hookData.pageNumber > 1) {
                drawHeader(pdf, options.companyName || '', 'Employee Performance Report', generatedDate, periodStart, periodEnd);
            }
        },
        willDrawPage: (hookData) => {
            if (hookData.pageNumber > 1) {
                hookData.settings.startY = MARGIN + 17;
            }
        },
    });

    // Draw footers on all pages
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        drawFooter(pdf, i, totalPages);
    }

    pdf.save(fileName);
    return true;
}
