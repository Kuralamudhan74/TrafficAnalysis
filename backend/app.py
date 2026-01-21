"""
Main Flask application for Traffic Analysis system.
"""

import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.incidents import incidents_bp
from routes.bookmarks import bookmarks_bp

from routes.traffic_routes import traffic_bp
from routes.traffic import lta_bp
from routes.data_upload import data_upload_bp
from routes.bottlenecks import bottlenecks_bp
from routes.jam_prediction import jam_prediction_bp

# New feature routes
from routes.trends import trends_bp
from routes.users import users_bp
from routes.algorithms import algorithms_bp

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
    app.register_blueprint(bookmarks_bp, url_prefix='/api')

    app.register_blueprint(traffic_bp, url_prefix='/api/traffic')
    app.register_blueprint(lta_bp, url_prefix='/api/lta')
    app.register_blueprint(data_upload_bp, url_prefix='/api/upload')
    app.register_blueprint(bottlenecks_bp, url_prefix='/api/bottlenecks')
    app.register_blueprint(jam_prediction_bp, url_prefix='/api/jam-prediction')

    # New feature blueprints
    app.register_blueprint(trends_bp, url_prefix='/api/trends')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(algorithms_bp, url_prefix='/api/algorithms')


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
