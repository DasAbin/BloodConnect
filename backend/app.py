import os
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy import text
from models import db, Donor, BloodRequest, DonationHistory, Admin, BloodInventory, User
from db_seed import seed_db
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:251045@localhost/bloodconnect?charset=utf8mb4'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'supersecretkey'

CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

db.init_app(app)

with app.app_context():
    db.create_all()
    seed_db()
    
    # Initialize MySQL triggers and views
    db.session.execute(text("DROP TRIGGER IF EXISTS prevent_negative_inventory"))
    db.session.execute(text("""
        CREATE TRIGGER prevent_negative_inventory
        BEFORE UPDATE ON blood_inventory
        FOR EACH ROW
        BEGIN
          IF NEW.units_available < 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient blood units in inventory';
          END IF;
        END;
    """))
    
    db.session.execute(text("DROP TRIGGER IF EXISTS donor_cooldown_after_donation"))
    db.session.execute(text("""
        CREATE TRIGGER donor_cooldown_after_donation
        AFTER INSERT ON donation_history
        FOR EACH ROW
        BEGIN
          UPDATE donors 
          SET is_available = 0, last_donation_date = CURDATE()
          WHERE donor_id = NEW.donor_id;
        END;
    """))
    
    db.session.execute(text("DROP TRIGGER IF EXISTS auto_increment_inventory"))
    db.session.execute(text("""
        CREATE TRIGGER auto_increment_inventory
        AFTER INSERT ON donation_history
        FOR EACH ROW
        BEGIN
          UPDATE blood_inventory
          SET units_available = units_available + NEW.units_donated,
              last_updated = NOW()
          WHERE blood_group = (SELECT blood_group FROM donors WHERE donor_id = NEW.donor_id);
        END;
    """))
    
    db.session.execute(text("""
        CREATE OR REPLACE VIEW eligible_donors AS
        SELECT donor_id, name, blood_group, city, phone
        FROM donors
        WHERE is_available = 1
        AND (last_donation_date IS NULL OR DATEDIFF(CURDATE(), last_donation_date) >= 90);
    """))
    
    db.session.execute(text("""
        CREATE OR REPLACE VIEW blood_shortage AS
        SELECT blood_group, units_available
        FROM blood_inventory
        WHERE units_available < 5;
    """))
    
    db.session.execute(text("DROP PROCEDURE IF EXISTS GetDonorEligibility"))
    db.session.execute(text("""
        CREATE PROCEDURE GetDonorEligibility(IN p_donor_id INT)
        BEGIN
            SELECT 
                donor_id, 
                name, 
                blood_group, 
                last_donation_date,
                IFNULL(DATEDIFF(CURDATE(), last_donation_date), 'Never') as days_since_donation,
                CASE 
                    WHEN is_available = 0 THEN 'Ineligible - Marked Unavailable'
                    WHEN last_donation_date IS NULL THEN 'Eligible'
                    WHEN DATEDIFF(CURDATE(), last_donation_date) >= 90 THEN 'Eligible'
                    ELSE CONCAT('Ineligible - ', 90 - DATEDIFF(CURDATE(), last_donation_date), ' days remaining')
                END as eligibility_status
            FROM donors
            WHERE donor_id = p_donor_id;
        END;
    """))
    
    db.session.execute(text("DROP PROCEDURE IF EXISTS FindMatchingDonors"))
    db.session.execute(text("""
        CREATE PROCEDURE FindMatchingDonors(IN p_blood_group VARCHAR(5), IN p_city VARCHAR(100))
        BEGIN
            SELECT 
                d.donor_id, 
                d.name, 
                d.blood_group, 
                d.phone, 
                d.city, 
                IFNULL(DATEDIFF(CURDATE(), d.last_donation_date), 'Never') as days_since_donation,
                CASE 
                    WHEN d.last_donation_date IS NULL THEN 'Never'
                    ELSE DATE_FORMAT(d.last_donation_date, '%b %d, %Y')
                END as last_donated
            FROM donors d
            JOIN blood_compatibility bc ON d.blood_group = bc.donor_group
            WHERE bc.recipient_group = p_blood_group
            AND d.is_available = 1
            AND d.approval_status = 'approved'
            AND (d.last_donation_date IS NULL OR DATEDIFF(CURDATE(), d.last_donation_date) >= 90)
            AND (p_city IS NULL OR d.city = p_city)
            ORDER BY d.last_donation_date ASC;
        END;
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
        'approval_status': donor.approval_status,
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
        
        # Link to logged in user if applicable
        if 'user_id' in session:
            user = User.query.get(session['user_id'])
            if user:
                user.donor_id = new_donor.donor_id
                db.session.commit()
                
        return jsonify(donor_to_dict(new_donor)), 201

@app.route('/api/donors/<int:id>', methods=['PATCH', 'DELETE'])
def update_donor(id):
    donor = Donor.query.get_or_404(id)
    if request.method == 'PATCH':
        data = request.json
        if 'is_available' in data:
            donor.is_available = data['is_available']
        if 'approval_status' in data:
            donor.approval_status = data['approval_status']
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
    
    query = Donor.query.filter_by(approval_status='approved')
    if blood_group:
        query = query.filter_by(blood_group=blood_group)
    if city:
        # Case insensitive like
        query = query.filter(Donor.city.ilike(f"%{city}%"))
    if available_only == 'true':
        query = query.filter_by(is_available=True)
        
    donors = query.all()
    return jsonify([donor_to_dict(d) for d in donors])

@app.route('/api/donors/<int:id>/eligibility', methods=['GET'])
def get_donor_eligibility(id):
    result = db.session.execute(text("CALL GetDonorEligibility(:id)"), {'id': id}).fetchone()
    if result:
        return jsonify(dict(result._mapping))
    return jsonify({'message': 'Donor not found'}), 404


# --- Requests API ---

@app.route('/api/requests', methods=['GET', 'POST'])
def manage_requests():
    if request.method == 'GET':
        reqs = BloodRequest.query.all()
        return jsonify([request_to_dict(r) for r in reqs])
    elif request.method == 'POST':
        data = request.json
        user_id = session.get('user_id')
        
        # If user is logged in, trust their profile data over the request body
        if user_id:
            user = User.query.get(user_id)
            requester_name = user.name
            blood_group = user.blood_group
            city = user.city
            contact = user.contact
        else:
            requester_name = data['requester_name']
            blood_group = data['blood_group']
            city = data['city']
            contact = data['contact']

        new_req = BloodRequest(
            requester_name=requester_name,
            blood_group=blood_group,
            units_needed=data['units_needed'],
            city=city,
            contact=contact,
            urgency=data['urgency'],
            user_id=user_id
        )
        db.session.add(new_req)
        db.session.commit()
        return jsonify(request_to_dict(new_req)), 201

@app.route('/api/requests/<int:id>', methods=['PATCH'])
def update_request(id):
    req = BloodRequest.query.get_or_404(id)
    data = request.json
    
    if 'status' in data:
        new_status = data['status']
        from_inventory = data.get('from_inventory', False)
        
        if new_status == 'fulfilled' and req.status != 'fulfilled':
            if from_inventory:
                try:
                    inventory = BloodInventory.query.filter_by(blood_group=req.blood_group).first()
                    if inventory:
                        inventory.units_available -= req.units_needed
                        db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    return jsonify({'message': 'Insufficient blood units in inventory'}), 400
        
        req.status = new_status
        db.session.commit()
        
    return jsonify(request_to_dict(req))

@app.route('/api/requests/<int:id>/matches', methods=['GET'])
def get_request_matches(id):
    req = BloodRequest.query.get_or_404(id)
    # Try with city
    results = db.session.execute(text("CALL FindMatchingDonors(:bg, :city)"), 
                                {'bg': req.blood_group, 'city': req.city}).fetchall()
    if results:
        return jsonify([dict(r._mapping) for r in results])
    # Try without city
    results = db.session.execute(text("CALL FindMatchingDonors(:bg, NULL)"), 
                                {'bg': req.blood_group}).fetchall()
    return jsonify([{**dict(r._mapping), 'out_of_city': True} for r in results])

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
            (SELECT COUNT(*) FROM donation_history WHERE DATE(donated_on) = CURDATE()) as matches_made_today,
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
    
    # Note: inventory update and donor cooldown are now handled by MySQL triggers!
    
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
        password_hash=generate_password_hash(data['password']),
        age=data.get('age'),
        dob=datetime.strptime(data['dob'], '%Y-%m-%d').date() if data.get('dob') else None,
        blood_group=data.get('blood_group'),
        contact=data.get('contact'),
        city=data.get('city')
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

@app.route('/api/user/profile', methods=['GET'])
def user_profile():
    if 'user_id' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    requests = BloodRequest.query.filter_by(user_id=user.user_id).order_by(BloodRequest.created_at.desc()).all()
    
    return jsonify({
        'user': {
            'name': user.name,
            'email': user.email,
            'age': user.age,
            'dob': user.dob.isoformat() if user.dob else None,
            'blood_group': user.blood_group,
            'contact': user.contact,
            'city': user.city,
            'donor_id': user.donor_id,
            'last_donation_date': user.donor.last_donation_date.isoformat() if (user.donor and user.donor.last_donation_date) else None,
            'created_at': user.created_at.isoformat()
        },
        'requests': [request_to_dict(req) for req in requests]
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)
