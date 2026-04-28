import os
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import check_password_hash
from sqlalchemy import text
from models import db, Donor, BloodRequest, DonationHistory, Admin, BloodInventory
from db_seed import seed_db
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dbms_mini.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'supersecretkey'

CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

db.init_app(app)

with app.app_context():
    db.create_all()
    seed_db()

# --- Helpers ---
def donor_to_dict(donor):
    return {
        'donor_id': donor.donor_id,
        'name': donor.name,
        'age': donor.age,
        'gender': donor.gender,
        'blood_group': donor.blood_group,
        'phone': donor.phone if donor.is_available else None, # only if available
        'city': donor.city,
        'last_donation_date': donor.last_donation_date.isoformat() if donor.last_donation_date else None,
        'is_available': donor.is_available,
        'registered_at': donor.registered_at.isoformat()
    }

def request_to_dict(req):
    return {
        'request_id': req.request_id,
        'requester_name': req.requester_name,
        'blood_group': req.blood_group,
        'units_needed': req.units_needed,
        'city': req.city,
        'contact': req.contact,
        'urgency': req.urgency,
        'status': req.status,
        'created_at': req.created_at.isoformat()
    }

# --- Donors API ---

@app.route('/api/donors', methods=['GET', 'POST'])
def manage_donors():
    if request.method == 'GET':
        donors = Donor.query.all()
        return jsonify([donor_to_dict(d) for d in donors])
    elif request.method == 'POST':
        data = request.json
        new_donor = Donor(
            name=data['name'],
            age=data['age'],
            gender=data['gender'],
            blood_group=data['blood_group'],
            phone=data['phone'],
            city=data['city'],
            last_donation_date=datetime.strptime(data['last_donation_date'], '%Y-%m-%d').date() if data.get('last_donation_date') else None,
            is_available=data.get('is_available', True)
        )
        db.session.add(new_donor)
        db.session.commit()
        return jsonify(donor_to_dict(new_donor)), 201

@app.route('/api/donors/<int:id>', methods=['PATCH', 'DELETE'])
def update_donor(id):
    donor = Donor.query.get_or_404(id)
    if request.method == 'PATCH':
        data = request.json
        if 'is_available' in data:
            donor.is_available = data['is_available']
        db.session.commit()
        return jsonify(donor_to_dict(donor))
    elif request.method == 'DELETE':
        db.session.delete(donor)
        db.session.commit()
        return '', 204

@app.route('/api/donors/search', methods=['GET'])
def search_donors():
    blood_group = request.args.get('blood_group')
    city = request.args.get('city')
    
    query = Donor.query
    if blood_group:
        query = query.filter_by(blood_group=blood_group)
    if city:
        # Case insensitive like
        query = query.filter(Donor.city.ilike(f"%{city}%"))
        
    donors = query.all()
    return jsonify([donor_to_dict(d) for d in donors])


# --- Requests API ---

@app.route('/api/requests', methods=['GET', 'POST'])
def manage_requests():
    if request.method == 'GET':
        reqs = BloodRequest.query.all()
        return jsonify([request_to_dict(r) for r in reqs])
    elif request.method == 'POST':
        data = request.json
        new_req = BloodRequest(
            requester_name=data['requester_name'],
            blood_group=data['blood_group'],
            units_needed=data['units_needed'],
            city=data['city'],
            contact=data['contact'],
            urgency=data['urgency']
        )
        db.session.add(new_req)
        db.session.commit()
        return jsonify(request_to_dict(new_req)), 201

@app.route('/api/requests/<int:id>', methods=['PATCH'])
def update_request(id):
    req = BloodRequest.query.get_or_404(id)
    data = request.json
    if 'status' in data:
        req.status = data['status']
    db.session.commit()
    return jsonify(request_to_dict(req))

# --- Inventory API ---

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    inventory = BloodInventory.query.all()
    return jsonify([{
        'inventory_id': i.inventory_id,
        'blood_group': i.blood_group,
        'units_available': i.units_available,
        'last_updated': i.last_updated.isoformat()
    } for i in inventory])

# --- Stats API ---

@app.route('/api/stats', methods=['GET'])
def get_stats():
    # To demonstrate SQL knowledge:
    # We want total donors, pending requests, fulfilled count
    # Let's do a single query that aggregates these from multiple tables using subqueries and joins
    sql = text("""
        SELECT 
            (SELECT COUNT(*) FROM donors) as total_donors,
            (SELECT COUNT(*) FROM blood_requests WHERE status = 'pending') as pending_requests,
            (SELECT COUNT(*) FROM blood_requests WHERE status = 'fulfilled') as fulfilled_requests,
            COUNT(d.donor_id) as active_donors_count 
        FROM donors d
        LEFT JOIN donation_history dh ON d.donor_id = dh.donor_id
        WHERE d.is_available = 1
    """)
    result = db.session.execute(sql).fetchone()
    
    return jsonify({
        'total_donors': result.total_donors,
        'pending_requests': result.pending_requests,
        'fulfilled_requests': result.fulfilled_requests,
        'active_donors_count': result.active_donors_count
    })

# --- Donations API ---

@app.route('/api/donations', methods=['POST'])
def log_donation():
    data = request.json
    donor_id = data['donor_id']
    units_donated = data['units_donated']
    request_id = data.get('request_id') # optional
    
    # create history
    history = DonationHistory(
        donor_id=donor_id,
        request_id=request_id,
        units_donated=units_donated
    )
    db.session.add(history)
    
    # update inventory
    donor = Donor.query.get(donor_id)
    inventory = BloodInventory.query.filter_by(blood_group=donor.blood_group).first()
    if inventory:
        inventory.units_available += units_donated
        
    # update donor last_donation
    donor.last_donation_date = datetime.utcnow().date()
        
    db.session.commit()
    return jsonify({'message': 'Donation logged successfully'}), 201

# --- Admin API ---

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    admin = Admin.query.filter_by(username=data['username']).first()
    if admin and check_password_hash(admin.password_hash, data['password']):
        session['admin_id'] = admin.admin_id
        return jsonify({'message': 'Logged in successfully'}), 200
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin_id', None)
    return jsonify({'message': 'Logged out successfully'}), 200
    
@app.route('/api/admin/check', methods=['GET'])
def admin_check():
    if 'admin_id' in session:
        return jsonify({'logged_in': True})
    return jsonify({'logged_in': False}), 401

if __name__ == '__main__':
    app.run(port=5000, debug=True)
