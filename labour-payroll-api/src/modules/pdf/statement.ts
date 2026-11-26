import type {
  Content,
  TableCell,
  TDocumentDefinitions,
} from "pdfmake/interfaces";
import { formatRand } from "../../utils/money";

import { renderPdf } from "./render";
import { monthLabel } from "./references";

export interface StatementLine {
  completedOn: string; // pre-formatted
  projectName: string;
  standNumber: string;
  positionName: string;
  positionSharePct: string; // e.g. '20%'
  amountCents: number;
}

export interface StatementData {
  companyName: string;
  month: string; // YYYY-MM
  statementNo: string;
  workerName: string;
  workerRef: string;
  generatedOn: string;
  lines: StatementLine[];
  totalCents: number;
  bankName: string;
  accountLast4: string;
  reference: string;
}

function statementContent(d: StatementData, first: boolean): Content[] {
  const th = (
    text: string,
    alignment: "left" | "right" = "left",
  ): TableCell => ({
    text,
    bold: true,
    fontSize: 8.5,
    alignment,
    fillColor: "#eeeeee",
  });
  const label = (k: string, v: string): Content => ({
    text: [
      { text: `${k}: `, color: "#666666" },
      { text: v, bold: true },
    ],
    margin: [0, 0, 0, 3],
  });

  const body: TableCell[][] = [
    [
      th("Completed"),
      th("Project"),
      th("Stand no."),
      th("Position"),
      th("Position share", "right"),
      th("Your amount", "right"),
    ],
    ...d.lines.map((l): TableCell[] => [
      l.completedOn,
      l.projectName,
      l.standNumber,
      l.positionName,
      { text: l.positionSharePct, alignment: "right" },
      { text: formatRand(l.amountCents), alignment: "right" },
    ]),
  ];
  const lastRow = body.length - 1;

  return [
    {
      text: d.companyName,
      bold: true,
      fontSize: 16,
      pageBreak: first ? undefined : "before",
    },
    {
      text: `Salary statement – ${monthLabel(d.month)}`,
      fontSize: 12,
      margin: [0, 2, 0, 14],
    },
    {
      columns: [
        {
          stack: [
            label("Worker", d.workerName),
            label("Worker ref", d.workerRef),
          ],
        },
        {
          stack: [
            label("Statement no.", d.statementNo),
            label("Date", d.generatedOn),
          ],
          alignment: "right",
        },
      ],
      margin: [0, 0, 0, 10],
    },
    { text: "Houses completed", bold: true, margin: [0, 6, 0, 5] },
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [62, "*", 50, 70, 62, 72],
        body,
      },
      layout: {
        hLineWidth: (i) =>
          i === 0 || i === 1 || i === lastRow + 1 ? 0.9 : 0.3,
        vLineWidth: () => 0,
        hLineColor: () => "#999999",
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
    },
    {
      columns: [
        { text: `Houses completed: ${d.lines.length}`, bold: true },
        {
          text: `Total payable: ${formatRand(d.totalCents)}`,
          bold: true,
          fontSize: 12,
          alignment: "right",
        },
      ],
      margin: [0, 10, 0, 18],
    },
    {
      unbreakable: true,
      stack: [
        { text: "Payment details", bold: true, margin: [0, 0, 0, 5] },
        label("Paid into", `${d.bankName}, account ending ${d.accountLast4}`),
        label("Payment reference", d.reference),
        {
          margin: [0, 30, 0, 0],
          columns: [
            {
              stack: [
                {
                  canvas: [
                    {
                      type: "line",
                      x1: 0,
                      y1: 0,
                      x2: 180,
                      y2: 0,
                      lineWidth: 0.7,
                    },
                  ],
                },
                {
                  text: "Received by (signature)",
                  fontSize: 8,
                  color: "#555555",
                  margin: [0, 3, 0, 0],
                },
              ],
            },
            {
              stack: [
                {
                  canvas: [
                    {
                      type: "line",
                      x1: 0,
                      y1: 0,
                      x2: 110,
                      y2: 0,
                      lineWidth: 0.7,
                    },
                  ],
                },
                {
                  text: "Date",
                  fontSize: 8,
                  color: "#555555",
                  margin: [0, 3, 0, 0],
                },
              ],
            },
          ],
          columnGap: 30,
        },
      ],
    },
  ];
}

export function statementsDefinition(
  items: StatementData[],
): TDocumentDefinitions {
  const company = items[0]?.companyName ?? "";
  return {
    pageSize: "A4",
    pageMargins: [40, 44, 40, 44],
    defaultStyle: { font: "Roboto", fontSize: 9.5 },
    info: {
      title:
        items.length === 1
          ? `Salary statement ${items[0].statementNo}`
          : "Salary statements",
      author: company,
    },
    footer: {
      text: `${company} · Salary statement · Confidential`,
      alignment: "center",
      fontSize: 7,
      color: "#666666",
      margin: [0, 14, 0, 0],
    },
    content: items.flatMap((d, i) => statementContent(d, i === 0)),
  };
}

export const renderStatements = (items: StatementData[]) =>
  renderPdf(statementsDefinition(items));
