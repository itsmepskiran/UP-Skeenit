import os
import sys
from pathlib import Path

def setup_environment():
    """
    Interactive script to help set up environment variables.
    Creates a .env file with the provided values.
    """
    print("🔒 Environment Setup 🔒")
    print("=" * 40)
    print("\nThis script will help you set up your environment variables.")
    print("The values you enter will be saved to a .env file.")
    print("\nPlease provide the following information:")

    env_vars = {
        'VITE_SUPABASE_URL': {
            'prompt': 'Enter your Supabase URL (e.g., https://xxxxxxxxxxxxxx.supabase.co): ',
            'required': True
        },
        'VITE_SUPABASE_ANON_KEY': {
            'prompt': 'Enter your Supabase Anon/Public Key: ',
            'required': True
        },
        'SUPABASE_SERVICE_KEY': {
            'prompt': 'Enter your Supabase Service Role Key (keep this secret!): ',
            'required': True
        },
        'RESEND_API_KEY': {
            'prompt': 'Enter your Resend API Key (or press Enter to skip): ',
            'required': False
        },
        'NODE_ENV': {
            'prompt': 'Environment (development/production) [default: development]: ',
            'default': 'development',
            'required': True
        }
    }

    env_content = "# Environment Variables\n"
    env_content += "# This file contains sensitive information. DO NOT commit it to version control!\n\n"

    for key, config in env_vars.items():
        while True:
            value = input(config['prompt']).strip()
            
            if not value and 'default' in config:
                value = config['default']
                break
                
            if not value and config['required']:
                print(f"Error: {key} is required!")
                continue
                
            break
            
        if value:
            env_content += f"{key}={value}\n"

    env_file = Path('.env')
    if env_file.exists():
        print("\n⚠️  Warning: .env file already exists. Overwrite? (y/n) ", end='')
        if input().strip().lower() != 'y':
            print("\nSetup cancelled. No changes were made.")
            return
    
    try:
        with open('.env', 'w') as f:
            f.write(env_content)
        
        print("\n✅ .env file created successfully!")
        print("\nNext steps:")
        print("1. Keep this file secure and never commit it to version control")
        print("2. If you're using Git, ensure .env is in your .gitignore")
        print("3. Restart your development server to apply the changes")
        
    except Exception as e:
        print(f"\n❌ Error creating .env file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    setup_environment()
