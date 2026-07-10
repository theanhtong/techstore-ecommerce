DELETE FROM users WHERE email IN ('admin@techstore.com', 'staff@techstore.com');

INSERT INTO users (id, email, password, name, role, "isActive", "emailVerifiedAt", "createdAt", "updatedAt")
VALUES 
('d5d71c4c-47bc-4f7f-8e7c-8e0f9b6a1234', 'admin@techstore.com', '$2b$10$6xv5XzL1qo7j2SvEzC9ssOS3kh2fodryGO3QxKGRR8AvXqb8Mtasa', 'System Admin', 'ADMIN', true, NOW(), NOW(), NOW()),
('d5d71c4c-47bc-4f7f-8e7c-8e0f9b6a5678', 'staff@techstore.com', '$2b$10$0EdxJS3FiCQxn4QL35hPM.oS0MgHDd4kqZh4jU7/lJr1ZX9vUm2qm', 'Store Staff', 'STAFF', true, NOW(), NOW(), NOW());
