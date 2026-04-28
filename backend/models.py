from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Donor(db.Model):
    __tablename__ = 'donors'
    donor_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(20), nullable=False)
    blood_group = db.Column(db.String(5), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    last_donation_date = db.Column(db.Date, nullable=True)
    is_available = db.Column(db.Boolean, default=True)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    donations = db.relationship('DonationHistory', backref='donor', lazy=True)

class BloodRequest(db.Model):
    __tablename__ = 'blood_requests'
    request_id = db.Column(db.Integer, primary_key=True)
    requester_name = db.Column(db.String(100), nullable=False)
    blood_group = db.Column(db.String(5), nullable=False)
    units_needed = db.Column(db.Integer, nullable=False)
    city = db.Column(db.String(100), nullable=False)
    contact = db.Column(db.String(20), nullable=False)
    urgency = db.Column(db.String(20), nullable=False) # critical/high/normal
    status = db.Column(db.String(20), default='pending') # pending/fulfilled/cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    donations = db.relationship('DonationHistory', backref='blood_request', lazy=True)

class DonationHistory(db.Model):
    __tablename__ = 'donation_history'
    history_id = db.Column(db.Integer, primary_key=True)
    donor_id = db.Column(db.Integer, db.ForeignKey('donors.donor_id'), nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey('blood_requests.request_id'), nullable=True)
    donated_on = db.Column(db.DateTime, default=datetime.utcnow)
    units_donated = db.Column(db.Integer, nullable=False)

class Admin(db.Model):
    __tablename__ = 'admins'
    admin_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

class BloodInventory(db.Model):
    __tablename__ = 'blood_inventory'
    inventory_id = db.Column(db.Integer, primary_key=True)
    blood_group = db.Column(db.String(5), unique=True, nullable=False)
    units_available = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
