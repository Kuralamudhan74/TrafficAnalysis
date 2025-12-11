"""
Main Flask application for Traffic Analysis system.
"""

from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.incidents import incidents_bp
from routes.traffic import traffic_bp
from database_config import db

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Enable CORS for frontend communication
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(incidents_bp, url_prefix='/api')
    app.register_blueprint(traffic_bp)
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'message': 'Traffic Analysis API is running'}, 200
    
    # Test database connection on startup
    try:
        db.init_db()
        print("✅ Database connection verified")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
