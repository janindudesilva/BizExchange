CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_seller_profiles_user_id ON seller_profiles(user_id);
CREATE INDEX idx_seller_profiles_verification_status ON seller_profiles(verification_status);

CREATE INDEX idx_businesses_seller_id ON businesses(seller_id);
CREATE INDEX idx_businesses_category_id ON businesses(category_id);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_location ON businesses(location);
CREATE INDEX idx_businesses_asking_price ON businesses(asking_price);

CREATE INDEX idx_business_financials_business_id ON business_financials(business_id);

CREATE INDEX idx_business_images_business_id ON business_images(business_id);
CREATE INDEX idx_business_documents_business_id ON business_documents(business_id);

CREATE INDEX idx_inquiries_business_id ON inquiries(business_id);
CREATE INDEX idx_inquiries_buyer_id ON inquiries(buyer_id);
CREATE INDEX idx_inquiries_seller_id ON inquiries(seller_id);

CREATE INDEX idx_messages_inquiry_id ON messages(inquiry_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

CREATE INDEX idx_offers_business_id ON offers(business_id);
CREATE INDEX idx_offers_buyer_id ON offers(buyer_id);
CREATE INDEX idx_offers_seller_id ON offers(seller_id);

CREATE INDEX idx_deals_business_id ON deals(business_id);
CREATE INDEX idx_deals_buyer_id ON deals(buyer_id);
CREATE INDEX idx_deals_seller_id ON deals(seller_id);
CREATE INDEX idx_deals_status ON deals(status);

CREATE INDEX idx_payments_deal_id ON payments(deal_id);
CREATE INDEX idx_payments_status ON payments(status);

CREATE INDEX idx_saved_businesses_buyer_id ON saved_businesses(buyer_id);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);