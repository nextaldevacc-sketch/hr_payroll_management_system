/**
 * Helper to append company_visa_id to params or URLSearchParams
 * only when selectedVisaId is present and not 'all'.
 */
export function withVisa(params = {}, selectedVisaId = null) {
  if (params instanceof URLSearchParams) {
    const copy = new URLSearchParams(params);
    if (selectedVisaId && selectedVisaId !== 'all') {
      copy.set('company_visa_id', selectedVisaId);
    } else {
      copy.delete('company_visa_id');
    }
    return copy;
  }

  const result = { ...(params || {}) };
  if (selectedVisaId && selectedVisaId !== 'all') {
    result.company_visa_id = selectedVisaId;
  } else {
    delete result.company_visa_id;
  }
  return result;
}

export default withVisa;

