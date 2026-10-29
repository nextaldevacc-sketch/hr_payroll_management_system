-- =========================================================================
-- PostgreSQL Triggers: Updated Payslip/Line Lock Triggers and Status Guard
-- =========================================================================

-- 1. Pay Run Status Guard:
-- A pay run can NEVER move from Locked or Paid back to Draft, Calculated or Validated.
CREATE OR REPLACE FUNCTION prevent_locked_pay_run_status_rollback()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('Locked', 'Paid') THEN
            RAISE EXCEPTION 'Cannot delete a pay run that is locked or paid (status: %).', OLD.status;
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.status IN ('Locked', 'Paid') AND NEW.status IN ('Draft', 'Calculated', 'Validated') THEN
        RAISE EXCEPTION 'Cannot change pay run status from % to %. Status flow is irreversible once locked or paid.', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pay_runs_status_guard ON pay_runs;
CREATE TRIGGER trg_pay_runs_status_guard
BEFORE UPDATE OF status OR DELETE ON pay_runs
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_pay_run_status_rollback();

-- 2. Updated Payslip Lock Trigger:
-- Freezes payslips when pay run is Locked or Paid.
-- Allows status transition to 'Paid' during settlement without modifying financial amounts.
CREATE OR REPLACE FUNCTION prevent_locked_payslip_modification()
RETURNS TRIGGER AS $$
DECLARE
    v_pay_run_status VARCHAR(20);
    v_pay_run_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_pay_run_id := OLD.pay_run_id;
    ELSE
        v_pay_run_id := NEW.pay_run_id;
    END IF;

    SELECT status INTO v_pay_run_status
    FROM pay_runs
    WHERE id = v_pay_run_id;

    IF v_pay_run_status = 'Paid' THEN
        RAISE EXCEPTION 'Cannot modify or delete payslip for a locked or paid pay run (status: %). Corrections must be made in a later pay run.', v_pay_run_status;
    END IF;

    IF v_pay_run_status = 'Locked' THEN
        -- Allow status update to 'Paid' if no financial amounts or lines are altered
        IF TG_OP = 'UPDATE' AND NEW.status = 'Paid'
           AND NEW.gross = OLD.gross AND NEW.net = OLD.net AND NEW.basic = OLD.basic
           AND NEW.total_deductions = OLD.total_deductions THEN
            RETURN NEW;
        END IF;

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
BEFORE INSERT OR UPDATE OR DELETE ON payslips
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_payslip_modification();

-- 3. Updated Payslip Lines Lock Trigger:
-- Strictly prevents modifying, deleting, or inserting payslip lines for Locked or Paid pay runs.
CREATE OR REPLACE FUNCTION prevent_locked_payslip_line_modification()
RETURNS TRIGGER AS $$
DECLARE
    v_pay_run_status VARCHAR(20);
    v_payslip_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_payslip_id := OLD.payslip_id;
    ELSE
        v_payslip_id := NEW.payslip_id;
    END IF;

    SELECT pr.status INTO v_pay_run_status
    FROM payslips p
    JOIN pay_runs pr ON pr.id = p.pay_run_id
    WHERE p.id = v_payslip_id;

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
BEFORE INSERT OR UPDATE OR DELETE ON payslip_lines
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_payslip_line_modification();

