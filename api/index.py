"""
Vercel Serverless Entry Point for FraudShield Flask App
"""
import sys
import os

# Make sure the project root is on the path so app.py can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app

# Vercel expects a WSGI app callable named 'app'
# Flask is already a WSGI app, so we just export it directly.
