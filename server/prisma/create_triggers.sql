-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION prevent_transactional_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'LỖI HỆ THỐNG: Không được phép xóa dữ liệu giao dịch khỏi bảng % để phục vụ kiểm toán!', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop existing triggers if they exist and create them fresh
DROP TRIGGER IF EXISTS trg_prevent_delete_orders ON "orders";
CREATE TRIGGER trg_prevent_delete_orders BEFORE DELETE ON "orders" FOR EACH STATEMENT EXECUTE FUNCTION prevent_transactional_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_order_items ON "order_items";
CREATE TRIGGER trg_prevent_delete_order_items BEFORE DELETE ON "order_items" FOR EACH STATEMENT EXECUTE FUNCTION prevent_transactional_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_payments ON "payments";
CREATE TRIGGER trg_prevent_delete_payments BEFORE DELETE ON "payments" FOR EACH STATEMENT EXECUTE FUNCTION prevent_transactional_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_shipments ON "shipments";
CREATE TRIGGER trg_prevent_delete_shipments BEFORE DELETE ON "shipments" FOR EACH STATEMENT EXECUTE FUNCTION prevent_transactional_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_audit_logs ON "audit_logs";
CREATE TRIGGER trg_prevent_delete_audit_logs BEFORE DELETE ON "audit_logs" FOR EACH STATEMENT EXECUTE FUNCTION prevent_transactional_delete();
