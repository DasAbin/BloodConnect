import os
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy import text
from models import db, Donor, BloodRequest, DonationHistory, Admin, BloodInventory, User
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
    
    # Initialize SQLite triggers and views
    db.session.execute(text("""
        CREATE TRIGGER IF NOT EXISTS prevent_negative_inventory
        BEFORE UPDATE ON blood_inventory
        FOR EACH ROW
        WHEN NEW.units_available < 0
        BEGIN
          SELECT RAISE(ABORT, 'Insufficient blood units in inventory');
        END;
    """))
    db.session.execute(text("""
        CREATE TRIGGER IF NOT EXISTS donor_cooldown_after_donation
        AFTER INSERT ON donation_history
        FOR EACH ROW
        BEGIN
          UPDATE donors 
          SET is_available = 0, last_donation_date = DATE('now')
          WHERE donor_id = NEW.donor_id;
        END;
    """))
    db.session.execute(text("""
        CREATE TRIGGER IF NOT EXISTS auto_increment_inventory
        AFTER INSERT ON donation_history
        FOR EACH ROW
        BEGIN
          UPDATE blood_inventory
          SET units_available = units_available + NEW.units_donated,
              last_updated = DATETIME('now')
          WHERE blood_group = (SELECT blood_group FROM donors WHERE donor_id = NEW.donor_id);
        END;
    """))
    db.session.execute(text("""
        CREATE VIEW IF NOT EXISTS eligible_donors AS
        SELECT donor_id, name, blood_group, city, phone
        FROM donors
        WHERE is_available = 1
        AND (last_donation_date IS NULL OR 
             CAST((JULIANDAY('now') - JULIANDAY(last_donation_date)) AS INTEGER) >= 90);
    """))
    db.session.execute(text("""
        CREATE VIEW IF NOT EXISTS blood_shortage AS
        SELECT blood_group, units_available
        FROM blood_inventory
        WHERE units_available < 5;
    """))
    db.session.commit()


# --- Helpers ---
def donor_to_dict(donor):
    # Privacy check: Only show full phone to logged in users or admins
    is_authorized = 'admin_id' in session or 'user_id' in session
    return {
        'donor_id': donor.donor_id,
        'name': donor.name,
        'age': donor.age,
        'gender': donor.gender,
        'blood_group': donor.blood_group,
        'phone': donor.phone if (donor.is_available and is_authorized) else (donor.phone[:4] + "******" if donor.is_available else None),
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
    available_only = request.args.get('available_only')
    
    query = Donor.query
    if blood_group:
        query = query.filter_by(blood_group=blood_group)
    if city:
        # Case insensitive like
        query = query.filter(Donor.city.ilike(f"%{city}%"))
    if available_only == 'true':
        query = query.filter_by(is_available=True)
        
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
        if data['status'] == 'fulfilled' and req.status != 'fulfilled':
            inventory = BloodInventory.query.filter_by(blood_group=req.blood_group).first()
            if inventory:
                inventory.units_available -= req.units_needed
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

@app.route('/api/reports', methods=['GET'])
def get_reports():
    sql = text("""
        SELECT 
          d.blood_group,
          COUNT(DISTINCT d.donor_id) as total_donors,
          SUM(CASE WHEN d.is_available = 1 THEN 1 ELSE 0 END) as available_donors,
          COALESCE(SUM(dh.units_donated), 0) as total_donated,
          bi.units_available as current_stock,
          CASE WHEN bi.units_available < 5 THEN 'LOW' ELSE 'OK' END as stock_status
        FROM donors d
        LEFT JOIN donation_history dh ON d.donor_id = dh.donor_id
        JOIN blood_inventory bi ON d.blood_group = bi.blood_group
        GROUP BY d.blood_group, bi.units_available
        ORDER BY bi.units_available ASC
    """)
    results = db.session.execute(sql).fetchall()
    return jsonify([dict(r._mapping) for r in results])

@app.route('/api/shortage', methods=['GET'])
def get_shortage():
    sql = text("SELECT * FROM blood_shortage")
    results = db.session.execute(sql).fetchall()
    return jsonify([dict(r._mapping) for r in results])

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
    
    # Note: inventory update and donor cooldown are now handled by SQLite triggers!
    
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

# --- User API ---

@app.route('/api/user/register', methods=['POST'])
def user_register():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already registered'}), 400
    
    new_user = User(
        name=data['name'],
        email=data['email'],
        password_hash=generate_password_hash(data['password'])
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/user/login', methods=['POST'])
def user_login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.password_hash, data['password']):
        session['user_id'] = user.user_id
        session['user_name'] = user.name
        return jsonify({'message': 'Logged in successfully', 'name': user.name}), 200
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/user/logout', methods=['POST'])
def user_logout():
    session.pop('user_id', None)
    session.pop('user_name', None)
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/user/check', methods=['GET'])
def user_check():
    if 'user_id' in session:
        return jsonify({'logged_in': True, 'name': session.get('user_name')})
    return jsonify({'logged_in': False}), 401

if __name__ == '__main__':
    app.run(port=5000, debug=True)
