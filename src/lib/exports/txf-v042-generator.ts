import type { TaxExportPackage, ScheduleCRefNumber } from './taxExportPackage';
import { formatCents } from './rounding';

export type TxfFlavor = 'turbotax' | 'hrblock';

export function generateTXFv042(input: {
  pkg: TaxExportPackage;
  flavor: TxfFlavor;
  appVersion: string;
}): { filename: string; content: string } {
  const { pkg, flavor, appVersion } = input;

  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const yyyy = String(today.getFullYear());
  const exportDate = `${mm}/${dd}/${yyyy}`;

  const headerA =
    flavor === 'turbotax'
      ? `AGigLedger ${appVersion} (TurboTax Export)`
      : `AGigLedger ${appVersion} (H&R Block Export)`;

  const lines: string[] = [];
  lines.push('V042');
  lines.push(headerA);
  lines.push(`D${exportDate}`);
  lines.push('^');

  const c1 = 'C1';

  const pushFormat1 = (ref: ScheduleCRefNumber, amount: number) => {
    if (amount === 0) return;
    lines.push('TS');
    lines.push(`N${ref}`);
    lines.push(c1);
    lines.push('L1');
    lines.push(`$${formatCents(amount)}`);
    lines.push('^');
  };

  const pushOtherExpense = (lineNo: number, desc: string, amount: number) => {
    if (amount === 0) return;
    lines.push('TS');
    lines.push('N302');
    lines.push(c1);
    lines.push(`L${lineNo}`);
    lines.push(`$${formatCents(amount)}`);
    lines.push(`P${desc.slice(0, 60)}`);
    lines.push('^');
  };

  pushFormat1(293, pkg.scheduleC.grossReceipts);

  if (pkg.scheduleC.returnsAllowances !== 0) {
    pushFormat1(296, -Math.abs(pkg.scheduleC.returnsAllowances));
  }

  if (pkg.scheduleC.cogs !== 0) {
    pushFormat1(295, -Math.abs(pkg.scheduleC.cogs));
  }

  if (pkg.scheduleC.otherIncome !== 0) {
    pushFormat1(303, Math.abs(pkg.scheduleC.otherIncome));
  }

  for (const [key, value] of Object.entries(pkg.scheduleC.expenseTotalsByScheduleCRefNumber)) {
    const ref = Number(key) as ScheduleCRefNumber;
    if (ref === 293 || ref === 296 || ref === 295 || ref === 303 || ref === 302) {
      continue;
    }
    const amt = value || 0;
    if (amt !== 0) {
      pushFormat1(ref, -Math.abs(amt));
    }
  }

  let otherLine = 1;
  for (const item of pkg.scheduleC.otherExpensesBreakdown) {
    pushOtherExpense(otherLine, item.name, -Math.abs(item.amount));
    otherLine += 1;
  }

  const filename =
    flavor === 'turbotax'
      ? `gigledger_turbotax_${pkg.metadata.taxYear}.txf`
      : `gigledger_hrblock_${pkg.metadata.taxYear}.txf`;

  return { filename, content: lines.join('\n') };
}
