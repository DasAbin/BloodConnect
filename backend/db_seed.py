from models import db, Admin, BloodInventory, Donor
from werkzeug.security import generate_password_hash
from datetime import date

def seed_db():
    # Admin
    if not Admin.query.filter_by(username='admin').first():
        admin = Admin(username='admin', password_hash=generate_password_hash('admin123'))
        db.session.add(admin)
    
    # Blood Inventory
    blood_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    for bg in blood_groups:
        if not BloodInventory.query.filter_by(blood_group=bg).first():
            inventory = BloodInventory(blood_group=bg, units_available=0)
            db.session.add(inventory)
            
    # Sample Donors
    if Donor.query.count() == 0:
        donors = [
            Donor(name='John Doe', age=30, gender='Male', blood_group='O+', phone='1234567890', city='New York', last_donation_date=date(2023, 1, 15), is_available=True),
            Donor(name='Jane Smith', age=28, gender='Female', blood_group='A-', phone='0987654321', city='Los Angeles', last_donation_date=date(2023, 5, 20), is_available=True),
            Donor(name='Robert Brown', age=35, gender='Male', blood_group='B+', phone='5551234567', city='Chicago', last_donation_date=date(2022, 11, 10), is_available=False),
            Donor(name='Emily Davis', age=25, gender='Female', blood_group='AB+', phone='4449876543', city='Houston', last_donation_date=date(2023, 8, 5), is_available=True),
            Donor(name='Michael Wilson', age=40, gender='Male', blood_group='O-', phone='3335557777', city='Phoenix', last_donation_date=date(2023, 2, 28), is_available=True),
            Donor(name='Sarah Miller', age=32, gender='Female', blood_group='A+', phone='2224446666', city='Philadelphia', last_donation_date=None, is_available=True)
        ]
        db.session.bulk_save_objects(donors)
        
    db.session.commit()
