import os
import requests
import sys
from typing import Optional

def rotate_supabase_keys(project_ref: str, service_key: str):
    """
    Guide the user through rotating Supabase API keys.
    
    Args:
        project_ref: The Supabase project reference (e.g., 'gfkbqhniopgcaapolzbu')
        service_key: The current service key (will be rotated)
    """
    print("🚨 Supabase Key Rotation Guide 🚨")
    print("=" * 80)
    print("\nWARNING: Your Supabase credentials have been exposed. Follow these steps to secure your project:")
    
    print("\n1. Go to the Supabase Dashboard:")
    print(f"   https://app.supabase.com/project/{project_ref}/settings/api")
    
    print("\n2. In the 'API Settings' section, click 'Rotate' next to each key:")
    print("   - anon/public key")
    print("   - service_role key (this is highly sensitive)")
    
    print("\n3. After rotating the keys, update your environment variables:")
    print("   - Update the .env file with the new keys")
    print("   - If deployed, update the environment variables in your hosting platform")
    
    print("\n4. Test your application to ensure everything works with the new keys")
    
    print("\n5. Revoke the old keys in the Supabase dashboard")
    
    print("\n6. Monitor your application logs for any authentication errors")
    
    print("\n⚠️  IMPORTANT: Never commit .env files to version control!")
    print("   Ensure your .gitignore file includes .env and other sensitive files.")

if __name__ == "__main__":
    project_ref = "gfkbqhniopgcaapolzbu"  # Replace with your project ref if different
    service_key = "your_current_service_key_here"  # This will be rotated
    
    rotate_supabase_keys(project_ref, service_key)
