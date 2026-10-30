-- Migration: Final Settlement Lock Trigger
-- Ensures that once a final settlement is Approved or Paid, its financial snapshot and calculations cannot be altered or deleted.

CREATE OR REPLACE FUNCTION trg_prevent_approved_final_settlement_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('Approved', 'Paid') THEN
            RAISE EXCEPTION 'Cannot delete final settlement in % status. It is frozen against modification.', OLD.status;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Allow state transition from Approved to Paid
        IF OLD.status = 'Approved' AND NEW.status = 'Paid' THEN
            RETURN NEW;
        END IF;

        -- If already Approved or Paid, block any modification to monetary fields, snapshot or status regression
        IF OLD.status IN ('Approved', 'Paid') THEN
            IF NEW.status IN ('Draft', 'Prepared', 'Validated') THEN
                RAISE EXCEPTION 'Cannot regress final settlement status from % back to %.', OLD.status, NEW.status;
            END IF;
            IF NEW.salary_due <> OLD.salary_due OR
               NEW.gratuity <> OLD.gratuity OR
               NEW.leave_encashment <> OLD.leave_encashment OR
               NEW.leave_encashment_days <> OLD.leave_encashment_days OR
               NEW.notice_recovery <> OLD.notice_recovery OR
               NEW.loan_recovery <> OLD.loan_recovery OR
               NEW.training_recovery <> OLD.training_recovery OR
               NEW.clearance_recovery <> OLD.clearance_recovery OR
               NEW.other_recovery <> OLD.other_recovery OR
               NEW.net_payable <> OLD.net_payable OR
               (OLD.snapshot IS NOT NULL AND NEW.snapshot::text <> OLD.snapshot::text) THEN
                RAISE EXCEPTION 'Cannot modify financial snapshot of approved or paid final settlement.';
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_final_settlements_frozen ON final_settlements;
CREATE TRIGGER trg_final_settlements_frozen
BEFORE UPDATE OR DELETE ON final_settlements
FOR EACH ROW
EXECUTE FUNCTION trg_prevent_approved_final_settlement_modification();

