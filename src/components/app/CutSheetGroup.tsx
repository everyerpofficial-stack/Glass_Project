/* =====================================================================
   Work order cut sheet — one product group.

   The cut sheet is a seventeen-column factory document: entered size,
   fabrication counts, chargeable size, amount and remark for every piece of
   glass in the order. It is rendered in two places (the invoice detail modal
   and the /work-order page) from the same work order, so the markup lives
   here rather than being kept in step by hand in both.

   On a desktop and on every printout it is the table it has always been. On a
   phone that table is roughly three screens wide, and the columns past AREA
   were simply off the edge — the reason this component also renders one card
   per piece below `md`. Both views are always in the DOM; `.doc-table-view`
   and `.doc-card-view` in styles.css decide which one the screen (or the
   printer) gets.
   ===================================================================== */

import type { ReactNode } from "react";

import { nf } from "@/lib/gq";

type CutRow = {
  sr: any;
  freqLabel: string;
  l1: any;
  l2: any;
  heightMM: any;
  widthMM: any;
  qty: number;
  actArea: number;
  hole: number;
  cutOut: number;
  bigHole: number;
  bigCutout: number;
  csk: number;
  chgHeightMM: any;
  chgWidthMM: any;
  chgArea: number;
  amount: number;
  remark: string;
};

/* A label/value pair inside a piece card. */
function CardField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="font-mono text-[13px] font-semibold text-black">{value}</div>
    </div>
  );
}

export function CutSheetGroup({
  group,
  index,
  isMM,
  isFreqOn,
  isSqft,
  areaUnitLabel,
  totals,
}: {
  group: any;
  index: number;
  isMM: boolean;
  isFreqOn: boolean;
  isSqft: boolean;
  areaUnitLabel: string;
  totals?: any;
}) {
  const pieces: any[] = group?.pieces || [];

  const rows: CutRow[] = pieces.map((piece: any, idx: number) => {
    const qty = Number(piece.qty) || 1;
    const actArea = Number(isSqft ? (piece.areaFt ?? piece.area) : piece.area) || 0;
    const chgArea =
      Number(isSqft ? (piece.chgAreaFt ?? piece.chgArea ?? actArea) : (piece.chgArea ?? actArea)) ||
      0;

    /* A piece saved before amounts were stored per piece falls back to its
       line in the document totals. */
    let amount = Number(piece.amount) || 0;
    if (!amount && totals?.lines) {
      const matchedLine =
        totals.lines.find((l: any) => l.lMM === piece.heightMM && l.wMM === piece.widthMM) ||
        totals.lines[piece.layerIdx ?? idx];
      if (matchedLine?.amount) {
        amount = Number(matchedLine.amount) / (matchedLine.qty || 1);
      }
    }

    return {
      sr: piece.sr,
      freqLabel: Number(piece.freq) === 16 ? "1/16" : "1/8",
      l1: piece.l1,
      l2: piece.l2,
      heightMM: piece.heightMM,
      widthMM: piece.widthMM,
      qty,
      actArea,
      hole: Number(piece.hole) || 0,
      cutOut: Number(piece.cutOut) || 0,
      bigHole: Number(piece.bigHole) || 0,
      bigCutout: Number(piece.bigCutout) || 0,
      csk: Number(piece.csk) || 0,
      chgHeightMM: piece.chgHeightMM || piece.heightMM,
      chgWidthMM: piece.chgWidthMM || piece.widthMM,
      chgArea,
      amount,
      /* F001 / H001 are the sticker's own codes, not something a fabricator
         wrote on the order. */
      remark: piece.remark && !/^[FH]\d{3}$/.test(piece.remark) ? piece.remark : "",
    };
  });

  const grpPcs = rows.reduce((sum, r) => sum + r.qty, 0);
  const grpActualArea = rows.reduce((sum, r) => sum + r.actArea, 0);
  const grpChargeArea = rows.reduce((sum, r) => sum + r.chgArea, 0);
  const grpAmount = rows.reduce((sum, r) => sum + r.amount, 0);
  const bannerSqm = pieces.reduce((sum: number, p: any) => sum + (Number(p.area) || 0), 0);

  return (
    <div className="border border-black overflow-hidden mb-4">
      {/* Product Banner Header */}
      <div className="bg-gray-100 border-b border-black px-3 py-1.5 font-bold text-[11px] uppercase flex flex-wrap items-center justify-between gap-x-2">
        <span>
          Item {index + 1}: {group.title}
        </span>
        <span className="text-[10px] font-mono font-normal whitespace-nowrap">
          {pieces.length} Pcs • {nf(bannerSqm, 3)} SQM
        </span>
      </div>

      {/* ── Desktop and print: the full cut sheet table ───────────────────── */}
      <div className="doc-table-view overflow-x-auto print:overflow-visible">
        <table
          className="w-full text-[10px] border-collapse"
          style={{ minWidth: isMM ? "750px" : "920px" }}
        >
          <thead>
            <tr className="bg-gray-100 border-b border-black font-bold text-[9px] uppercase text-black text-center">
              <th rowSpan={2} className="border border-gray-400 px-1.5 py-1 text-center w-8">
                SR NO
              </th>
              {!isMM && isFreqOn && (
                <th rowSpan={2} className="border border-gray-400 px-1.5 py-1 text-center w-10">
                  FREQ
                </th>
              )}
              {!isMM && (
                <>
                  <th rowSpan={2} className="border border-gray-400 px-1.5 py-1 text-center w-12">
                    <div>L1 IN</div>
                    <div className="text-[7.5px] font-normal normal-case">(INCH)</div>
                  </th>
                  <th rowSpan={2} className="border border-gray-400 px-1.5 py-1 text-center w-12">
                    <div>L2 IN</div>
                    <div className="text-[7.5px] font-normal normal-case">(INCH)</div>
                  </th>
                </>
              )}
              <th colSpan={4} className="border border-gray-400 px-1.5 py-1 text-center">
                ACTUAL SIZE (ENTER)
              </th>
              <th rowSpan={2} className="border border-gray-400 px-1 py-1 text-center w-9">
                HOLE
              </th>
              <th rowSpan={2} className="border border-gray-400 px-1 py-1 text-center w-11">
                CUT OUT
              </th>
              <th rowSpan={2} className="border border-gray-400 px-1 py-1 text-center w-10">
                <div>BIG</div>
                <div>HOLE</div>
              </th>
              <th rowSpan={2} className="border border-gray-400 px-1 py-1 text-center w-11">
                <div>BIG</div>
                <div>CUT OUT</div>
              </th>
              <th rowSpan={2} className="border border-gray-400 px-1 py-1 text-center w-9">
                CSK
              </th>
              <th colSpan={4} className="border border-gray-400 px-1.5 py-1 text-center">
                CHARGEABLE SIZE (MM)
              </th>
              <th rowSpan={2} className="border border-gray-400 px-1.5 py-1 text-right w-16">
                AMOUNT
              </th>
              <th rowSpan={2} className="border border-gray-400 px-1.5 py-1 text-left w-16">
                REMARK
              </th>
            </tr>
            <tr className="bg-gray-100 border-b border-black font-bold text-[9px] uppercase text-black text-center">
              <th className="border border-gray-400 px-1 py-0.5 text-center w-11">
                <div>HEIGHT</div>
                <div className="text-[7.5px] font-normal normal-case">(MM)</div>
              </th>
              <th className="border border-gray-400 px-1 py-0.5 text-center w-11">
                <div>WIDTH</div>
                <div className="text-[7.5px] font-normal normal-case">(MM)</div>
              </th>
              <th className="border border-gray-400 px-1 py-0.5 text-center w-8">PCS</th>
              <th className="border border-gray-400 px-1 py-0.5 text-center w-12">
                <div>AREA</div>
                <div className="text-[7.5px] font-normal normal-case">({areaUnitLabel})</div>
              </th>

              <th className="border border-gray-400 px-1 py-0.5 text-center w-11">
                <div>HEIGHT</div>
              </th>
              <th className="border border-gray-400 px-1 py-0.5 text-center w-11">
                <div>WIDTH</div>
              </th>
              <th className="border border-gray-400 px-1 py-0.5 text-center w-8">PCS</th>
              <th className="border border-gray-400 px-1 py-0.5 text-center w-12">
                <div>AREA</div>
                <div className="text-[7.5px] font-normal normal-case">({areaUnitLabel})</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-b border-gray-300 hover:bg-gray-50">
                <td className="border border-gray-300 px-1.5 py-1 text-center font-bold">{r.sr}</td>
                {!isMM && isFreqOn && (
                  <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">
                    {r.freqLabel}
                  </td>
                )}
                {!isMM && (
                  <>
                    <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">
                      {r.l1 || "—"}
                    </td>
                    <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">
                      {r.l2 || "—"}
                    </td>
                  </>
                )}
                {/* ACTUAL SIZE */}
                <td className="border border-gray-300 px-1.5 py-1 text-center font-mono font-semibold">
                  {r.heightMM}
                </td>
                <td className="border border-gray-300 px-1.5 py-1 text-center font-mono font-semibold">
                  {r.widthMM}
                </td>
                <td className="border border-gray-300 px-1.5 py-1 text-center font-bold">
                  {r.qty}
                </td>
                <td className="border border-gray-300 px-1.5 py-1 text-right font-mono">
                  {nf(r.actArea, 3)}
                </td>

                {/* FABRICATION */}
                <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">
                  {r.hole > 0 ? r.hole : ""}
                </td>
                <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">
                  {r.cutOut > 0 ? r.cutOut : ""}
                </td>
                <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">
                  {r.bigHole > 0 ? r.bigHole : ""}
                </td>
                <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">
                  {r.bigCutout > 0 ? r.bigCutout : ""}
                </td>
                <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">
                  {r.csk > 0 ? r.csk : ""}
                </td>

                {/* CHARGEABLE SIZE */}
                <td className="border border-gray-300 px-1.5 py-1 text-center font-mono text-gray-700">
                  {r.chgHeightMM}
                </td>
                <td className="border border-gray-300 px-1.5 py-1 text-center font-mono text-gray-700">
                  {r.chgWidthMM}
                </td>
                <td className="border border-gray-300 px-1.5 py-1 text-center">{r.qty}</td>
                <td className="border border-gray-300 px-1.5 py-1 text-right font-mono font-semibold">
                  {nf(r.chgArea, 3)}
                </td>

                {/* AMOUNT */}
                <td className="border border-gray-300 px-1.5 py-1 text-right font-mono font-bold">
                  {r.amount > 0 ? nf(r.amount) : "—"}
                </td>

                {/* REMARK */}
                <td className="border border-gray-300 px-1.5 py-1 text-left text-[9px]">
                  {r.remark}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t border-black font-bold">
              <td
                colSpan={isMM ? 3 : isFreqOn ? 6 : 5}
                className="border border-gray-400 px-2 py-1 text-right"
              >
                Subtotal (Item {index + 1})
              </td>
              <td className="border border-gray-400 px-1.5 py-1 text-center font-bold">{grpPcs}</td>
              <td className="border border-gray-400 px-1.5 py-1 text-right font-mono">
                {nf(grpActualArea, 3)}
              </td>
              <td colSpan={5} className="border border-gray-400 px-1 py-1"></td>
              <td colSpan={2} className="border border-gray-400 px-1 py-1"></td>
              <td className="border border-gray-400 px-1.5 py-1 text-center font-bold">{grpPcs}</td>
              <td className="border border-gray-400 px-1.5 py-1 text-right font-mono">
                {nf(grpChargeArea, 3)}
              </td>
              <td className="border border-gray-400 px-1.5 py-1 text-right font-mono font-bold">
                {grpAmount > 0 ? nf(grpAmount) : "—"}
              </td>
              <td className="border border-gray-400 px-1 py-1"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Phone: the same pieces, one card each ─────────────────────────── */}
      <div className="doc-card-view divide-y divide-gray-300 bg-white">
        {rows.map((r, idx) => {
          const fabrication = [
            { label: "Hole", value: r.hole },
            { label: "Cut out", value: r.cutOut },
            { label: "Big hole", value: r.bigHole },
            { label: "Big cut out", value: r.bigCutout },
            { label: "CSK", value: r.csk },
          ].filter((f) => f.value > 0);

          return (
            <div key={idx} className="p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="rounded bg-black px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    SR {r.sr}
                  </span>
                  {!isMM && isFreqOn && (
                    <span className="font-mono text-[10px] text-gray-600">FREQ {r.freqLabel}</span>
                  )}
                </span>
                <span className="font-mono text-[13px] font-bold text-black">
                  {r.amount > 0 ? nf(r.amount) : "—"}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                {!isMM && (
                  <CardField label="L1 / L2 (inch)" value={`${r.l1 || "—"} / ${r.l2 || "—"}`} />
                )}
                <CardField label="Pcs" value={r.qty} />
                <CardField label="Actual size (mm)" value={`${r.heightMM} × ${r.widthMM}`} />
                <CardField label={`Actual area (${areaUnitLabel})`} value={nf(r.actArea, 3)} />
                <CardField
                  label="Chargeable size (mm)"
                  value={`${r.chgHeightMM} × ${r.chgWidthMM}`}
                />
                <CardField label={`Chargeable area (${areaUnitLabel})`} value={nf(r.chgArea, 3)} />
              </div>

              {fabrication.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {fabrication.map((f) => (
                    <span
                      key={f.label}
                      className="rounded border border-gray-400 bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black"
                    >
                      {f.label} {f.value}
                    </span>
                  ))}
                </div>
              )}

              {r.remark && (
                <div className="mt-2 text-[11px] text-black">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
                    Remark:{" "}
                  </span>
                  {r.remark}
                </div>
              )}
            </div>
          );
        })}

        <div className="border-t border-black bg-gray-100 p-2.5">
          <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase text-black">
            <span>Subtotal (Item {index + 1})</span>
            <span className="font-mono">{grpAmount > 0 ? nf(grpAmount) : "—"}</span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-gray-700">
            {grpPcs} Pcs • Actual {nf(grpActualArea, 3)} • Chargeable {nf(grpChargeArea, 3)}{" "}
            {areaUnitLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
