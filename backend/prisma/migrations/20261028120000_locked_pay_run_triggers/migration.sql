-- =========================================================================
-- PostgreSQL Triggers: Prevent Modifications to Locked or Paid Pay Runs
-- =========================================================================

CREATE OR REPLACE FUNCTION prevent_locked_payslip_modification()
RETURNS TRIGGER AS $$
DECLARE
    v_pay_run_status VARCHAR(20);
BEGIN
    SELECT status INTO v_pay_run_status
    FROM pay_runs
    WHERE id = OLD.pay_run_id;

    IF v_pay_run_status IN ('Locked', 'Paid') THEN
        RAISE EXCEPTION 'Cannot modify or delete payslip for a locked or paid pay run (status: %). Corrections must be made in a later pay run.', v_pay_run_status;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payslips_locked_check ON payslips;
CREATE TRIGGER trg_payslips_locked_check
BEFORE UPDATE OR DELETE ON payslips
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_payslip_modification();

CREATE OR REPLACE FUNCTION prevent_locked_payslip_line_modification()
RETURNS TRIGGER AS $$
DECLARE
    v_pay_run_status VARCHAR(20);
BEGIN
    SELECT pr.status INTO v_pay_run_status
    FROM payslips p
    JOIN pay_runs pr ON pr.id = p.pay_run_id
    WHERE p.id = OLD.payslip_id;

    IF v_pay_run_status IN ('Locked', 'Paid') THEN
        RAISE EXCEPTION 'Cannot modify or delete payslip lines for a locked or paid pay run (status: %). Corrections must be made in a later pay run.', v_pay_run_status;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payslip_lines_locked_check ON payslip_lines;
CREATE TRIGGER trg_payslip_lines_locked_check
BEFORE UPDATE OR DELETE ON payslip_lines
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_payslip_line_modification();
