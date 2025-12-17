"""
Main Flask application for Traffic Analysis system.
"""

import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.incidents import incidents_bp

from routes.traffic_routes import traffic_bp
from routes.traffic import lta_bp

from database_config import db

# Load environment variables from .env file
load_dotenv()

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Enable CORS for frontend communication
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(incidents_bp, url_prefix='/api')

    app.register_blueprint(traffic_bp, url_prefix='/api/traffic')
    app.register_blueprint(lta_bp, url_prefix='/api/lta')

    
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
