import sys
import os
import json
from http import HTTPStatus

# Add project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Import FastAPI app
from main import app
from mangum import Mangum

# Create the Mangum handler
handler = Mangum(app)

def lambda_handler(event, context):
    # This is the entry point that Netlify expects
    try:
        return handler(event, context)
    except Exception as e:
        return {
            'statusCode': HTTPStatus.INTERNAL_SERVER_ERROR,
            'body': json.dumps({'error': str(e)}),
            'headers': {'Content-Type': 'application/json'}
        }
