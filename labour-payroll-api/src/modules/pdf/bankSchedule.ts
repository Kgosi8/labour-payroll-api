import type {
  Content,
  TableCell,
  TDocumentDefinitions,
} from "pdfmake/interfaces";
import { formatRand } from "../../utils/money";
import { renderPdf } from "./render";
import { monthLabel } from "./references";

export interface BankScheduleRow {
  workerName: string;
  accountHolder: string;
  bankName: string;
  accountNumber: string; // full number: the bank needs it
  branchCode: string;
  accountType: string;
  reference: string;
  amountCents: number;
}

export interface BankScheduleData {
  companyName: string;
  month: string; // YYYY-MM
  generatedAt: string; // pre-formatted
  generatedBy: string;
  rows: BankScheduleRow[]; // already sorted
  totalCents: number;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function signatureBox(label: string): Content {
  return {
    stack: [
      {
        canvas: [
          { type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.7 },
        ],
      },
      { text: label, fontSize: 8, color: "#555555", margin: [0, 3, 0, 0] },
    ],
  };
}

export function bankScheduleDefinition(
  d: BankScheduleData,
): TDocumentDefinitions {
  const th = (
    text: string,
    alignment: "left" | "right" = "left",
  ): TableCell => ({
    text,
    bold: true,
    fontSize: 8,
    alignment,
    fillColor: "#eeeeee",
  });

  const body: TableCell[][] = [
    [
      th("#"),
      th("Worker"),
      th("Account holder"),
      th("Bank"),
      th("Account number"),
      th("Branch code"),
      th("Type"),
      th("Reference"),
      th("Amount", "right"),
    ],
    ...d.rows.map((r, i): TableCell[] => [
      String(i + 1),
      r.workerName,
      r.accountHolder,
      r.bankName,
      r.accountNumber,
      r.branchCode,
      cap(r.accountType),
      r.reference,
      { text: formatRand(r.amountCents), alignment: "right" },
    ]),
    [
      {
        text: `TOTAL (${d.rows.length} payment${d.rows.length === 1 ? "" : "s"})`,
        colSpan: 8,
        bold: true,
        alignment: "right",
      },
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { text: formatRand(d.totalCents), bold: true, alignment: "right" },
    ],
  ];

  const lastRow = body.length - 1;

  return {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [28, 62, 28, 44],
    defaultStyle: { font: "Roboto", fontSize: 8.5 },
    info: { title: `Bank payment schedule ${d.month}`, author: d.companyName },
    header: {
      margin: [28, 22, 28, 0],
      columns: [
        { text: d.companyName, bold: true, fontSize: 13 },
        {
          text: `Bank payment schedule – ${monthLabel(d.month)}`,
          alignment: "right",
          fontSize: 11,
        },
      ],
    },
    footer: (currentPage, pageCount) => ({
      margin: [28, 14, 28, 0],
      columns: [
        {
          text: `${d.companyName} · Bank payment schedule · Confidential`,
          fontSize: 7,
          color: "#666666",
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: "right",
          fontSize: 7,
          color: "#666666",
        },
      ],
    }),
    content: [
      {
        columns: [
          { text: [{ text: "Payments: ", bold: true }, String(d.rows.length)] },
          {
            text: [
              { text: "Total to pay: ", bold: true },
              formatRand(d.totalCents),
            ],
          },
          {
            text: [
              { text: "Generated: ", bold: true },
              `${d.generatedAt} by ${d.generatedBy}`,
            ],
            alignment: "right",
          },
        ],
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: [16, "*", "*", 66, 76, 48, 52, 108, 64],
          body,
        },
        layout: {
          hLineWidth: (i) => (i === 0 || i === 1 || i === lastRow ? 0.9 : 0.3),
          vLineWidth: () => 0,
          hLineColor: () => "#999999",
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
      },
      {
        unbreakable: true,
        margin: [0, 34, 0, 0],
        stack: [
          { text: "Bank authorisation", bold: true, margin: [0, 0, 0, 22] },
          {
            columns: [
              signatureBox("Authorised by (full name)"),
              signatureBox("Signature"),
              signatureBox("Date"),
            ],
            columnGap: 30,
          },
        ],
      },
    ],
  };
}

export const renderBankSchedule = (d: BankScheduleData) =>
  renderPdf(bankScheduleDefinition(d));
