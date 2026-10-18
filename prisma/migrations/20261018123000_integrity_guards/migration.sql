-- ป้องกันค่าที่ผิดกติกาแม้มีการแก้ฐานข้อมูลนอก API
CREATE TRIGGER product_insert_guard BEFORE INSERT ON "Product"
WHEN NEW.quantity < 0 OR NEW.price < 0 OR NEW.minStock < 0
BEGIN SELECT RAISE(ABORT, 'invalid product values'); END;
CREATE TRIGGER product_update_guard BEFORE UPDATE ON "Product"
WHEN NEW.quantity < 0 OR NEW.price < 0 OR NEW.minStock < 0
BEGIN SELECT RAISE(ABORT, 'invalid product values'); END;
CREATE TRIGGER movement_insert_guard BEFORE INSERT ON "StockMovement"
WHEN NEW.quantity <= 0 OR NEW.beforeQty < 0 OR NEW.afterQty < 0 OR NEW.type NOT IN ('IN','OUT','ADJUST') OR NEW.quantity != abs(NEW.afterQty - NEW.beforeQty)
BEGIN SELECT RAISE(ABORT, 'invalid stock movement'); END;
CREATE TRIGGER user_insert_guard BEFORE INSERT ON "User"
WHEN NEW.role NOT IN ('ADMIN','STAFF')
BEGIN SELECT RAISE(ABORT, 'invalid user role'); END;
CREATE TRIGGER user_update_guard BEFORE UPDATE ON "User"
WHEN NEW.role NOT IN ('ADMIN','STAFF')
BEGIN SELECT RAISE(ABORT, 'invalid user role'); END;
