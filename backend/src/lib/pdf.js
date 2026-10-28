/**
 * PDF Generator helper for payslips and compliance certificates
 */
export async function generatePayslipPdf({ payslip, company, employee }) {
  // Return stub PDF buffer or formatted payload
  const html = `
    <html>
      <head><title>Payslip - ${employee?.name}</title></head>
      <body>
        <h1>${company?.name || 'Nextal HR'}</h1>
        <h2>Payslip for ${employee?.name} (${employee?.employee_code})</h2>
        <p>Period: ${payslip?.pay_period || 'Current'}</p>
        <p>Gross: AED ${payslip?.gross_salary || '0.00'}</p>
        <p>Net: AED ${payslip?.net_salary || '0.00'}</p>
      </body>
    </html>
  `;
  return Buffer.from(html, 'utf-8');
}

export default {
  generatePayslipPdf,
};
